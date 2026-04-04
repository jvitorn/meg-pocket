"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FichaTone =
  | "slate"
  | "zinc"
  | "orange"
  | "sky"
  | "emerald"
  | "amber"
  | "violet";

const toneStyles: Record<
  FichaTone,
  {
    section: string;
    title: string;
    subtitle: string;
    accent: string;
  }
> = {
  slate: {
    section:
      "border-slate-200 bg-gradient-to-br from-slate-100 via-card to-card dark:border-slate-500/20 dark:from-slate-500/[0.10] dark:via-card/92 dark:to-card/82",
    title: "text-slate-700 dark:text-slate-100",
    subtitle: "text-slate-600 dark:text-slate-200/70",
    accent: "bg-slate-500 dark:bg-slate-400/80",
  },
  zinc: {
    section:
      "border-zinc-200 bg-gradient-to-br from-zinc-100 via-card to-card dark:border-zinc-500/20 dark:from-zinc-500/[0.08] dark:via-card/92 dark:to-card/82",
    title: "text-zinc-700 dark:text-zinc-100",
    subtitle: "text-zinc-600 dark:text-zinc-200/70",
    accent: "bg-zinc-500 dark:bg-zinc-300/80",
  },
  orange: {
    section:
      "border-orange-200 bg-gradient-to-br from-orange-100 via-card to-card dark:border-orange-500/20 dark:from-orange-500/[0.10] dark:via-card/92 dark:to-card/82",
    title: "text-orange-700 dark:text-orange-100",
    subtitle: "text-orange-700/80 dark:text-orange-100/70",
    accent: "bg-orange-500 dark:bg-orange-400/90",
  },
  sky: {
    section:
      "border-sky-200 bg-gradient-to-br from-sky-100 via-card to-card dark:border-sky-500/20 dark:from-sky-500/[0.10] dark:via-card/92 dark:to-card/82",
    title: "text-sky-700 dark:text-sky-100",
    subtitle: "text-sky-700/80 dark:text-sky-100/70",
    accent: "bg-sky-500 dark:bg-sky-400/90",
  },
  emerald: {
    section:
      "border-emerald-200 bg-gradient-to-br from-emerald-100 via-card to-card dark:border-emerald-500/20 dark:from-emerald-500/[0.10] dark:via-card/92 dark:to-card/82",
    title: "text-emerald-700 dark:text-emerald-100",
    subtitle: "text-emerald-700/80 dark:text-emerald-100/70",
    accent: "bg-emerald-500 dark:bg-emerald-400/90",
  },
  amber: {
    section:
      "border-amber-200 bg-gradient-to-br from-amber-100 via-card to-card dark:border-amber-500/20 dark:from-amber-500/[0.10] dark:via-card/92 dark:to-card/82",
    title: "text-amber-700 dark:text-amber-100",
    subtitle: "text-amber-700/80 dark:text-amber-100/70",
    accent: "bg-amber-500 dark:bg-amber-400/90",
  },
  violet: {
    section:
      "border-violet-200 bg-gradient-to-br from-violet-100 via-card to-card dark:border-violet-500/20 dark:from-violet-500/[0.10] dark:via-card/92 dark:to-card/82",
    title: "text-violet-700 dark:text-violet-100",
    subtitle: "text-violet-700/80 dark:text-violet-100/70",
    accent: "bg-violet-500 dark:bg-violet-400/90",
  },
};

export function FichaSection({
  title,
  subtitle = "",
  action,
  sectionId,
  tone = "zinc",
  className,
  children,
}: {
  title: string;
  subtitle?: string | null;
  action?: ReactNode;
  sectionId?: string;
  tone?: FichaTone;
  className?: string;
  children: ReactNode;
}) {
  const styles = toneStyles[tone];

  return (
    <section
      id={sectionId}
      className={cn(
        "scroll-mt-32 rounded-2xl border p-4 shadow-sm backdrop-blur-sm md:p-5",
        styles.section,
        className
      )}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", styles.accent)} />
            <h3
              className={cn(
                "text-xs font-semibold uppercase tracking-[0.2em]",
                styles.title
              )}
            >
              {title}
            </h3>
          </div>

          {subtitle ? (
            <p className={cn("text-xs leading-relaxed md:text-sm", styles.subtitle)}>
              {subtitle}
            </p>
          ) : null}
        </div>

        {action ? <div className="shrink-0 self-start">{action}</div> : null}
      </div>

      {children}
    </section>
  );
}
