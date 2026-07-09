import type { EdicaoManual } from "@/lib/manual/source";

type ManualTagListProps = {
  edicao: EdicaoManual;
};

const baseTagClass =
  "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]";

export function ManualTagList({ edicao }: ManualTagListProps) {
  const editionLabel = edicao === "essencial" ? "Essencial" : "Completo";

  return (
    <div
      aria-label="Marcadores da pagina"
      className="flex flex-wrap gap-1.5"
      role="list"
    >
      <span
        className={`${baseTagClass} border-primary bg-primary text-primary-foreground`}
        role="listitem"
      >
        {editionLabel}
      </span>
      <span
        className={`${baseTagClass} border-border/70 bg-background/70 text-muted-foreground`}
        role="listitem"
      >
        Todos
      </span>
      <span
        className={`${baseTagClass} border-amber-600/25 bg-amber-600/10 text-amber-700 dark:text-amber-600`}
        role="listitem"
      >
        Referência
      </span>
    </div>
  );
}
