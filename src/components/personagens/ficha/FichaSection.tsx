"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FichaTone = "slate" | "zinc" | "orange" | "sky" | "emerald";

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
      "border-slate-500/20 bg-gradient-to-br from-slate-500/[0.10] via-card/92 to-card/82",
    title: "text-slate-100",
    subtitle: "text-slate-200/70",
    accent: "bg-slate-400/80",
  },
  zinc: {
    section:
      "border-zinc-500/20 bg-gradient-to-br from-zinc-500/[0.08] via-card/92 to-card/82",
    title: "text-zinc-100",
    subtitle: "text-zinc-200/70",
    accent: "bg-zinc-300/80",
  },
  orange: {
    section:
      "border-orange-500/20 bg-gradient-to-br from-orange-500/[0.10] via-card/92 to-card/82",
    title: "text-orange-100",
    subtitle: "text-orange-100/70",
    accent: "bg-orange-400/90",
  },
  sky: {
    section:
      "border-sky-500/20 bg-gradient-to-br from-sky-500/[0.10] via-card/92 to-card/82",
    title: "text-sky-100",
    subtitle: "text-sky-100/70",
    accent: "bg-sky-400/90",
  },
  emerald: {
    section:
      "border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.10] via-card/92 to-card/82",
    title: "text-emerald-100",
    subtitle: "text-emerald-100/70",
    accent: "bg-emerald-400/90",
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
