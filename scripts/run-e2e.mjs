import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const localEnvCandidates = [".env.docker-local", ".env.example"];
const dockerDatabaseHosts = new Set(["postgres", "localhost", "127.0.0.1", "::1"]);

function parseEnvText(envText) {
  return Object.fromEntries(
    envText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex);
        let value = line.slice(separatorIndex + 1);
        value = value.replace(/^"(.*)"$/, "$1");
        return [key, value];
      })
  );
}

function isLocalDatabaseUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function isDockerDatabaseUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return dockerDatabaseHosts.has(url.hostname);
  } catch {
    return false;
  }
}

function loadLocalEnv() {
  if (process.env.MEG_E2E_DOCKER === "1") {
    const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

    if (!dbUrl || !isDockerDatabaseUrl(dbUrl)) {
      console.error(
        "E2E bloqueado: DATABASE_URL/DIRECT_URL precisa apontar para o Postgres local do Docker."
      );
      process.exit(1);
    }

    return {
      ...process.env,
      PLAYWRIGHT_BASE_URL:
        process.env.PLAYWRIGHT_BASE_URL ||
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        "http://127.0.0.1:3000",
      MEG_E2E: "1",
      MEG_E2E_REUSE_SERVER: "1",
    };
  }

  const sourcePath = localEnvCandidates
    .map((file) => path.join(rootDir, file))
    .find((file) => fs.existsSync(file));

  if (!sourcePath) {
    console.error("Nenhum arquivo de ambiente local encontrado para e2e.");
    process.exit(1);
  }

  const envText = fs.readFileSync(sourcePath, "utf8");
  const envMap = parseEnvText(envText);
  const dbUrl = envMap.DIRECT_URL || envMap.DATABASE_URL;

  if (!dbUrl || !isLocalDatabaseUrl(dbUrl)) {
    console.error(
      "E2E bloqueado: DATABASE_URL/DIRECT_URL precisa apontar para banco local."
    );
    process.exit(1);
  }

  fs.copyFileSync(sourcePath, path.join(rootDir, ".env.local"));

  return {
    ...process.env,
    ...envMap,
    PLAYWRIGHT_BASE_URL:
      envMap.NEXTAUTH_URL || envMap.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    MEG_E2E: "1",
  };
}

const e2eEnv = loadLocalEnv();

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: e2eEnv,
  });

  if (typeof result.status === "number") {
    return result.status;
  }

  return 1;
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function npxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function reseedDatabase() {
  return run(npmCommand(), ["run", "db:seed"]);
}

const playwrightArgs = process.argv.slice(2);

const beforeStatus = reseedDatabase();

if (beforeStatus !== 0) {
  process.exit(beforeStatus);
}

let testStatus = 1;

try {
  testStatus = run(npxCommand(), ["playwright", "test", ...playwrightArgs]);
} finally {
  const afterStatus = reseedDatabase();
  if (testStatus === 0 && afterStatus !== 0) {
    testStatus = afterStatus;
  }
}

process.exit(testStatus);
