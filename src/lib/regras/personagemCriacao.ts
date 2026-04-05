/**
 * Pontuação inicial aplicada às perícias selecionadas na criação da ficha.
 */
export const PERSONAGEM_PERICIA_PONTUACAO_INICIAL = 2;

export function toPositiveInt(value: unknown) {
  const num = Number(value);

  if (Number.isNaN(num) || !Number.isInteger(num) || num <= 0) {
    return null;
  }

  return num;
}

export function normalizePericiaTipo(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || "geral";
}

export function formatPericiaTipo(value?: string | null) {
  const normalized = normalizePericiaTipo(value);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function calcularQuantidadeObrigatoriaPericias(totalTipos: number) {
  if (totalTipos <= 0) {
    return 0;
  }

  return totalTipos >= 3 ? 2 : 1;
}

export function isValidExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
