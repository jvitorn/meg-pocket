import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL nao foi definido para o setup portatil.");
}

const seedTables = ["Classe", "Raca", "MagiaCatalog", "PericiaCatalog", "Item"];

async function main() {
  await runPrismaMigrateDeploy();

  if (await seedReady()) {
    console.log("Seed inicial ja esta aplicado.");
    return;
  }

  await runSeedSql();
}

async function runPrismaMigrateDeploy() {
  const prismaCli = resolvePrismaCli();
  if (!prismaCli) {
    throw new Error(
      "Prisma CLI nao encontrado no runtime portatil. Esperado: scripts/node_modules/prisma/build/index.js"
    );
  }

  const { spawn } = await import("node:child_process");
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: path.join(rootDir, "prisma"),
      env: process.env,
      stdio: "inherit",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy falhou: ${code}`))));
    child.on("error", reject);
  });
}

function resolvePrismaCli() {
  const candidate = path.join(
    rootDir,
    "scripts",
    "node_modules",
    "prisma",
    "build",
    "index.js"
  );
  return fs.existsSync(candidate) ? candidate : null;
}

async function seedReady() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const table of seedTables) {
      const exists = await client.query("SELECT to_regclass($1) AS regclass", [`"${table}"`]);
      if (!exists.rows[0]?.regclass) return false;

      const count = await client.query(`SELECT count(*)::int AS count FROM "${table}"`);
      if ((count.rows[0]?.count ?? 0) < 1) return false;
    }
    return true;
  } finally {
    await client.end();
  }
}

async function runSeedSql() {
  const seed = path.join(rootDir, "prisma", "seeds", "generated", "index.sql");
  const runner = path.join(rootDir, "scripts", "run-sql-file.mjs");
  if (!fs.existsSync(seed) || !fs.existsSync(runner)) {
    throw new Error("Seed SQL ou runner nao encontrado no runtime portatil.");
  }

  const { spawn } = await import("node:child_process");
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runner, seed], {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`seed portatil falhou: ${code}`))));
    child.on("error", reject);
  });
}

await main();
