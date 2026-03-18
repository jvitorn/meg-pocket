import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const mode = process.argv[2];
const rootDir = process.cwd();

const sourceMap = {
  local: [".env.docker-local", ".env.example"],
  prod: [".env.prod", ".env.prod.example", ".env.supabase-homolog"],
};

if (!mode || !sourceMap[mode]) {
  console.error("Uso: node scripts/use-env.mjs [local|prod]");
  process.exit(1);
}

const sourcePath = sourceMap[mode]
  .map((file) => path.join(rootDir, file))
  .find((file) => fs.existsSync(file));

if (!sourcePath) {
  console.error(`Nenhum arquivo de ambiente encontrado para o modo: ${mode}`);
  process.exit(1);
}

const targetPath = path.join(rootDir, ".env.local");
fs.copyFileSync(sourcePath, targetPath);

console.log(`.env.local atualizado para o modo: ${mode}`);
console.log(`Origem: ${path.basename(sourcePath)}`);
