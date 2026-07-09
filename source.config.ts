import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const manualEssencial = defineDocs({
  dir: "content/manual/essencial",
});

export const manualCompleto = defineDocs({
  dir: "content/manual/completo",
});

export default defineConfig();
