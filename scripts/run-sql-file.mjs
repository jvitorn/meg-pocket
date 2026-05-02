import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const sqlArg = args.find((arg) => !arg.startsWith("-"));
const allowProdSeed = args.includes("--prod") || args.includes("-prod");

if (!sqlArg) {
  console.error("Uso: node scripts/run-sql-file.mjs <sql-file> [--prod]");
  process.exit(1);
}

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env.local");
const sqlPath = path.join(rootDir, sqlArg);

if (!fs.existsSync(envPath)) {
  console.error("Arquivo de ambiente nao encontrado: .env.local");
  process.exit(1);
}

if (!fs.existsSync(sqlPath)) {
  console.error(`Arquivo SQL nao encontrado: ${sqlArg}`);
  process.exit(1);
}

const envText = fs.readFileSync(envPath, "utf8");
const envEntries = envText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    const separatorIndex = line.indexOf("=");
    const key = line.slice(0, separatorIndex);
    let value = line.slice(separatorIndex + 1);
    value = value.replace(/^"(.*)"$/, "$1");
    return [key, value];
  });

const envMap = Object.fromEntries(envEntries);
const rawDbUrl = envMap.DIRECT_URL || envMap.DATABASE_URL;

if (!rawDbUrl) {
  console.error("DATABASE_URL/DIRECT_URL nao definido em .env.local");
  process.exit(1);
}

function isLocalDatabaseUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
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

const dbUrl = rawDbUrl.split("?")[0];
const result = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlPath], {
  stdio: "inherit",
  env: { ...process.env, ...envMap },
});

process.exit(result.status ?? 1);
