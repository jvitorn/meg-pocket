const datasourceUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!datasourceUrl) {
  throw new Error("DATABASE_URL ou DIRECT_URL nao foi definido para o Prisma portatil.");
}

export default {
  schema: "schema.prisma",

  datasource: {
    url: datasourceUrl,
  },

  migrations: {
    path: "migrations",
  },
};
