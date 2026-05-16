import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const DEFAULT_ENV_FILES = [".env", ".env.local"];
const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);
const COPY_STDIN_PATTERN =
  /^COPY\s+(.+?)\s+\((.+)\)\s+FROM\s+stdin\s+WITH\s+\((.+)\);?$/i;

export function usage() {
  return [
    "Uso: node scripts/run-sql-file.mjs <sql-file> [--prod]",
    "",
    "Opcoes:",
    "  --prod, -prod  permite executar seeds em banco nao local",
  ].join("\n");
}

export function parseCliArgs(args) {
  const options = {
    sqlFile: null,
    allowNonLocalSeed: false,
  };

  for (const arg of args) {
    if (arg === "--prod" || arg === "-prod") {
      options.allowNonLocalSeed = true;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Opcao desconhecida: ${arg}`);
    }

    if (options.sqlFile) {
      throw new Error(`Argumento inesperado: ${arg}`);
    }

    options.sqlFile = arg;
  }

  if (!options.sqlFile) {
    throw new Error("Informe o arquivo SQL que deve ser executado.");
  }

  return options;
}

export function parseEnvText(envText) {
  const entries = [];

  for (const rawLine of envText.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalizedLine = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separatorIndex = normalizedLine.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    const rawValue = normalizedLine.slice(separatorIndex + 1).trim();

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    entries.push([key, parseEnvValue(rawValue)]);
  }

  return entries;
}

function parseEnvValue(value) {
  if (!value) {
    return "";
  }

  const quote = value[0];

  if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
    const innerValue = value.slice(1, -1);
    return quote === '"' ? unescapeDoubleQuotedEnv(innerValue) : innerValue;
  }

  return value.replace(/\s+#.*$/, "");
}

function unescapeDoubleQuotedEnv(value) {
  return value.replace(/\\([nrt"\\])/g, (_, escaped) => {
    switch (escaped) {
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      default:
        return escaped;
    }
  });
}

export function loadEnv(rootDir, envFiles = DEFAULT_ENV_FILES, baseEnv = process.env) {
  const loadedFiles = [];
  const entries = [];

  for (const envFile of envFiles) {
    const envPath = path.resolve(rootDir, envFile);

    if (!fs.existsSync(envPath)) {
      continue;
    }

    loadedFiles.push(envPath);
    entries.push(...parseEnvText(fs.readFileSync(envPath, "utf8")));
  }

  return {
    env: {
      ...Object.fromEntries(entries),
      ...baseEnv,
    },
    loadedFiles,
  };
}

export function resolveDatabaseUrl(env) {
  return env.DIRECT_URL || env.DATABASE_URL || "";
}

export function isLocalDatabaseUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return LOCAL_DATABASE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function resolveSqlPath(rootDir, sqlFile) {
  return path.resolve(rootDir, sqlFile);
}

export function isPathInside(childPath, parentPath) {
  const relativePath = path.relative(parentPath, childPath);
  return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

export function isSeedSqlFile(sqlPath, rootDir) {
  return isPathInside(sqlPath, path.resolve(rootDir, "prisma", "seeds"));
}

function relative(rootDir, filePath) {
  return path.relative(rootDir, filePath) || ".";
}

export function parseCsvRecords(csvText) {
  const records = [];
  let record = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    record.push(field);
    field = "";
  };

  const pushRecord = () => {
    pushField();
    records.push(record);
    record = [];
  };

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
      pushField();
    } else if (char === "\n") {
      pushRecord();
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (inQuotes) {
    throw new Error("CSV terminou com campo entre aspas aberto.");
  }

  if (field.length > 0 || record.length > 0) {
    pushRecord();
  }

  return records;
}

export function parseCopyCommand(line) {
  const match = line.match(COPY_STDIN_PATTERN);

  if (!match) {
    throw new Error(`Comando COPY nao suportado: ${line}`);
  }

  const [, table, rawColumns, rawOptions] = match;

  return {
    table,
    columns: rawColumns.split(",").map((column) => column.trim()),
    options: parseCopyOptions(rawOptions),
  };
}

function parseCopyOptions(rawOptions) {
  const nullMatch = rawOptions.match(/\bNULL\s+'((?:''|[^'])*)'/i);
  const headerMatch = rawOptions.match(/\bHEADER\s+(true|false|on|off|1|0)\b/i);

  return {
    header: headerMatch ? ["true", "on", "1"].includes(headerMatch[1].toLowerCase()) : false,
    nullValue: nullMatch ? nullMatch[1].replace(/''/g, "'") : null,
  };
}

function unquoteIdentifier(identifier) {
  const trimmed = identifier.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }

  return trimmed;
}

export function formatError(error) {
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
  const { table, columns, options } = parseCopyCommand(commandLine.trim());
  const records = parseCsvRecords(dataLines.join("\n"));

  if (records.length === 0) {
    return;
  }

  const rows = options.header ? records.slice(1) : records;

  if (options.header) {
    const headerText = records[0].join(",");
    const expectedHeader = columns.map(unquoteIdentifier).join(",");

    if (headerText !== expectedHeader) {
      throw new Error(
        `${context}: cabecalho CSV inesperado. Esperado "${expectedHeader}", recebido "${headerText}".`
      );
    }
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
      values.push(value === options.nullValue ? null : value);
      return `$${values.length}`;
    });

    return `(${rowPlaceholders.join(", ")})`;
  });

  await client.query(
    `INSERT INTO ${table} (${columnList}) VALUES ${placeholders.join(", ")}`,
    values
  );
}

function parsePsqlCommand(trimmedLine) {
  if (trimmedLine.startsWith("\\set ")) {
    return { type: "set" };
  }

  if (trimmedLine.startsWith("\\echo ")) {
    return {
      type: "echo",
      message: trimmedLine.slice("\\echo ".length),
    };
  }

  if (trimmedLine.startsWith("\\ir ")) {
    return {
      type: "include",
      fileName: trimmedLine.slice("\\ir ".length).trim(),
    };
  }

  if (trimmedLine.startsWith("\\")) {
    return {
      type: "unsupported",
      command: trimmedLine,
    };
  }

  return { type: "none" };
}

export async function executeSqlFile(client, filePath, options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const includeStack = options.includeStack ?? [];
  const realPath = path.resolve(filePath);

  if (includeStack.includes(realPath)) {
    throw new Error(
      `Inclusao circular de SQL: ${[...includeStack, realPath]
        .map((stackPath) => relative(rootDir, stackPath))
        .join(" -> ")}`
    );
  }

  const text = fs.readFileSync(realPath, "utf8");
  const lines = text.split(/\r?\n/);
  const nextStack = [...includeStack, realPath];
  let sqlBuffer = "";

  async function flushSql(lineNumber) {
    await executeSql(client, sqlBuffer, `${relative(rootDir, realPath)}:${lineNumber}`);
    sqlBuffer = "";
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const lineNumber = index + 1;
    const command = parsePsqlCommand(trimmed);

    if (command.type === "set") {
      await flushSql(lineNumber);
      continue;
    }

    if (command.type === "echo") {
      await flushSql(lineNumber);
      console.log(command.message);
      continue;
    }

    if (command.type === "include") {
      await flushSql(lineNumber);

      const includePath = path.resolve(path.dirname(realPath), command.fileName);

      if (!fs.existsSync(includePath)) {
        throw new Error(
          `${relative(rootDir, realPath)}:${lineNumber}: include SQL nao encontrado: ${command.fileName}`
        );
      }

      await executeSqlFile(client, includePath, {
        rootDir,
        includeStack: nextStack,
      });
      continue;
    }

    if (command.type === "unsupported") {
      throw new Error(
        `${relative(rootDir, realPath)}:${lineNumber}: comando psql nao suportado: ${command.command}`
      );
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
        throw new Error(`${relative(rootDir, realPath)}:${lineNumber}: COPY sem terminador \\\\.`);
      }

      await executeCopy(client, line, dataLines, `${relative(rootDir, realPath)}:${lineNumber}`);
      continue;
    }

    sqlBuffer += `${line}\n`;
  }

  await flushSql(lines.length);
}

async function rollbackQuietly(client) {
  try {
    await client.query("ROLLBACK");
  } catch {
    // Ignore rollback failures; the original error below is more useful.
  }
}

function validateSeedSafety({ rootDir, sqlPath, rawDbUrl, allowNonLocalSeed }) {
  if (!isSeedSqlFile(sqlPath, rootDir) || isLocalDatabaseUrl(rawDbUrl) || allowNonLocalSeed) {
    return;
  }

  throw new Error(
    [
      "Seed bloqueada: DATABASE_URL/DIRECT_URL nao aponta para banco local.",
      "Use npm run env:local antes de semear localmente. Para ambiente online de teste, execute novamente com --prod.",
    ].join("\n")
  );
}

export async function main(args = process.argv.slice(2), options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  let cliOptions;

  try {
    cliOptions = parseCliArgs(args);
  } catch (error) {
    console.error(formatError(error));
    console.error(usage());
    return 1;
  }

  const sqlPath = resolveSqlPath(rootDir, cliOptions.sqlFile);

  if (!fs.existsSync(sqlPath)) {
    console.error(`Arquivo SQL nao encontrado: ${cliOptions.sqlFile}`);
    return 1;
  }

  const { env, loadedFiles } = loadEnv(rootDir);
  const rawDbUrl = resolveDatabaseUrl(env);

  if (!rawDbUrl) {
    const envSources = DEFAULT_ENV_FILES.map((file) => path.join(rootDir, file));
    const sourceText = envSources
      .map((envPath) => relative(rootDir, envPath))
      .join(", ");

    console.error(`DATABASE_URL/DIRECT_URL nao definido em ${sourceText} ou ambiente.`);
    return 1;
  }

  try {
    validateSeedSafety({
      rootDir,
      sqlPath,
      rawDbUrl,
      allowNonLocalSeed: cliOptions.allowNonLocalSeed,
    });
  } catch (error) {
    console.error(formatError(error));
    return 1;
  }

  const client = new Client({
    connectionString: rawDbUrl,
  });

  try {
    if (loadedFiles.length > 0) {
      const loadedText = loadedFiles.map((envPath) => relative(rootDir, envPath)).join(", ");
      console.log(`run-sql-file: ambiente carregado de ${loadedText}`);
    }

    await client.connect();
    await executeSqlFile(client, sqlPath, { rootDir });
    return 0;
  } catch (error) {
    await rollbackQuietly(client);
    console.error(`Falha ao executar SQL: ${formatError(error)}`);
    return 1;
  } finally {
    await client.end().catch(() => {});
  }
}
