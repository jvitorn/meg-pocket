const ELEMENT_THEME_COLORS = {
  natureza: "emerald",
  agua: "sky",
  fogo: "rose",
  vento: "slate",
} as const;

export function getElementoThemeColor(elemento?: string | null) {
  const key = (elemento ?? "").trim().toLowerCase();
  return ELEMENT_THEME_COLORS[key as keyof typeof ELEMENT_THEME_COLORS] ?? "violet";
}
