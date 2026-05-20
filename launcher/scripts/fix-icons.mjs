import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const launcherRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(launcherRoot, "..");
const iconsDir = path.join(launcherRoot, "src-tauri", "icons");
const sourceIcon = path.join(iconsDir, "app-icon-source.png");
const tempIcon = path.join(iconsDir, ".icon-normalized.tmp.png");

const sourceCandidates = [
  sourceIcon,
  path.join(iconsDir, "icon.png"),
  path.join(repoRoot, "public", "imgs", "icons", "logo_guerreiro.svg"),
];

const pngTargets = [
  ["32x32.png", 32],
  ["128x128.png", 128],
  ["128x128@2x.png", 256],
  ["icon.png", 512],
];
const keptIconEntries = new Set([
  ".icon-normalized.tmp.png",
  "32x32.png",
  "128x128.png",
  "128x128@2x.png",
  "app-icon-source.png",
  "icon.icns",
  "icon.ico",
  "icon.png",
]);

function fail(message) {
  console.error(`fix-icons: ${message}`);
  process.exit(1);
}

function relativeIconPath(filePath) {
  return path.relative(launcherRoot, filePath).replaceAll(path.sep, "/");
}

function findSourceIcon() {
  const source = sourceCandidates.find((candidate) => fs.existsSync(candidate));
  if (!source) {
    fail("nenhum ícone fonte encontrado em src-tauri/icons ou public/imgs/icons");
  }
  return source;
}

async function writeRgbaSquare(input, output, size) {
  const sharpInput =
    path.resolve(input) === path.resolve(output) ? await fs.promises.readFile(input) : input;

  await sharp(sharpInput, { density: 512 })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .ensureAlpha()
    .png({
      palette: false,
      compressionLevel: 9,
      adaptiveFiltering: true,
      force: true,
    })
    .toFile(output);
}

async function assertRgbaPng(fileName, expectedSize) {
  const filePath = path.join(iconsDir, fileName);
  if (!fs.existsSync(filePath)) {
    fail(`ícone obrigatório ausente: ${path.relative(launcherRoot, filePath)}`);
  }

  const metadata = await sharp(filePath).metadata();
  const valid =
    metadata.format === "png" &&
    metadata.width === expectedSize &&
    metadata.height === expectedSize &&
    metadata.channels === 4 &&
    metadata.depth === "uchar";

  if (!valid) {
    fail(
      `${fileName} inválido: esperado PNG ${expectedSize}x${expectedSize} RGBA 8-bit; recebido ${metadata.format} ${metadata.width}x${metadata.height}, channels=${metadata.channels}, depth=${metadata.depth}`,
    );
  }
}

function removeUnconfiguredIcons() {
  for (const entry of fs.readdirSync(iconsDir, { withFileTypes: true })) {
    if (keptIconEntries.has(entry.name)) continue;

    fs.rmSync(path.join(iconsDir, entry.name), {
      force: true,
      recursive: true,
    });
  }
}

async function main() {
  fs.mkdirSync(iconsDir, { recursive: true });

  const originalSource = findSourceIcon();
  console.log(`Icon source: ${relativeIconPath(originalSource)}`);

  await writeRgbaSquare(originalSource, tempIcon, 1024);
  await writeRgbaSquare(tempIcon, sourceIcon, 1024);
  removeUnconfiguredIcons();

  for (const [fileName, size] of pngTargets) {
    const filePath = path.join(iconsDir, fileName);
    await writeRgbaSquare(tempIcon, filePath, size);
    await assertRgbaPng(fileName, size);
    console.log(`${fileName === "icon.png" ? "Normalized" : "Generated"}: ${fileName}`);
  }

  for (const fileName of ["icon.ico", "icon.icns"]) {
    const filePath = path.join(iconsDir, fileName);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      fail(`ícone obrigatório ausente: ${path.relative(launcherRoot, filePath)}`);
    }
  }

  fs.rmSync(tempIcon, { force: true });
  console.log("fix-icons: PNGs Tauri normalizados como RGBA; .ico/.icns preservados.");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
