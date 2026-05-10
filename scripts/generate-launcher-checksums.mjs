import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const outputArg = process.argv[2] ?? "checksums.txt";
const targetDir = path.join(repoRoot, "launcher", "src-tauri", "target");
const outputPath = path.resolve(repoRoot, outputArg);
const artifactPatterns = [
  /\.AppImage$/i,
  /\.deb$/i,
  /\.rpm$/i,
  /\.msi$/i,
  /\.exe$/i,
  /\.dmg$/i,
  /\.app\.tar\.gz$/i,
  /\.app\.tar\.gz\.sig$/i,
  /\.tar\.gz$/i,
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (entry.isFile()) return [fullPath];
    return [];
  });
}

function findBundleDirs(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (!entry.isDirectory()) return [];

    const isReleaseBundle =
      entry.name === "bundle" && path.basename(path.dirname(fullPath)) === "release";
    return isReleaseBundle ? [fullPath] : findBundleDirs(fullPath);
  });
}

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

const artifacts = findBundleDirs(targetDir)
  .flatMap((bundleDir) => walk(bundleDir))
  .filter((filePath) => artifactPatterns.some((pattern) => pattern.test(filePath)))
  .sort((a, b) => a.localeCompare(b));

if (artifacts.length === 0) {
  console.error(`generate-launcher-checksums: nenhum artefato encontrado em ${path.relative(repoRoot, targetDir)}`);
  process.exit(1);
}

const lines = artifacts.map((filePath) => {
  const relativePath = path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
  return `${sha256(filePath)}  ${relativePath}`;
});

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);
console.log(`generate-launcher-checksums: ${artifacts.length} artefato(s) em ${path.relative(repoRoot, outputPath)}`);
