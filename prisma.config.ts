// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    // Prefer direct/session URL for migrations; fallback keeps local/dev working.
    url: process.env.DIRECT_URL ?? env("DATABASE_URL"),
  },

  migrations: {
    path: "prisma/migrations",
  },
});
