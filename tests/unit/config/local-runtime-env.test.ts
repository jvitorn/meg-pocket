import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repoRoot = process.cwd();

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("configuracao local gerada para Docker e launcher", () => {
  beforeEach(() => {
    delete process.env.STORAGE_DRIVER;
    delete process.env.STORAGE_BUCKET;
    delete process.env.STORAGE_LOCAL_DIR;
    delete process.env.STORAGE_LOCAL_PUBLIC_URL;
    delete process.env.STORAGE_ENDPOINT;
    delete process.env.STORAGE_PUBLIC_URL;
    delete process.env.STORAGE_ACCESS_ID;
    delete process.env.STIRAGE_ACCESS_ID;
    delete process.env.STORAGE_ACCESS_KEY;
  });

  it("nao declara credenciais Google nos templates locais", () => {
    const files = [
      ".env.example",
      ".env.prod.example",
      "Dockerfile",
      "docker-compose.yml",
      "installers/linux/lib.sh",
      "installers/windows/lib.ps1",
    ];

    for (const file of files) {
      const text = readRepoFile(file);

      expect(text, `${file} nao deve declarar GOOGLE_CLIENT_ID`).not.toMatch(
        /GOOGLE_CLIENT_ID\s*[:=]/
      );
      expect(text, `${file} nao deve declarar GOOGLE_CLIENT_SECRET`).not.toMatch(
        /GOOGLE_CLIENT_SECRET\s*[:=]/
      );
    }
  });

  it("mantem uploads persistentes em /app/uploads no runtime Docker", () => {
    const dockerfile = readRepoFile("Dockerfile");
    const compose = readRepoFile("docker-compose.yml");

    expect(dockerfile).toContain('STORAGE_LOCAL_DIR="/app/uploads"');
    expect(dockerfile).toContain('STORAGE_LOCAL_PUBLIC_URL="/uploads"');
    expect(compose).toContain("uploads_data:/app/uploads");
    expect(compose).toContain("STORAGE_LOCAL_PUBLIC_URL: /uploads");
  });

  it("usa ./public/uploads como fallback local para o provider", async () => {
    vi.resetModules();

    const { getStorageConfig } = await import("@/lib/storage/config");
    const config = getStorageConfig();

    expect(config.driver).toBe("local");
    expect(config.localDir).toBe("./public/uploads");
    expect(config.localPublicUrl).toBe("/uploads");
  });
});
