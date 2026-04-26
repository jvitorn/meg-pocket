import type { ComponentType, CSSProperties } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CircleHelp,
} from "lucide-react";

import LogoArtifice from "@/components/icons/artifice";
import LogoElementalista from "@/components/icons/elementalista";
import LogoGuerreiro from "@/components/icons/guerreiro";
import LogoPurificador from "@/components/icons/purificador";
import {
  getTailwindColorValue,
  resolveColorThemeName,
  type ColorThemeName,
} from "@/lib/utils";

type ThemeIcon = ComponentType<{ className?: string }> | LucideIcon;

type ThemePalette = {
  iconClass: string;
  ringClass: string;
  chipClass: string;
  softClass: string;
  frameClass: string;
  glowClass: string;
  textClass: string;
  style: CSSProperties;
};

type ThemeResult = ThemePalette & {
  icon: ThemeIcon;
  color: ColorThemeName;
};

function normalizeLegendToken(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .trim();
}

function mixWithTransparency(color: string, opacity: number) {
  return `color-mix(in srgb, ${color} ${opacity}%, transparent)`;
}

function paletteFor(color: ColorThemeName) {
  const resolved = resolveColorThemeName(color) ?? "zinc";
  const shade300 = getTailwindColorValue(resolved, "300");
  const shade500 = getTailwindColorValue(resolved, "500");
  const shade600 = getTailwindColorValue(resolved, "600");
  const shade700 = getTailwindColorValue(resolved, "700");

  return {
    iconClass: "text-[var(--theme-icon)]",
    ringClass: "ring-[color:var(--theme-ring)] border-[color:var(--theme-ring)]",
    chipClass:
      "border-[color:var(--theme-chip-border)] bg-[var(--theme-chip-bg)] text-[var(--theme-chip-text)]",
    softClass: "from-[var(--theme-soft-from)] via-background/90 to-background",
    frameClass: "border-[color:var(--theme-frame)]",
    glowClass: "bg-[var(--theme-glow)]",
    textClass: "text-[var(--theme-text)]",
    style: {
      "--theme-icon": `color-mix(in srgb, ${shade600} 65%, ${shade300} 35%)`,
      "--theme-ring": mixWithTransparency(shade500, 70),
      "--theme-chip-border": mixWithTransparency(shade500, 40),
      "--theme-chip-bg": mixWithTransparency(shade500, 10),
      "--theme-chip-text": `color-mix(in srgb, ${shade700} 60%, ${shade300} 40%)`,
      "--theme-soft-from": mixWithTransparency(shade500, 15),
      "--theme-surface": `color-mix(in srgb, ${shade500} 7%, var(--background))`,
      "--theme-surface-strong": `color-mix(in srgb, ${shade500} 13%, var(--background))`,
      "--theme-surface-muted": `color-mix(in srgb, ${shade500} 5%, var(--card))`,
      "--theme-frame": mixWithTransparency(shade500, 30),
      "--theme-glow": mixWithTransparency(shade500, 20),
      "--theme-text": `color-mix(in srgb, ${shade700} 55%, ${shade300} 45%)`,
    } as CSSProperties,
  };
}

export function getThemePalette(color: string) {
  return paletteFor(color);
}

function resolveColorTheme(color?: string | null, fallback: string = "zinc") {
  return resolveColorThemeName(color) ?? resolveColorThemeName(fallback) ?? "zinc";
}

function buildTheme(icon: ThemeIcon, color: string): ThemeResult {
  const resolvedColor = resolveColorTheme(color);
  return {
    icon,
    color: resolvedColor,
    ...paletteFor(resolvedColor),
  };
}

export function getLegendInitials(name?: string | null) {
  const clean = (name ?? "").trim();
  if (!clean) return "??";

  const words = clean
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words.map((word) => word[0]).join("").toUpperCase();
}

export function getClasseTheme(classe: {
  icone?: string | null;
  corTema?: string | null;
}) {
  return buildTheme(resolveClasseIcon(classe.icone), resolveColorTheme(classe.corTema));
}

export function getRacaTheme(raca: {
  icone?: string | null;
  corTema?: string | null;
}) {
  return buildTheme(resolveRacaIcon(raca.icone), resolveColorTheme(raca.corTema));
}

export function getThemeByColor(color?: string | null, fallback: string = "zinc") {
  return buildTheme(CircleHelp, resolveColorTheme(color, fallback));
}

function resolveIcon(
  rawIcon: string | null | undefined,
  registry: Record<string, ThemeIcon>,
  fallback: ThemeIcon
) {
  const key = normalizeLegendToken(rawIcon);
  if (!key) return fallback;
  return registry[key] ?? fallback;
}

const classeIconRegistry = {
  artifice: LogoArtifice,
  artificer: LogoArtifice,
  artificio: LogoArtifice,
  artifice_logo: LogoArtifice,
  elementalista: LogoElementalista,
  elemental: LogoElementalista,
  mage: LogoElementalista,
  mago: LogoElementalista,
  guerreiro: LogoGuerreiro,
  fighter: LogoGuerreiro,
  warrior: LogoGuerreiro,
  purificador: LogoPurificador,
  purifier: LogoPurificador,
  cleric: LogoPurificador,
  sacerdote: LogoPurificador,
} satisfies Record<string, ThemeIcon>;

function toPascalCaseIconName(rawIcon?: string | null) {
  const clean = (rawIcon ?? "").replace(/icon$/i, "").trim();
  if (!clean) return "";

  return clean
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

export function resolveClasseIcon(rawIcon?: string | null) {
  return resolveIcon(rawIcon, classeIconRegistry, CircleHelp);
}

export function resolveRacaIcon(rawIcon?: string | null) {
  const direct = (rawIcon ?? "").trim();
  const candidates = [direct, toPascalCaseIconName(direct)];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const icon = LucideIcons[candidate as keyof typeof LucideIcons];
    if (candidate in LucideIcons && icon) {
      return icon as LucideIcon;
    }
  }

  return CircleHelp;
}
