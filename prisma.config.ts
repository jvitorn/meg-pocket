import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

const datasourceUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://meg:meg@localhost:5433/meg_pocket?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: datasourceUrl,
  },

  migrations: {
    path: "prisma/migrations",
  },
});
