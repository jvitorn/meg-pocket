import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const args = process.argv.slice(2);
const sqlArg = args.find((arg) => !arg.startsWith("-"));
const allowProdSeed = args.includes("--prod") || args.includes("-prod");

if (!sqlArg) {
  console.error("Uso: node scripts/run-sql-file.mjs <sql-file> [--prod]");
  process.exit(1);
}

const rootDir = process.cwd();
const envPaths = [path.join(rootDir, ".env"), path.join(rootDir, ".env.local")];
const sqlPath = path.join(rootDir, sqlArg);

if (
  !envPaths.some((envPath) => fs.existsSync(envPath)) &&
  !process.env.DATABASE_URL &&
  !process.env.DIRECT_URL
) {
  console.error(
    "Arquivo de ambiente nao encontrado: .env.local, .env, DATABASE_URL ou DIRECT_URL"
  );
  process.exit(1);
}

if (!fs.existsSync(sqlPath)) {
  console.error(`Arquivo SQL nao encontrado: ${sqlArg}`);
  process.exit(1);
}

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return [];
  }

  return fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separatorIndex = line.indexOf("=");
      const key = line.slice(0, separatorIndex);
      let value = line.slice(separatorIndex + 1);
      value = value.replace(/^"(.*)"$/, "$1");
      return [key, value];
    });
}

const envEntries = envPaths.flatMap(readEnvFile);

const envMap = Object.fromEntries(envEntries);
const runtimeEnv = { ...envMap, ...process.env };
const rawDbUrl = runtimeEnv.DIRECT_URL || runtimeEnv.DATABASE_URL;

if (!rawDbUrl) {
  console.error("DATABASE_URL/DIRECT_URL nao definido em .env.local, .env ou ambiente");
  process.exit(1);
}

function isLocalDatabaseUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ["localhost", "127.0.0.1", "::1", "postgres"].includes(
      url.hostname
    );
  } catch {
    return false;
  }
}

const isSeedFile = sqlArg.startsWith("prisma/seeds/");

if (
  isSeedFile &&
  !isLocalDatabaseUrl(rawDbUrl) &&
  !allowProdSeed
) {
  console.error(
    "Seed bloqueada: DATABASE_URL/DIRECT_URL nao aponta para banco local."
  );
  console.error(
    "Use npm run env:local antes de semear localmente. Para ambiente online de teste, execute novamente com --prod."
  );
  process.exit(1);
}

function relative(filePath) {
  return path.relative(rootDir, filePath) || ".";
}

function parseCsvRecords(csvText) {
  const records = [];
  let record = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];

    if (inQuotes) {
      if (char === '"') {
        if (csvText[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (inQuotes) {
    throw new Error("CSV terminou com campo entre aspas aberto.");
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
}

function parseCopyCommand(line) {
  const match = line.match(
    /^COPY\s+(.+?)\s+\((.+)\)\s+FROM\s+stdin\s+WITH\s+\((.+)\);?$/i
  );

  if (!match) {
    throw new Error(`Comando COPY nao suportado: ${line}`);
  }

  const [, table, rawColumns] = match;
  return {
    table,
    columns: rawColumns.split(",").map((column) => column.trim()),
  };
}

function unquoteIdentifier(identifier) {
  const trimmed = identifier.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
}

function formatError(error) {
  if (!error || typeof error !== "object") {
    return String(error);
  }

  const parts = [];
  if (error.message) {
    parts.push(error.message);
  }
  if (error.code) {
    parts.push(`code=${error.code}`);
  }
  if (error.detail) {
    parts.push(`detail=${error.detail}`);
  }
  if (error.hint) {
    parts.push(`hint=${error.hint}`);
  }
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    parts.push(
      error.errors
        .map((nestedError) => {
          const nestedParts = [nestedError.message, nestedError.code]
            .filter(Boolean)
            .join(" ");
          const address =
            nestedError.address && nestedError.port
              ? ` (${nestedError.address}:${nestedError.port})`
              : "";
          return `${nestedParts}${address}`.trim();
        })
        .filter(Boolean)
        .join("; ")
    );
  }

  return parts.filter(Boolean).join(" | ") || String(error);
}

async function executeSql(client, sql, context) {
  const trimmed = sql.trim();
  if (!trimmed) {
    return;
  }

  try {
    await client.query(trimmed);
  } catch (error) {
    throw new Error(`${context}: ${formatError(error)}`);
  }
}

async function executeCopy(client, commandLine, dataLines, context) {
  const { table, columns } = parseCopyCommand(commandLine.trim());
  const records = parseCsvRecords(dataLines.join("\n"));

  if (records.length === 0) {
    return;
  }

  const [header, ...rows] = records;
  const headerText = header.join(",");
  const expectedHeader = columns.map(unquoteIdentifier).join(",");

  if (headerText !== expectedHeader) {
    throw new Error(
      `${context}: cabecalho CSV inesperado. Esperado "${expectedHeader}", recebido "${headerText}".`
    );
  }

  if (rows.length === 0) {
    return;
  }

  const columnList = columns.join(", ");
  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    if (row.length !== columns.length) {
      throw new Error(
        `${context}: linha CSV ${rowIndex + 2} tem ${row.length} colunas, esperado ${columns.length}.`
      );
    }

    const rowPlaceholders = row.map((value) => {
      values.push(value === "null" ? null : value);
      return `$${values.length}`;
    });

    return `(${rowPlaceholders.join(", ")})`;
  });

  await client.query(
    `INSERT INTO ${table} (${columnList}) VALUES ${placeholders.join(", ")}`,
    values
  );
}

async function executeSqlFile(client, filePath, includeStack = []) {
  const realPath = path.resolve(filePath);

  if (includeStack.includes(realPath)) {
    throw new Error(
      `Inclusao circular de SQL: ${[...includeStack, realPath]
        .map(relative)
        .join(" -> ")}`
    );
  }

  const text = fs.readFileSync(realPath, "utf8");
  const lines = text.split(/\r?\n/);
  let sqlBuffer = "";
  const nextStack = [...includeStack, realPath];

  async function flushSql(lineNumber) {
    await executeSql(
      client,
      sqlBuffer,
      `${relative(realPath)}:${lineNumber}`
    );
    sqlBuffer = "";
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const lineNumber = index + 1;

    if (trimmed.startsWith("\\set ")) {
      await flushSql(lineNumber);
      continue;
    }

    if (trimmed.startsWith("\\echo ")) {
      await flushSql(lineNumber);
      console.log(trimmed.slice("\\echo ".length));
      continue;
    }

    if (trimmed.startsWith("\\ir ")) {
      await flushSql(lineNumber);
      const includeName = trimmed.slice("\\ir ".length).trim();
      const includePath = path.resolve(path.dirname(realPath), includeName);

      if (!fs.existsSync(includePath)) {
        throw new Error(
          `${relative(realPath)}:${lineNumber}: include SQL nao encontrado: ${includeName}`
        );
      }

      await executeSqlFile(client, includePath, nextStack);
      continue;
    }

    if (/^COPY\s+/i.test(trimmed) && /\sFROM\s+stdin\s+/i.test(trimmed)) {
      await flushSql(lineNumber);

      const dataLines = [];
      let foundEnd = false;

      while (index + 1 < lines.length) {
        index += 1;
        const dataLine = lines[index];
        if (dataLine.trim() === "\\.") {
          foundEnd = true;
          break;
        }
        dataLines.push(dataLine);
      }

      if (!foundEnd) {
        throw new Error(`${relative(realPath)}:${lineNumber}: COPY sem terminador \\\\.`);
      }

      await executeCopy(
        client,
        line,
        dataLines,
        `${relative(realPath)}:${lineNumber}`
      );
      continue;
    }

    sqlBuffer += `${line}\n`;
  }

  await flushSql(lines.length);
}

const client = new Client({
  connectionString: rawDbUrl,
});

try {
  await client.connect();
  await executeSqlFile(client, sqlPath);
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Ignore rollback failures; the original error below is more useful.
  }

  console.error(`Falha ao executar SQL: ${formatError(error)}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
