import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CampanhaSectionHeaderTone = "emerald" | "amber" | "sky" | "violet";

type CampanhaSectionHeaderProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  tone?: CampanhaSectionHeaderTone;
  className?: string;
};

const toneClass: Record<CampanhaSectionHeaderTone, string> = {
  emerald: "from-zinc-950 via-emerald-950 to-sky-950",
  amber: "from-zinc-950 via-amber-950 to-sky-950",
  sky: "from-zinc-950 via-sky-950 to-emerald-950",
  violet: "from-zinc-950 via-violet-950 to-emerald-950",
};

export function CampanhaSectionHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  meta,
  actions,
  tone = "emerald",
  className,
}: CampanhaSectionHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border-b bg-linear-to-br p-5 text-white sm:p-6",
        toneClass[tone],
        className
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.045)_1px,transparent_1px)] opacity-35 bg-size-[28px_28px]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-lg shadow-black/30 backdrop-blur">
            <Icon className="h-7 w-7 text-white/90" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.26em] text-white/60">
              {eyebrow}
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold">{title}</h2>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/70">
                {description}
              </p>
            ) : null}
            {meta ? <div className="mt-2 text-sm text-white/70">{meta}</div> : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center *:w-full sm:*:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
