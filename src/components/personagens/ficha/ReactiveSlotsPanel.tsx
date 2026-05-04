"use client";

import { motion } from "framer-motion";
import { Shield, ShieldCheck, Swords, Wind } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { SlotDefensivoTipo } from "@/lib/regras/slotsDefensivos";

type ReactiveSlotRow = {
  tipo: SlotDefensivoTipo;
  usados: number;
  limite: number;
  onUse?: () => void;
};

type ReactiveSlotsPanelProps = {
  title?: string;
  description?: string;
  rows: ReactiveSlotRow[];
  canEdit: boolean;
  disabled?: boolean;
  loadingSlot?: SlotDefensivoTipo | null;
  onReset?: () => void;
  className?: string;
  resetLabel?: string;
  emptyState?: ReactNode;
  hideUnavailable?: boolean;
  id?: string;
};

const slotMeta: Record<
  SlotDefensivoTipo,
  {
    label: string;
    icon: typeof Wind;
    iconClass: string;
    textClass: string;
  }
> = {
  esquiva: {
    label: "Esquiva",
    icon: Wind,
    iconClass: "text-slate-500 dark:text-slate-400",
    textClass: "text-slate-700 dark:text-slate-300",
  },
  bloqueio: {
    label: "Bloqueio",
    icon: ShieldCheck,
    iconClass: "text-zinc-500 dark:text-zinc-400",
    textClass: "text-zinc-700 dark:text-zinc-300",
  },
  contra: {
    label: "Contra",
    icon: Swords,
    iconClass: "text-stone-500 dark:text-stone-400",
    textClass: "text-stone-700 dark:text-stone-300",
  },
};

export function ReactiveSlotsPanel({
  title = "Slots Reativos",
  description,
  rows,
  canEdit,
  disabled = false,
  loadingSlot = null,
  onReset,
  className,
  resetLabel = "Resetar",
  emptyState,
  hideUnavailable = false,
  id,
}: ReactiveSlotsPanelProps) {
  const visibleRows = hideUnavailable
    ? rows.filter((row) => row.limite > 0)
    : rows;

  if (visibleRows.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <section
      id={id}
      className={cn(
        "space-y-4 rounded-2xl border border-slate-200 bg-linear-to-br from-slate-100 via-card to-card p-4 shadow-sm backdrop-blur-sm dark:border-slate-500/20 dark:from-slate-500/10 dark:via-card/92 dark:to-card/82",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-slate-500 dark:text-slate-200" />
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:text-slate-100">
              {title}
            </h3>
            {description ? (
              <p className="text-xs text-slate-600 dark:text-slate-100/70">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {onReset ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!canEdit || disabled}
            className="border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-100 dark:hover:bg-slate-500/15"
          >
            {resetLabel}
          </Button>
        ) : null}
      </div>

      <Separator />

      <div className="grid gap-3">
        {visibleRows.map((row) => (
          <ReactiveSlotItem
            key={row.tipo}
            row={row}
            canEdit={canEdit}
            disabled={disabled}
            loadingSlot={loadingSlot}
          />
        ))}
      </div>

      <Separator />
    </section>
  );
}

function ReactiveSlotItem({
  row,
  canEdit,
  disabled,
  loadingSlot,
}: {
  row: ReactiveSlotRow;
  canEdit: boolean;
  disabled: boolean;
  loadingSlot: SlotDefensivoTipo | null;
}) {
  const meta = slotMeta[row.tipo];
  const Icon = meta.icon;
  const isLoading = loadingSlot === row.tipo;
  const usedAll = row.usados >= row.limite;

  return (
    <motion.div
      className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
      animate={{ opacity: isLoading ? 0.6 : 1 }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={cn("h-4 w-4 shrink-0", meta.iconClass)} />
        <span className={cn("truncate text-sm font-medium", meta.textClass)}>
          {meta.label}
        </span>
      </div>

      <Button
        type="button"
        size="sm"
        className="max-w-full shrink-0"
        disabled={!canEdit || disabled || isLoading || row.limite <= 0 || usedAll}
        onClick={row.onUse}
      >
        Usar
      </Button>

      <SlotsVisual usados={row.usados} limite={row.limite} />
    </motion.div>
  );
}

function SlotsVisual({
  usados,
  limite,
}: {
  usados: number;
  limite: number;
}) {
  return (
    <div className="col-span-2 justify-center flex min-w-0 flex-wrap gap-1">
      {Array.from({ length: limite }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-3 w-3 rounded-sm border transition",
            i < usados
              ? "border-slate-400 bg-slate-400 dark:border-slate-300 dark:bg-slate-300"
              : "border-slate-300 bg-background/50 dark:border-slate-400/35"
          )}
        />
      ))}
    </div>
  );
}
