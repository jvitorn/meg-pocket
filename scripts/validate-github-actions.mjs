import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const workflowsDir = path.join(rootDir, ".github", "workflows");

function fail(message) {
  console.error(`validate-github-actions: ${message}`);
  process.exit(1);
}

function listWorkflowFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
    .map((file) => path.join(dir, file));
}

function parseActionRefs(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const refs = [];
  const regex = /^\s*uses:\s*["']?([^"'\s#]+)["']?/gm;
  let match;

  while ((match = regex.exec(text))) {
    const value = match[1];
    if (value.startsWith("./") || value.startsWith("../")) continue;
    if (!value.includes("@")) continue;
    refs.push({ filePath, value });
  }

  return refs;
}

function splitActionRef(value) {
  const at = value.lastIndexOf("@");
  const action = value.slice(0, at);
  const ref = value.slice(at + 1);
  const [owner, repo] = action.split("/");

  if (!owner || !repo || !ref) {
    fail(`referência de action inválida: ${value}`);
  }

  return { owner, repo, ref };
}

function refExists({ owner, repo, ref }) {
  const url = `https://github.com/${owner}/${repo}.git`;
  const refspecs = [`refs/tags/${ref}`, `refs/heads/${ref}`];
  const result = spawnSync("git", ["ls-remote", "--exit-code", url, ...refspecs], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return result.status === 0;
}

const workflowFiles = listWorkflowFiles(workflowsDir);
const refs = workflowFiles.flatMap(parseActionRefs);
const uniqueRefs = [...new Map(refs.map((ref) => [ref.value, ref])).values()];
const missing = [];

for (const actionRef of uniqueRefs) {
  const parsed = splitActionRef(actionRef.value);
  if (!refExists(parsed)) {
    missing.push(`${actionRef.value} em ${path.relative(rootDir, actionRef.filePath)}`);
  }
}

if (missing.length > 0) {
  fail(`refs inexistentes:\n${missing.map((item) => `- ${item}`).join("\n")}`);
}

console.log(`validate-github-actions: ok (${uniqueRefs.length} refs)`);
