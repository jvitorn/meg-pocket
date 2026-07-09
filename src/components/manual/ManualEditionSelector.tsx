import { ChevronDown } from "lucide-react";
import Link from "next/link";

import type { EdicaoManual } from "@/lib/manual/source";

type ManualEditionSelectorProps = {
  edicao: EdicaoManual;
};

export function ManualEditionSelector({ edicao }: ManualEditionSelectorProps) {
  const label = edicao === "essencial" ? "M&G Essencial" : "M&G Completo";
  const nextEdition = edicao === "essencial" ? "completo" : "essencial";
  const nextLabel = edicao === "essencial" ? "M&G Completo" : "M&G Essencial";

  return (
    <Link
      href={`/manual/${nextEdition}`}
      className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-2.5 transition hover:border-amber-600/30 hover:bg-amber-600/5"
      aria-label={`Trocar para ${nextLabel}`}
    >
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">trocar camada</span>
      </span>
      <ChevronDown className="size-4 text-muted-foreground" />
    </Link>
  );
}
