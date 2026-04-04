import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
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
