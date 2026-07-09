import { loader } from "fumadocs-core/source";
import { manualCompleto, manualEssencial } from "collections/server";

export type EdicaoManual = "essencial" | "completo";

export const manualEssencialSource = loader({
  baseUrl: "/manual/essencial",
  source: manualEssencial.toFumadocsSource(),
});

export const manualCompletoSource = loader({
  baseUrl: "/manual/completo",
  source: manualCompleto.toFumadocsSource(),
});

export function getManualSource(edicao: EdicaoManual) {
  if (edicao === "essencial") {
    return manualEssencialSource;
  }

  return manualCompletoSource;
}

export function isEdicaoManual(value: string): value is EdicaoManual {
  return value === "essencial" || value === "completo";
}
