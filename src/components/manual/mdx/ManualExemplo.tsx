import type { ReactNode } from "react";

type ManualExemploProps = {
  titulo?: string;
  dados?: string[];
  children: ReactNode;
};

export function ManualExemplo({
  titulo = "Exemplo",
  dados = [],
  children,
}: ManualExemploProps) {
  return (
    <aside className="my-6 rounded-xl border border-border/70 bg-background/50 px-4 py-4">
      <div className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-600">
        {titulo}
      </div>
      <div className="flex gap-4">
        {dados.length > 0 ? (
          <div className="flex shrink-0 gap-2 pt-1" aria-hidden="true">
            {dados.map((dado, index) => (
              <span
                key={`${dado}-${index}`}
                className="flex size-[34px] items-center justify-center rounded-lg border-[1.5px] border-amber-600/45 bg-card font-display text-sm font-bold text-amber-700 shadow-sm dark:text-amber-600"
                style={{
                  transform: `rotate(${index % 2 === 0 ? "-5deg" : "4deg"})`,
                }}
              >
                {dado}
              </span>
            ))}
          </div>
        ) : null}
        <div className="min-w-0 flex-1 text-[15px] leading-7 text-foreground/80">
          {children}
        </div>
      </div>
    </aside>
  );
}
