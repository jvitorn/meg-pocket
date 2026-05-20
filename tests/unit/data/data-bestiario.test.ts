import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readAmeacasSeed() {
  return fs.readFileSync(
    path.join(repoRoot, "prisma/seeds/generated/015_ameaca.sql"),
    "utf8"
  );
}

function seedRows() {
  return readAmeacasSeed()
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith("--"))
    .filter((line) => !line.startsWith("COPY "))
    .filter((line) => !line.startsWith("id,"))
    .filter((line) => !line.startsWith("\\."))
    .filter((line) => !line.startsWith("SELECT "));
}

describe("seed de ameacas", () => {
  it("mantem o bestiario inicial no seed SQL com slugs unicos", () => {
    const rows = seedRows();
    const slugs = rows.map((line) => line.split(",")[1]);

    expect(rows).toHaveLength(44);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("inclui ameacas usadas pelas paginas publicas e combates", () => {
    const text = readAmeacasSeed();

    expect(text).toContain("dragao-glacial");
    expect(text).toContain("Dragão Glacial");
    expect(text).toContain("Sopro Congelante");
  });
});
