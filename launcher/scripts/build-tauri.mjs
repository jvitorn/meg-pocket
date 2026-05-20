import { spawnSync } from "node:child_process";

const env = { ...process.env };

if (process.platform === "linux" && !env.NO_STRIP) {
  env.NO_STRIP = "1";
}

const command = process.platform === "win32" ? "tauri.cmd" : "tauri";
const result = spawnSync(command, ["build", ...process.argv.slice(2)], {
  env,
  stdio: "inherit",
});

if (result.error) {
  console.error(`build-tauri: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
