"use client";

import {
  BookText,
  CircleDotDashed,
  ChevronDown,
  ChevronUp,
  Dices,
  Package,
  ScrollText,
  Shield,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PersonagemSectionId =
  | "anotacoes"
  | "defesa"
  | "sobre"
  | "pericias"
  | "inventario"
  | "magias"
  | "acoes"
  | "rolagem";


type NavItem = {
  id: PersonagemSectionId;
  label: string;
  count: number | null;
  isVisible: boolean;
};

type Props = {
  items: ReadonlyArray<NavItem>;
  onNavigate: (sectionId: PersonagemSectionId) => void;
  onToggle: (sectionId: PersonagemSectionId) => void;
};

const sectionIcons = {
  anotacoes: BookText,
  defesa: Shield,
  sobre: ScrollText,
  pericias: CircleDotDashed,
  inventario: Package,
  magias: Sparkles,
  acoes: WandSparkles,
  rolagem: Dices,
} as const;

const sectionStyles = {
  anotacoes: {
    active:
      "border-cyan-400/60 bg-cyan-100 text-cyan-700 dark:border-cyan-500/50 dark:bg-cyan-500/15 dark:text-cyan-100",
    inactive:
      "border-cyan-300 bg-cyan-50 text-cyan-600 dark:border-cyan-500/25 dark:bg-cyan-500/8 dark:text-cyan-200/80",
    badge:
      "bg-cyan-200 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-100",
  },
  rolagem: {
    active:
      "border-fuchsia-400/60 bg-fuchsia-100 text-fuchsia-700 dark:border-fuchsia-500/50 dark:bg-fuchsia-500/15 dark:text-fuchsia-100",
    inactive:
      "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-600 dark:border-fuchsia-500/25 dark:bg-fuchsia-500/8 dark:text-fuchsia-200/80",
    badge:
      "bg-fuchsia-200 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-100",
  },
  defesa: {
    active:
      "border-slate-400/60 bg-slate-200 text-slate-700 dark:border-slate-500/50 dark:bg-slate-500/15 dark:text-slate-100",
    inactive:
      "border-slate-300 bg-slate-100/90 text-slate-600 dark:border-slate-500/25 dark:bg-slate-500/8 dark:text-slate-300/80",
    badge:
      "bg-slate-300 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
  },
  sobre: {
    active:
      "border-violet-400/60 bg-violet-100 text-violet-700 dark:border-violet-500/50 dark:bg-violet-500/15 dark:text-violet-100",
    inactive:
      "border-violet-300 bg-violet-50 text-violet-600 dark:border-violet-500/25 dark:bg-violet-500/8 dark:text-violet-200/80",
    badge:
      "bg-violet-200 text-violet-700 dark:bg-violet-500/20 dark:text-violet-100",
  },
  pericias: {
    active:
      "border-orange-400/60 bg-orange-100 text-orange-700 dark:border-orange-500/50 dark:bg-orange-500/15 dark:text-orange-100",
    inactive:
      "border-orange-300 bg-orange-50 text-orange-600 dark:border-orange-500/25 dark:bg-orange-500/8 dark:text-orange-200/80",
    badge:
      "bg-orange-200 text-orange-700 dark:bg-orange-500/20 dark:text-orange-100",
  },
  inventario: {
    active:
      "border-amber-400/60 bg-amber-100 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-100",
    inactive:
      "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-500/25 dark:bg-amber-500/8 dark:text-amber-200/80",
    badge:
      "bg-amber-200 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100",
  },
  magias: {
    active:
      "border-sky-400/60 bg-sky-100 text-sky-700 dark:border-sky-500/50 dark:bg-sky-500/15 dark:text-sky-100",
    inactive:
      "border-sky-300 bg-sky-50 text-sky-600 dark:border-sky-500/25 dark:bg-sky-500/8 dark:text-sky-200/80",
    badge:
      "bg-sky-200 text-sky-700 dark:bg-sky-500/20 dark:text-sky-100",
  },
  acoes: {
    active:
      "border-emerald-400/60 bg-emerald-100 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-100",
    inactive:
      "border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-500/25 dark:bg-emerald-500/8 dark:text-emerald-200/80",
    badge:
      "bg-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100",
  },
} as const;

export function PersonagemSectionNav({
  items,
  onNavigate,
  onToggle,
}: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/90 p-3 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2">
        <p className="text-sm font-semibold text-foreground">Seções da ficha</p>
        <p className="ml-auto hidden max-w-72 text-right text-xs text-muted-foreground lg:block">
          Use o nome para focar a seção no centro da tela e a seta para recolher
          ou reabrir.
        </p>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 lg:overflow-visible lg:px-0">
        <div className="flex min-w-max items-center gap-2 lg:min-w-0 lg:flex-wrap">
          {items.map((item) => {
            const Icon = sectionIcons[item.id];
            const style = sectionStyles[item.id];

            return (
              <div
                key={item.id}
                className={cn(
                  "inline-flex items-center overflow-hidden rounded-full border transition whitespace-nowrap",
                  item.isVisible ? style.active : style.inactive
                )}
              >
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                  {item.count !== null ? (
                    <span
                      className={cn(
                        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                        style.badge
                      )}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  aria-label={
                    item.isVisible
                      ? `Ocultar seção ${item.label}`
                      : `Mostrar seção ${item.label}`
                  }
                  onClick={() => onToggle(item.id)}
                  className="border-l border-current/10 px-2.5 py-2 opacity-80 transition hover:opacity-100"
                >
                  {item.isVisible ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
