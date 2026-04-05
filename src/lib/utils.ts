import colors from "tailwindcss/colors";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TailwindColorScale = Record<string, string>;

function normalizeColorToken(color?: string | null) {
  return (color ?? "").trim().toLowerCase();
}

function toTailwindColorKey(color?: string | null) {
  const normalized = normalizeColorToken(color);
  if (!normalized) return null;

  const match = normalized.match(/^([a-z]+)(?:-\d{2,3})?$/);
  return match?.[1] ?? normalized;
}

function isTailwindScale(value: unknown): value is TailwindColorScale {
  return (
    typeof value === "object" &&
    value !== null &&
    "500" in value &&
    typeof (value as TailwindColorScale)["500"] === "string"
  );
}

function getTailwindScale(color?: string | null) {
  const key = toTailwindColorKey(color);
  if (!key) return null;

  const candidate = colors[key as keyof typeof colors];
  return isTailwindScale(candidate) ? candidate : null;
}

export type ColorThemeName = string;

export const colorThemes = colors;

export function getColorClasses(color: ColorThemeName) {
  const resolved = resolveColorThemeName(color) ?? "zinc";
  return {
    text: `text-${resolved}-500`,
    bg: `bg-${resolved}-950`,
    border: `border-${resolved}-700`,
  };
}

export function isColorThemeName(color: string): color is ColorThemeName {
  return getTailwindScale(color) !== null;
}

export function resolveColorThemeName(color?: string | null): ColorThemeName | null {
  return isColorThemeName(color ?? "") ? (toTailwindColorKey(color) as ColorThemeName) : null;
}

export function getTailwindColorValue(
  color: string,
  shade: "50" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "950"
) {
  const scale = getTailwindScale(color) ?? getTailwindScale("zinc");
  if (!scale) {
    return "#71717a";
  }

  return scale[shade] ?? scale["500"] ?? "#71717a";
}
