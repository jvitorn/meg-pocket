"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Package,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { FichaSection } from "./FichaSection";
import type { PersonagemInterface, PersonagemInventarioItem } from "@/types";
import {
  INVENTARIO_SLOTS_MAXIMOS,
  ITEM_TIPO_LABEL,
} from "@/lib/personagemInventario";
import { usarItemInventario } from "@/services/personagemService";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Props = {
  personagem: PersonagemInterface;
  setPersonagem: React.Dispatch<
    React.SetStateAction<PersonagemInterface | null>
  >;
  canEdit: boolean;
};

function formatSlots(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatModuloLabel(item: PersonagemInventarioItem) {
  if (!item.efeito) return null;

  const modulo = {
    VIDA: "Vida",
    MANA: "Mana",
    DEFESA: "Defesa",
  }[item.efeito.modulo];

  const operacao = item.efeito.operacao === "REMOVER" ? "remove" : "adiciona";

  return `${modulo}: ${operacao} ${item.efeito.valor}`;
}

function DurabilidadeDots({
  atual,
  max,
}: {
  atual?: number | null;
  max?: number | null;
}) {
  if (typeof atual !== "number" || typeof max !== "number" || max <= 0) {
    return (
      <span className="text-xs text-muted-foreground">
        Sem durabilidade registrada
      </span>
    );
  }

  const usados = Math.max(0, max - atual);

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max }).map((_, index) => (
        <span
          key={index}
          className={
            index < usados
              ? "h-3 w-3 rounded-full border border-amber-300 bg-amber-300"
              : "h-3 w-3 rounded-full border border-amber-300/60 bg-transparent"
          }
        />
      ))}
    </div>
  );
}

function ItemDetailContent({
  item,
  canEdit,
  using,
  onUse,
}: {
  item: PersonagemInventarioItem;
  canEdit: boolean;
  using: boolean;
  onUse: () => Promise<void>;
}) {
  const effectLabel = formatModuloLabel(item);
  const defenseActive = item.efeito?.modulo === "DEFESA" && item.efeitoAtivo;
  const disabled = !canEdit || item.esgotado || defenseActive || using;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            {ITEM_TIPO_LABEL[item.tipo]}
          </span>
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
            x{item.quantidade}
          </span>
          {effectLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-100 px-2 py-1 text-[11px] font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
              <Sparkles className="h-3 w-3" />
              {effectLabel}
            </span>
          ) : null}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {item.descricao?.trim()
            ? item.descricao
            : "Sem descrição registrada para este item."}
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-500/15 dark:bg-amber-500/5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-amber-700/80 dark:text-amber-100/75">
              Durabilidade
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {typeof item.durabilidadeAtual === "number" &&
              typeof item.durabilidadeMax === "number"
                ? `${item.durabilidadeAtual}/${item.durabilidadeMax}`
                : "Uso por unidade"}
            </p>
          </div>

          <DurabilidadeDots
            atual={item.durabilidadeAtual}
            max={item.durabilidadeMax}
          />
        </div>
      </div>

      <div className="grid gap-2 text-xs text-amber-700 dark:text-amber-100/80 sm:grid-cols-2">
        <div className="rounded-xl bg-amber-100 px-3 py-2 dark:bg-amber-500/10">
          {formatSlots(item.slotsTotal)} slot(s) ocupados
        </div>
        <div className="rounded-xl bg-amber-100 px-3 py-2 dark:bg-amber-500/10">
          {formatSlots(item.slots)} por unidade
        </div>
      </div>

      {item.observacoes?.trim() ? (
        <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-3 text-sm text-muted-foreground">
          {item.observacoes}
        </div>
      ) : null}

      {item.esgotado ? (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/80 px-3 py-3 text-sm text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/4 dark:text-amber-100/75">
          Este item foi esgotado e permanece oculto apenas como registro.
        </div>
      ) : null}

      {defenseActive ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-3 text-sm text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/6 dark:text-sky-100/80">
          O efeito de defesa deste item já está ativo na ficha.
        </div>
      ) : null}
      <div className="flex justify-end">
        <Button type="button" onClick={onUse} disabled={disabled}>
          {using ? "Usando..." : item.esgotado ? "Esgotado" : "Usar"}
        </Button>
      </div>
    </div>
  );
}

function InventoryDetailSurface({
  item,
  open,
  onOpenChange,
  canEdit,
  using,
  onUse,
  useDrawer,
}: {
  item: PersonagemInventarioItem | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  canEdit: boolean;
  using: boolean;
  onUse: () => Promise<void>;
  useDrawer: boolean;
}) {
  if (!item) return null;

  const content = (
    <ItemDetailContent
      item={item}
      canEdit={canEdit}
      using={using}
      onUse={onUse}
    />
  );

  if (useDrawer) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>{item.nome}</DrawerTitle>
              <DrawerDescription>
                Use o item a partir da ficha. Cadastro e ajustes estruturais
                ficam com a administração.
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-4">{content}</div>
            <DrawerFooter />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item.nome}</DialogTitle>
          <DialogDescription>
            Use o item a partir da ficha. Cadastro e ajustes estruturais ficam
            com a administração.
          </DialogDescription>
        </DialogHeader>

        {content}
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}

export function PersonagemInventario({
  personagem,
  setPersonagem,
  canEdit,
}: Props) {
  const [loadingItemId, setLoadingItemId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showHiddenItems, setShowHiddenItems] = useState(false);
  const useDrawer = useMediaQuery("(max-width: 1023px)");

  const inventario = useMemo(
    () => personagem.inventario ?? [],
    [personagem.inventario]
  );
  const itensAtivos = useMemo(
    () => inventario.filter((item) => !item.esgotado),
    [inventario]
  );
  const itensOcultos = useMemo(
    () => inventario.filter((item) => item.esgotado),
    [inventario]
  );
  const selectedItem =
    inventario.find((item) => item.id === selectedItemId) ?? null;
  const resumo = personagem.inventarioResumo ?? {
    slotsMaximos: INVENTARIO_SLOTS_MAXIMOS,
    slotsOcupados: 0,
    slotsDisponiveis: INVENTARIO_SLOTS_MAXIMOS,
    itensTotais: 0,
  };
  const slotsPercent = Math.min(
    100,
    (resumo.slotsOcupados / resumo.slotsMaximos) * 100,
  );
  async function handleUsarItem(inventoryItemId: number) {
    if (!canEdit || loadingItemId) return;

    try {
      setLoadingItemId(inventoryItemId);

      const response = await usarItemInventario(personagem.id, inventoryItemId);

      setPersonagem((current) =>
        current
          ? {
              ...current,
              inventario: response.inventario ?? [],
              inventarioResumo: response.inventarioResumo,
              hp_atual: response.personagem?.hp_atual ?? current.hp_atual,
              mana_atual: response.personagem?.mana_atual ?? current.mana_atual,
              defesa_atual:
                response.personagem?.defesa_atual ?? current.defesa_atual,
              defesa_max: response.personagem?.defesa_max ?? current.defesa_max,
            }
          : current,
      );

      toast.success(response.message ?? "Item usado com sucesso.");
      setDetailsOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao usar o item.",
      );
    } finally {
      setLoadingItemId(null);
    }
  }

  return (
    <>
      <FichaSection
        title="Inventário"
        subtitle="Clique em um item para abrir os detalhes, visualizar a durabilidade e usar o efeito disponível."
        sectionId="inventario"
        tone="amber"
      >
        <div className="space-y-4">
          {!canEdit ? (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/4 dark:text-amber-100/80">
              Uso e alterações do inventário ficam restritos ao administrador da
              ficha.
            </div>
          ) : null}

          <div className="rounded-2xl border border-dashed border-amber-500/20 bg-amber-50/80 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.07]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700/80 dark:text-amber-100/80">
                  Capacidade
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {formatSlots(resumo.slotsOcupados)} /{" "}
                  {formatSlots(resumo.slotsMaximos)} slots
                </p>
                <p className="text-sm text-amber-700/80 dark:text-amber-100/75">
                  {resumo.slotsDisponiveis > 0
                    ? `${formatSlots(resumo.slotsDisponiveis)} slot(s) disponíveis`
                    : "Inventário cheio"}
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-background/70 px-4 py-3 dark:border-amber-500/20 dark:bg-background/50">
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Itens totais
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    {resumo.itensTotais}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-950/50">
              <div
                className="h-full rounded-full bg-amber-500 transition-[width] dark:bg-amber-400"
                style={{ width: `${slotsPercent}%` }}
              />
            </div>
          </div>

          {itensAtivos.length ? (
            <div className="grid gap-3">
              {itensAtivos.map((item) => {
                const effectLabel = formatModuloLabel(item);
                const defenseActive =
                  item.efeito?.modulo === "DEFESA" && item.efeitoAtivo;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setDetailsOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedItemId(item.id);
                        setDetailsOpen(true);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="rounded-2xl border border-amber-200 bg-card/85 p-4 text-left transition hover:border-amber-300 hover:bg-card dark:border-amber-500/15 dark:bg-card/70 dark:hover:border-amber-400/30 dark:hover:bg-card/90"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground md:text-base">
                            {item.nome}
                          </h4>
                          <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                            {ITEM_TIPO_LABEL[item.tipo]}
                          </span>
                          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                            x{item.quantidade}
                          </span>
                          {effectLabel ? (
                            <span className="rounded-full border border-sky-300 bg-sky-100 px-2 py-1 text-[11px] font-medium text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
                              {effectLabel}
                            </span>
                          ) : null}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {item.descricao?.trim()
                            ? item.descricao
                            : "Sem descrição registrada para este item."}
                        </p>

                        <div className="flex flex-wrap gap-2 text-xs text-amber-700 dark:text-amber-100/80">
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-500/10">
                            {formatSlots(item.slotsTotal)} slot(s)
                          </span>
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-500/10">
                            {formatSlots(item.slots)} por unidade
                          </span>
                          {typeof item.durabilidadeAtual === "number" &&
                          typeof item.durabilidadeMax === "number" ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-500/10">
                              Durabilidade {item.durabilidadeAtual}/
                              {item.durabilidadeMax}
                            </span>
                          ) : null}
                        </div>

                        {defenseActive ? (
                          <p className="text-xs text-sky-700 dark:text-sky-100/80">
                            Defesa ativa nesta ficha.
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 self-start">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedItemId(item.id);
                            setDetailsOpen(true);
                          }}
                        >
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/4 dark:text-amber-100/80">
              Esse personagem não está carregando nenhum item nos bolsos.
            </div>
          )}

          {itensOcultos.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 dark:border-amber-500/15 dark:bg-amber-500/4">
              <button
                type="button"
                onClick={() => setShowHiddenItems((current) => !current)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-medium text-amber-700 dark:text-amber-100/85">
                  Itens esgotados ({itensOcultos.length})
                </span>
                {showHiddenItems ? (
                  <ChevronUp className="h-4 w-4 text-amber-600 dark:text-amber-200" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-200" />
                )}
              </button>

              {showHiddenItems ? (
                <div className="grid gap-3 border-t border-amber-200 px-4 py-4 dark:border-amber-500/10">
                  {itensOcultos.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setDetailsOpen(true);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedItemId(item.id);
                          setDetailsOpen(true);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="rounded-xl border border-dashed border-amber-200 bg-background/70 px-4 py-3 text-left opacity-75 transition hover:opacity-100 dark:border-amber-500/20 dark:bg-background/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {item.nome}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Registro preservado após esgotar a durabilidade.
                          </p>
                        </div>
                        <Button type="button" size="sm" variant="outline">
                          Ver registro
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </FichaSection>

      <InventoryDetailSurface
        item={selectedItem}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        canEdit={canEdit}
        using={loadingItemId === selectedItem?.id}
        onUse={async () => {
          if (!selectedItem) return;
          await handleUsarItem(selectedItem.id);
        }}
        useDrawer={useDrawer}
      />
    </>
  );
}
