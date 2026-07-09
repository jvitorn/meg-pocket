import type { ReactNode } from "react";

type ManualRegraProps = {
  titulo?: string;
  children: ReactNode;
};

export function ManualRegra({
  titulo = "Regra",
  children,
}: ManualRegraProps) {
  return (
    <aside className="my-6 rounded-xl border border-border/70 border-l-4 border-l-amber-600 bg-amber-600/5 px-4 py-4">
      <div className="mb-3 inline-flex rounded-full border border-amber-600/25 bg-background/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-600">
        {titulo}
      </div>
      <div className="text-[15px] leading-7 text-foreground/80">{children}</div>
    </aside>
  );
}
