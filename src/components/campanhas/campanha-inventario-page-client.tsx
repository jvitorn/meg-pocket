"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Hammer,
  Package,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  Sword,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { CampanhaSectionHeader } from "@/components/campanhas/campanha-section-header";
import { EscudoLayoutShell } from "@/components/campanhas/escudo-layout-shell";
import { StatDrawer } from "@/components/stat-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  atualizarItemInventarioCampanha,
  excluirItemInventarioCampanha,
  vincularItemCampanha,
} from "@/services/campanhaApiService";
import type {
  CampanhaInfo,
  CampaignCatalogItem,
  CampaignInventoryCharacter,
  CampaignInventoryItem,
  CampaignInventoryUpdatePayload,
  ItemTipo,
} from "@/types";

export type { CampaignInventoryCharacter, CampaignInventoryItem };

const ITEM_TIPO_LABEL: Record<ItemTipo, string> = {
  ARMA: "Arma",
  CONSUMIVEL: "Consumível",
  MAGICO: "Mágico",
  MATERIAL: "Material",
  EQUIPAMENTO: "Equipamento",
};

type Props = {
  campanha: CampanhaInfo;
  personagens: CampaignInventoryCharacter[];
  catalogoItens: CampaignCatalogItem[];
  npcsCount: number;
  combatesCount?: number;
  bestiarioCount?: number;
};

function clampDurability(value: string, max: number | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "";
  const normalized = Math.trunc(parsed);
  return String(max ? Math.min(normalized, max) : normalized);
}

export function CampanhaInventarioPageClient({
  campanha,
  personagens,
  catalogoItens,
  npcsCount,
  combatesCount = 0,
  bestiarioCount = 0,
}: Props) {
  const router = useRouter();
  const [selectedPersonagemId, setSelectedPersonagemId] = useState(
    personagens[0]?.id ? String(personagens[0].id) : ""
  );
  const [selectedItemId, setSelectedItemId] = useState(
    catalogoItens[0]?.id ? String(catalogoItens[0].id) : ""
  );
  const [quantidade, setQuantidade] = useState("1");
  const [observacoes, setObservacoes] = useState("");
  const [allowItemOverride, setAllowItemOverride] = useState(false);
  const [durabilidadeAtual, setDurabilidadeAtual] = useState("");
  const [durabilidadeMax, setDurabilidadeMax] = useState("");
  const [transferTargets, setTransferTargets] = useState<Record<number, string>>({});
  const [recoveringItem, setRecoveringItem] =
    useState<(CampaignInventoryItem & { personagemNome: string }) | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCatalogItem = useMemo(
    () => catalogoItens.find((item) => String(item.id) === selectedItemId) ?? null,
    [catalogoItens, selectedItemId]
  );
  const inventario = personagens.flatMap((personagem) =>
    personagem.inventario.map((item) => ({ ...item, personagemNome: personagem.jogador }))
  );
  const totalItens = inventario.reduce((total, item) => total + item.quantidade, 0);
  const itensExpirados = inventario.filter((item) => item.esgotado).length;

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await vincularItemCampanha(campanha.id, {
        personagemId: selectedPersonagemId,
        itemId: selectedItemId,
        quantidade,
        observacoes,
        ...(allowItemOverride
          ? {
              durabilidadeAtual,
              durabilidadeMax,
            }
          : {}),
      });
      router.refresh();
      setObservacoes("");
      setAllowItemOverride(false);
      setDurabilidadeAtual("");
      setDurabilidadeMax("");
      toast.success("Item incluído no inventário.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao vincular item.");
    } finally {
      setLoading(false);
    }
  }

  async function updateInventoryItem(
    inventoryItemId: number,
    body: CampaignInventoryUpdatePayload,
    message: string
  ) {
    setLoading(true);

    try {
      await atualizarItemInventarioCampanha(campanha.id, inventoryItemId, body);
      router.refresh();
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar item.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteExpiredItem(inventoryItemId: number) {
    setLoading(true);

    try {
      await excluirItemInventarioCampanha(campanha.id, inventoryItemId);
      router.refresh();
      toast.success("Item expirado apagado do histórico.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao apagar item.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <EscudoLayoutShell
      campanha={campanha}
      activeSection="inventario"
      currentLabel="Inventário"
      personagensCount={personagens.length}
      inventarioCount={totalItens}
      npcsCount={npcsCount}
      combatesCount={combatesCount}
      bestiarioCount={bestiarioCount}
    >
      <div className="mx-auto flex w-full max-w-384 flex-col gap-5 px-3 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
          <CampanhaSectionHeader
            icon={Package}
            eyebrow="Arsenal da mesa"
            title="Inventário da campanha"
            description="Distribua recompensas, transfira recursos entre fichas e acompanhe itens expirados em uma visão de mesa."
            tone="amber"
            meta={`${totalItens} item${totalItens !== 1 ? "s" : ""} · ${itensExpirados} expirado${
              itensExpirados !== 1 ? "s" : ""
            }`}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Itens" value={totalItens} />
            <MetricCard label="Expirados" value={itensExpirados} />
          </div>

          <form onSubmit={handleAddItem} className="rounded-lg border border-border/70 bg-card p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md border bg-background">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Vincular item</h2>
                <p className="text-xs text-muted-foreground">Adicionar à ficha</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <SelectField
                id="inventario-personagem"
                label="Personagem"
                value={selectedPersonagemId}
                onChange={setSelectedPersonagemId}
                disabled={personagens.length === 0}
                options={personagens.map((personagem) => ({
                  value: String(personagem.id),
                  label: `${personagem.jogador} - ${personagem.nome}`,
                }))}
              />
              <SelectField
                id="inventario-item"
                label="Item"
                value={selectedItemId}
                onChange={(value) => {
                  setSelectedItemId(value);
                  setDurabilidadeAtual("");
                  setDurabilidadeMax("");
                }}
                disabled={catalogoItens.length === 0}
                options={catalogoItens.map((item) => ({
                  value: String(item.id),
                  label: `${item.nome} (${ITEM_TIPO_LABEL[item.tipo]})`,
                }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="text-sm font-medium">Quantidade</span>
                  <Input
                    className="mt-2"
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(event) => setQuantidade(event.target.value)}
                  />
                </label>
                <label>
                  <span className="text-sm font-medium">Observações</span>
                  <Input
                    className="mt-2"
                    value={observacoes}
                    onChange={(event) => setObservacoes(event.target.value)}
                  />
                </label>
              </div>

              <div className="rounded-lg border border-border/70 bg-background p-3 shadow-xs">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allowItemOverride}
                    onChange={(event) => setAllowItemOverride(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Editar durabilidade deste vínculo
                </label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    min="1"
                    value={durabilidadeMax}
                    placeholder={String(
                      selectedCatalogItem?.durabilidadeMax ??
                        selectedCatalogItem?.durabilidadeBase ??
                        ""
                    )}
                    onChange={(event) => {
                      const next = clampDurability(event.target.value, null);
                      setDurabilidadeMax(next);
                      setDurabilidadeAtual((current) =>
                        next ? clampDurability(current, Number(next)) : current
                      );
                    }}
                    disabled={!allowItemOverride}
                    aria-label="Durabilidade máxima"
                  />
                  <Input
                    type="number"
                    min="1"
                    value={durabilidadeAtual}
                    placeholder={String(
                      selectedCatalogItem?.durabilidadeBase ??
                        selectedCatalogItem?.durabilidadeMax ??
                        ""
                    )}
                    onChange={(event) =>
                      setDurabilidadeAtual(
                        clampDurability(
                          event.target.value,
                          Number(durabilidadeMax) ||
                            selectedCatalogItem?.durabilidadeMax ||
                            selectedCatalogItem?.durabilidadeBase
                        )
                      )
                    }
                    disabled={!allowItemOverride}
                    aria-label="Durabilidade atual"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="gap-2"
                disabled={
                  loading ||
                  !selectedPersonagemId ||
                  !selectedItemId ||
                  personagens.length === 0 ||
                  catalogoItens.length === 0
                }
              >
                <Sparkles className="h-4 w-4" />
                Vincular item
              </Button>
            </div>
          </form>
        </aside>

        <div className="grid gap-5">
          {personagens.map((personagem) => (
            <section
              id={`personagem-${personagem.id}`}
              key={personagem.id}
              className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm"
            >
              <div className="relative border-b bg-linear-to-br from-zinc-950 via-amber-950 to-sky-950 p-5 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.2),transparent_26%),radial-gradient(circle_at_90%_0%,rgba(14,165,233,0.16),transparent_24%)]" />
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                      Bolsa do jogador
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold">{personagem.jogador}</h2>
                    <p className="text-sm text-white/70">
                      Personagem: {personagem.nome}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm backdrop-blur">
                    {personagem.inventario.length} item
                    {personagem.inventario.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {personagem.inventario.length > 0 ? (
                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {personagem.inventario.map((item) => (
                    <article
                      key={item.id}
                      className="group overflow-hidden rounded-lg border border-border/70 bg-background shadow-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/25 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3 border-b p-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-card">
                          <ItemIcon tipo={item.tipo} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{item.nome}</h3>
                            {item.esgotado ? (
                              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700">
                                Expirado
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {ITEM_TIPO_LABEL[item.tipo]}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4 p-4">
                        <p className="line-clamp-3 min-h-12 text-sm text-muted-foreground">
                          {item.descricao || item.observacoes || "Sem observações."}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className="text-xs text-muted-foreground">Qtd.</span>
                            <Input
                              defaultValue={item.quantidade}
                              type="number"
                              min="0"
                              className="mt-1 h-8"
                              onBlur={(event) =>
                                updateInventoryItem(
                                  item.id,
                                  { quantidade: event.target.value },
                                  "Quantidade atualizada."
                                )
                              }
                              disabled={loading}
                            />
                          </label>
                          <div>
                            <span className="text-xs text-muted-foreground">Dur.</span>
                            <p className="mt-1 rounded-md border px-2 py-1.5 text-sm">
                              {item.durabilidadeAtual ?? "-"} / {item.durabilidadeMax ?? "-"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <select
                            className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
                            value={transferTargets[item.id] ?? ""}
                            onChange={(event) =>
                              setTransferTargets((current) => ({
                                ...current,
                                [item.id]: event.target.value,
                              }))
                            }
                            disabled={loading}
                          >
                            <option value="">Destino</option>
                            {personagens
                              .filter((destino) => destino.id !== personagem.id)
                              .map((destino) => (
                                <option key={destino.id} value={destino.id}>
                                  {destino.jogador} - {destino.nome}
                                </option>
                              ))}
                          </select>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            disabled={loading || !transferTargets[item.id]}
                            onClick={() =>
                              updateInventoryItem(
                                item.id,
                                {
                                  action: "transfer",
                                  targetPersonagemId: transferTargets[item.id],
                                },
                                "Item transferido."
                              )
                            }
                            aria-label="Transferir item"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                        {item.esgotado ? (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="flex-1 gap-2"
                              disabled={loading}
                              onClick={() =>
                                setRecoveringItem({
                                  ...item,
                                  personagemNome: personagem.jogador,
                                })
                              }
                            >
                              <RefreshCw className="h-4 w-4" />
                              Recuperar
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              disabled={loading}
                              onClick={() => deleteExpiredItem(item.id)}
                              aria-label="Apagar item expirado"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="p-5 text-sm text-muted-foreground">
                  Nenhum item vinculado a este personagem.
                </p>
              )}
            </section>
          ))}
        </div>
        </section>
      </div>

      <StatDrawer
        open={Boolean(recoveringItem)}
        setOpen={(open) => {
          if (!open) setRecoveringItem(null);
        }}
        title="Recuperar item"
        description={`Escolha com qual durabilidade o item volta para ${
          recoveringItem?.personagemNome ?? "a ficha"
        }.`}
        current={
          recoveringItem?.durabilidadeMax ??
          recoveringItem?.durabilidadeAtual ??
          1
        }
        max={recoveringItem?.durabilidadeMax ?? undefined}
        unitLabel="durabilidade"
        onUpdate={async (novoValor) => {
          if (!recoveringItem) return;
          await updateInventoryItem(
            recoveringItem.id,
            { action: "recover", durabilidadeAtual: novoValor },
            "Item recuperado."
          );
          setRecoveringItem(null);
        }}
      />
    </EscudoLayoutShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id}>
      <span className="text-sm font-medium">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm"
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ItemIcon({ tipo }: { tipo: ItemTipo }) {
  const className = "h-5 w-5 text-primary";

  if (tipo === "ARMA") return <Sword className={className} />;
  if (tipo === "CONSUMIVEL") return <FlaskConical className={className} />;
  if (tipo === "MAGICO") return <Sparkles className={className} />;
  if (tipo === "MATERIAL") return <Hammer className={className} />;
  if (tipo === "EQUIPAMENTO") return <Shield className={className} />;

  return <Package className={className} />;
}
