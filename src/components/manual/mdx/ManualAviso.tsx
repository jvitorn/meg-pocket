import type { ReactNode } from "react";

type ManualAvisoProps = {
  titulo?: string;
  children: ReactNode;
};

export function ManualAviso({
  titulo = "Aviso",
  children,
}: ManualAvisoProps) {
  return (
    <aside className="my-6 rounded-xl border border-border/70 bg-muted/40 px-4 py-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {titulo}
      </div>
      <div className="text-[15px] leading-7 text-foreground/80">{children}</div>
    </aside>
  );
}
