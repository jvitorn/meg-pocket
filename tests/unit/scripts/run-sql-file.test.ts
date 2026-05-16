import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

const runner = await import("../../../scripts/lib/run-sql-file.mjs");

describe("run-sql-file helpers", () => {
  it("parseia argumentos da CLI", () => {
    expect(runner.parseCliArgs(["prisma/seeds/generated/index.sql"])).toEqual({
      sqlFile: "prisma/seeds/generated/index.sql",
      allowNonLocalSeed: false,
    });

    expect(
      runner.parseCliArgs(["prisma/seeds/generated/index.sql", "--prod"])
    ).toEqual({
      sqlFile: "prisma/seeds/generated/index.sql",
      allowNonLocalSeed: true,
    });

    expect(() => runner.parseCliArgs([])).toThrow(/arquivo SQL/i);
    expect(() => runner.parseCliArgs(["seed.sql", "--force"])).toThrow(
      /Opcao desconhecida/
    );
  });

  it("parseia arquivos de ambiente com comentarios e aspas", () => {
    expect(
      Object.fromEntries(
        runner.parseEnvText(`
# comentario
export DATABASE_URL="postgres://user:pass@localhost:5432/db"
DIRECT_URL='postgres://user:pass@postgres:5432/db'
PLAIN=value # comentario inline
INVALID LINE
`)
      )
    ).toEqual({
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      DIRECT_URL: "postgres://user:pass@postgres:5432/db",
      PLAIN: "value",
    });
  });

  it("identifica bancos locais e arquivos de seed por caminho absoluto", () => {
    const rootDir = "/repo";

    expect(runner.isLocalDatabaseUrl("postgres://user:pass@localhost:5432/db")).toBe(
      true
    );
    expect(runner.isLocalDatabaseUrl("postgres://user:pass@db.example.com/db")).toBe(
      false
    );

    expect(
      runner.isSeedSqlFile(
        path.resolve(rootDir, "prisma/seeds/generated/index.sql"),
        rootDir
      )
    ).toBe(true);
    expect(runner.isSeedSqlFile(path.resolve(rootDir, "scripts/foo.sql"), rootDir)).toBe(
      false
    );
  });

  it("parseia COPY FROM stdin com CSV multiline e valor null", () => {
    expect(
      runner.parseCopyCommand(
        `COPY "Demo" ("id", "name", "note") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');`
      )
    ).toEqual({
      table: `"Demo"`,
      columns: [`"id"`, `"name"`, `"note"`],
      options: {
        header: true,
        nullValue: "null",
      },
    });

    expect(
      runner.parseCsvRecords(`id,name,note
1,A,"linha
com ""aspas"""
2,B,null`)
    ).toEqual([
      ["id", "name", "note"],
      ["1", "A", 'linha\ncom "aspas"'],
      ["2", "B", "null"],
    ]);
  });
});

describe("executeSqlFile", () => {
  it("executa SQL, includes e COPY FROM stdin em ordem", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "run-sql-file-"));
    const indexPath = path.join(rootDir, "index.sql");
    const includedPath = path.join(rootDir, "data.sql");
    const queries: Array<{ sql: string; values?: unknown[] }> = [];
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    fs.writeFileSync(
      indexPath,
      [
        "BEGIN;",
        "\\ir data.sql",
        "\\echo Seed concluida.",
        "COMMIT;",
        "",
      ].join("\n")
    );
    fs.writeFileSync(
      includedPath,
      [
        `COPY "Demo" ("id", "name", "note") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');`,
        "id,name,note",
        "1,A,null",
        '2,B,"linha',
        'com ""aspas"""',
        "\\.",
        "",
      ].join("\n")
    );

    await runner.executeSqlFile(
      {
        query: async (sql: string, values?: unknown[]) => {
          queries.push({ sql, values });
        },
      },
      indexPath,
      { rootDir }
    );

    expect(queries).toEqual([
      { sql: "BEGIN;", values: undefined },
      {
        sql: `INSERT INTO "Demo" ("id", "name", "note") VALUES ($1, $2, $3), ($4, $5, $6)`,
        values: ["1", "A", null, "2", "B", 'linha\ncom "aspas"'],
      },
      { sql: "COMMIT;", values: undefined },
    ]);
    expect(consoleLog).toHaveBeenCalledWith("Seed concluida.");

    consoleLog.mockRestore();
  });
});
