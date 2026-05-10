import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const launcherRoot = process.cwd();
const tauriDir = path.join(launcherRoot, "src-tauri");
const configPath = path.join(tauriDir, "tauri.conf.json");

function fail(message) {
  console.error(`validate-tauri-assets: ${message}`);
  process.exit(1);
}

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`${label} não encontrado: ${path.relative(launcherRoot, filePath)}`);
  }
}

function assertPathExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    fail(`${label} não encontrado: ${path.relative(launcherRoot, targetPath)}`);
  }
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const bundle = config.bundle ?? {};
const icons = Array.isArray(bundle.icon) && bundle.icon.length > 0 ? bundle.icon : ["icons/icon.png"];
const resources = Array.isArray(bundle.resources) ? bundle.resources : [];

for (const icon of icons) {
  assertFile(path.resolve(tauriDir, icon), "ícone Tauri");
}

for (const resource of resources) {
  assertPathExists(path.resolve(tauriDir, resource), "recurso Tauri");
}

assertFile(path.join(tauriDir, "capabilities", "default.json"), "capability default");

console.log("validate-tauri-assets: ok");
