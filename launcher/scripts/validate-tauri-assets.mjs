import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const launcherRoot = process.cwd();
const tauriDir = path.join(launcherRoot, "src-tauri");
const configPath = path.join(tauriDir, "tauri.conf.json");
const requiredIcons = [
  "icons/32x32.png",
  "icons/128x128.png",
  "icons/128x128@2x.png",
  "icons/icon.icns",
  "icons/icon.ico",
  "icons/icon.png",
];
const requiredPngIcons = new Map([
  ["icons/32x32.png", 32],
  ["icons/128x128.png", 128],
  ["icons/128x128@2x.png", 256],
  ["icons/icon.png", 512],
]);

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

async function assertRgbaPng(icon, expectedSize) {
  const iconPath = path.resolve(tauriDir, icon);
  const metadata = await sharp(iconPath).metadata();

  const valid =
    metadata.format === "png" &&
    metadata.width === expectedSize &&
    metadata.height === expectedSize &&
    metadata.channels === 4 &&
    metadata.depth === "uchar";

  if (!valid) {
    fail(
      `${icon} deve ser PNG ${expectedSize}x${expectedSize} RGBA 8-bit; recebido ${metadata.format} ${metadata.width}x${metadata.height}, channels=${metadata.channels}, depth=${metadata.depth}`,
    );
  }
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const bundle = config.bundle ?? {};
const icons = Array.isArray(bundle.icon) && bundle.icon.length > 0 ? bundle.icon : ["icons/icon.png"];
const resources = Array.isArray(bundle.resources) ? bundle.resources : [];

for (const requiredIcon of requiredIcons) {
  if (!icons.includes(requiredIcon)) {
    fail(`bundle.icon não referencia ${requiredIcon}`);
  }
}

for (const icon of icons) {
  assertFile(path.resolve(tauriDir, icon), "ícone Tauri");
}

for (const [icon, expectedSize] of requiredPngIcons.entries()) {
  await assertRgbaPng(icon, expectedSize);
}

for (const resource of resources) {
  assertPathExists(path.resolve(tauriDir, resource), "recurso Tauri");
}

if (!resources.includes("../../installers")) {
  fail("bundle.resources deve incluir ../../installers para empacotar os scripts do launcher");
}

assertFile(path.join(tauriDir, "capabilities", "default.json"), "capability default");

console.log("validate-tauri-assets: ok");
