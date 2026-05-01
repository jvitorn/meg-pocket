import type { ComponentType } from "react";
import {
  Bone,
  Cog,
  Crown,
  Feather,
  Flame,
  Leaf,
  MoonStar,
  Mountain,
  Orbit,
  ShieldQuestion,
  Skull,
  Sparkles,
  SunMedium,
  UserRound,
  Waves,
  Wind,
} from "lucide-react";

import type { AmeacaElemento, AmeacaTipo } from "@/data/dataBestiario";

type IconComponent = ComponentType<{ className?: string }>;

export const tipoAmeacaConfig: Record<
  AmeacaTipo,
  {
    icon: IconComponent;
    chipClass: string;
    iconClass: string;
    surfaceClass: string;
  }
> = {
  Goblinoide: {
    icon: Crown,
    chipClass:
      "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100",
    iconClass: "text-red-600 dark:text-red-200",
    surfaceClass:
      "border-red-200 bg-red-50/75 dark:border-red-500/20 dark:bg-red-500/[0.08]",
  },
  Besta: {
    icon: Feather,
    chipClass:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
    iconClass: "text-emerald-600 dark:text-emerald-200",
    surfaceClass:
      "border-emerald-200 bg-emerald-50/75 dark:border-emerald-500/20 dark:bg-emerald-500/[0.08]",
  },
  Gigante: {
    icon: Mountain,
    chipClass:
      "border-stone-300 bg-stone-100 text-stone-700 dark:border-stone-500/30 dark:bg-stone-500/10 dark:text-stone-100",
    iconClass: "text-stone-600 dark:text-stone-200",
    surfaceClass:
      "border-stone-200 bg-stone-100/75 dark:border-stone-500/20 dark:bg-stone-500/[0.08]",
  },
  Constructo: {
    icon: Cog,
    chipClass:
      "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-100",
    iconClass: "text-cyan-600 dark:text-cyan-200",
    surfaceClass:
      "border-cyan-200 bg-cyan-50/75 dark:border-cyan-500/20 dark:bg-cyan-500/[0.08]",
  },
  "Morto-vivo": {
    icon: Skull,
    chipClass:
      "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100",
    iconClass: "text-violet-600 dark:text-violet-200",
    surfaceClass:
      "border-violet-200 bg-violet-50/75 dark:border-violet-500/20 dark:bg-violet-500/[0.08]",
  },
  Planta: {
    icon: Leaf,
    chipClass:
      "border-lime-300 bg-lime-50 text-lime-700 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-lime-100",
    iconClass: "text-lime-600 dark:text-lime-200",
    surfaceClass:
      "border-lime-200 bg-lime-50/75 dark:border-lime-500/20 dark:bg-lime-500/[0.08]",
  },
  Dragão: {
    icon: Flame,
    chipClass:
      "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100",
    iconClass: "text-blue-600 dark:text-blue-200",
    surfaceClass:
      "border-blue-200 bg-blue-50/75 dark:border-blue-500/20 dark:bg-blue-500/[0.08]",
  },
  Colosso: {
    icon: Waves,
    chipClass:
      "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-100",
    iconClass: "text-teal-600 dark:text-teal-200",
    surfaceClass:
      "border-teal-200 bg-teal-50/75 dark:border-teal-500/20 dark:bg-teal-500/[0.08]",
  },
  Elemental: {
    icon: Orbit,
    chipClass:
      "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-100",
    iconClass: "text-fuchsia-600 dark:text-fuchsia-200",
    surfaceClass:
      "border-fuchsia-200 bg-fuchsia-50/75 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/[0.08]",
  },
  Humanoide: {
    icon: UserRound,
    chipClass:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
    iconClass: "text-amber-600 dark:text-amber-200",
    surfaceClass:
      "border-amber-200 bg-amber-50/75 dark:border-amber-500/20 dark:bg-amber-500/[0.08]",
  },
  Lobo: {
    icon: Feather,
    chipClass:
      "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-500/30 dark:bg-zinc-500/10 dark:text-zinc-100",
    iconClass: "text-zinc-600 dark:text-zinc-200",
    surfaceClass:
      "border-zinc-200 bg-zinc-50/75 dark:border-zinc-500/20 dark:bg-zinc-500/[0.08]",
  },
  Sombra: {
    icon: MoonStar,
    chipClass:
      "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-100",
    iconClass: "text-purple-600 dark:text-purple-200",
    surfaceClass:
      "border-purple-200 bg-purple-50/75 dark:border-purple-500/20 dark:bg-purple-500/[0.08]",
  },
  Espírito: {
    icon: Sparkles,
    chipClass:
      "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100",
    iconClass: "text-indigo-600 dark:text-indigo-200",
    surfaceClass:
      "border-indigo-200 bg-indigo-50/75 dark:border-indigo-500/20 dark:bg-indigo-500/[0.08]",
  },
  Ave: {
    icon: Feather,
    chipClass:
      "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100",
    iconClass: "text-sky-600 dark:text-sky-200",
    surfaceClass:
      "border-sky-200 bg-sky-50/75 dark:border-sky-500/20 dark:bg-sky-500/[0.08]",
  },
  Celestial: {
    icon: SunMedium,
    chipClass:
      "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-100",
    iconClass: "text-yellow-700 dark:text-yellow-200",
    surfaceClass:
      "border-yellow-200 bg-yellow-50/75 dark:border-yellow-500/20 dark:bg-yellow-500/[0.08]",
  },
  Entidade: {
    icon: Orbit,
    chipClass:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
    iconClass: "text-rose-600 dark:text-rose-200",
    surfaceClass:
      "border-rose-200 bg-rose-50/75 dark:border-rose-500/20 dark:bg-rose-500/[0.08]",
  },
};

export const elementoAmeacaConfig: Record<
  AmeacaElemento,
  {
    icon: IconComponent;
    chipClass: string;
  }
> = {
  Neutro: {
    icon: Bone,
    chipClass:
      "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-500/30 dark:bg-zinc-500/10 dark:text-zinc-100",
  },
  Vento: {
    icon: Wind,
    chipClass:
      "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100",
  },
  Fogo: {
    icon: Flame,
    chipClass:
      "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100",
  },
  Natureza: {
    icon: Leaf,
    chipClass:
      "border-green-300 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-100",
  },
  Etéreo: {
    icon: Sparkles,
    chipClass:
      "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-100",
  },
  Água: {
    icon: Waves,
    chipClass:
      "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100",
  },
  Sombrio: {
    icon: MoonStar,
    chipClass:
      "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-100",
  },
  Radiante: {
    icon: SunMedium,
    chipClass:
      "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-100",
  },
  "Fogo ou Radiante": {
    icon: SunMedium,
    chipClass:
      "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100",
  },
  Terra: {
    icon: Mountain,
    chipClass:
      "border-stone-300 bg-stone-100 text-stone-700 dark:border-stone-500/30 dark:bg-stone-500/10 dark:text-stone-100",
  },
};

export function getTipoAmeacaConfig(tipo: AmeacaTipo) {
  return tipoAmeacaConfig[tipo] ?? {
    icon: ShieldQuestion,
    chipClass: "border-border bg-muted text-muted-foreground",
    iconClass: "text-muted-foreground",
    surfaceClass: "border-border bg-muted/60",
  };
}

export function getElementoAmeacaConfig(elemento: AmeacaElemento) {
  return elementoAmeacaConfig[elemento] ?? {
    icon: ShieldQuestion,
    chipClass: "border-border bg-muted text-muted-foreground",
  };
}

export function formatAmeacaList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "—";
}

export function normalizeAmeacaSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
