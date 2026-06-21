import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const launcherRoot = process.cwd();
const tauriDir = path.join(launcherRoot, "src-tauri");
const configPath = path.join(tauriDir, "tauri.conf.json");
const postcssConfigPath = path.join(launcherRoot, "postcss.config.mjs");
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
const requiredInstallerFiles = [
  "bootstrap/linux.sh",
  "bootstrap/windows.ps1",
  "linux/doctor.sh",
  "linux/install-project.sh",
  "linux/start.sh",
  "linux/stop.sh",
  "windows/doctor.ps1",
  "windows/install-project.ps1",
  "windows/start.ps1",
  "windows/stop.ps1",
];

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

function assertDirectory(targetPath, label) {
  assertPathExists(targetPath, label);
  if (!fs.statSync(targetPath).isDirectory()) {
    fail(`${label} deve ser uma pasta: ${path.relative(launcherRoot, targetPath)}`);
  }
}

function assertExecutable(filePath, label) {
  if (process.platform === "win32") {
    return;
  }

  const mode = fs.statSync(filePath).mode;
  if ((mode & 0o111) === 0) {
    fail(`${label} precisa ter permissão de execução: ${path.relative(launcherRoot, filePath)}`);
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
const resources = bundle.resources ?? {};
const resourceEntries = Array.isArray(resources)
  ? resources.map((resource) => [resource, null])
  : Object.entries(resources);

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

for (const [resource] of resourceEntries) {
  assertPathExists(path.resolve(tauriDir, resource), "recurso Tauri");
}

if (!resources || Array.isArray(resources) || resources["../../installers/"] !== "installers/") {
  fail('bundle.resources deve mapear "../../installers/" para "installers/"');
}

if (!Array.isArray(bundle.targets) || !bundle.targets.includes("nsis")) {
  fail("bundle.targets deve incluir nsis para o instalador Windows com desinstalação limpa");
}

if (bundle.targets.includes("msi")) {
  fail("bundle.targets não deve incluir msi; o fluxo Windows usa NSIS para hooks de desinstalação");
}

if (bundle.windows?.nsis?.installerHooks !== "./windows/hooks.nsh") {
  fail('bundle.windows.nsis.installerHooks deve apontar para "./windows/hooks.nsh"');
}

const installersDir = path.resolve(tauriDir, "../../installers");
assertDirectory(installersDir, "pasta installers");

for (const installerFile of requiredInstallerFiles) {
  const installerPath = path.join(installersDir, installerFile);
  assertFile(installerPath, "script installer");

  if (installerFile.endsWith(".sh")) {
    assertExecutable(installerPath, "script shell do installer");
  }
}

assertFile(path.join(tauriDir, "capabilities", "default.json"), "capability default");
assertFile(postcssConfigPath, "config PostCSS local do launcher");

const postcssConfig = fs.readFileSync(postcssConfigPath, "utf8");
if (postcssConfig.includes("@tailwindcss/postcss")) {
  fail("o launcher não deve depender do PostCSS/Tailwind do projeto principal");
}

console.log("validate-tauri-assets: ok");
