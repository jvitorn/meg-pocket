import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

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
