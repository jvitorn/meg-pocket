"use client";

import { useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Boxes,
  ClipboardList,
  Drama,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  Send,
  Shield,
  Skull,
  Swords,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  CampanhaInfoDialog,
  normalizeCampanhaTags,
  type CampanhaInfoValues,
} from "@/components/campanhas/campanha-info-dialog";
import { Button } from "@/components/ui/button";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { StatDrawer } from "@/components/stat-drawer";
import type { ItemTipo } from "@/types";

const ITEM_TIPO_LABEL: Record<ItemTipo, string> = {
  ARMA: "Arma",
  CONSUMIVEL: "Consumível",
  MAGICO: "Mágico",
  MATERIAL: "Material",
  EQUIPAMENTO: "Equipamento",
};

type CampaignEditItem = {
  id: number;
  nome: string;
  sinopse: string;
  mestre: string;
  capa: string;
  tags: string[];
};

type CatalogItem = {
  id: number;
  nome: string;
  tipo: ItemTipo;
  descricao: string | null;
  durabilidadeBase: number | null;
  durabilidadeMax: number | null;
};

type CampaignInventoryItem = {
  id: number;
  itemId: number;
  nome: string;
  tipo: ItemTipo;
  descricao: string | null;
  durabilidadeAtual: number | null;
  durabilidadeMax: number | null;
  quantidade: number;
  esgotado: boolean;
  observacoes: string;
};

type CampaignCharacter = {
  id: number;
  nome: string;
  jogador: string;
  inventario: CampaignInventoryItem[];
};

type Props = {
  campanha: CampaignEditItem;
  personagens: CampaignCharacter[];
  catalogoItens: CatalogItem[];
};

function clampDurability(value: string, max: number | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "";
  const normalized = Math.trunc(parsed);
  return String(max ? Math.min(normalized, max) : normalized);
}

export function CampanhaEditClient({
  campanha,
  personagens,
  catalogoItens,
}: Props) {
  const router = useRouter();
  const [infoOpen, setInfoOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
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
  const [recoveringItem, setRecoveringItem] =
    useState<(CampaignInventoryItem & { personagemNome: string }) | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCatalogItem = useMemo(
    () => catalogoItens.find((item) => String(item.id) === selectedItemId) ?? null,
    [catalogoItens, selectedItemId]
  );

  const inventario = useMemo(
    () =>
      personagens.flatMap((personagem) =>
        personagem.inventario.map((item) => ({
          ...item,
          personagemId: personagem.id,
          personagemNome: personagem.nome,
        }))
      ),
    [personagens]
  );

  const totalItens = inventario.reduce((total, item) => total + item.quantidade, 0);
  const itensExpirados = inventario.filter((item) => item.esgotado).length;

  async function mutate(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error ?? "Não foi possível salvar a alteração.");
    }

    router.refresh();
  }

  async function handleSaveCampaign(values: CampanhaInfoValues) {
    setLoading(true);

    try {
      await mutate(`/api/campanhas/${campanha.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: values.nome,
          mestre: values.mestre,
          capa: values.capa,
          sinopse: values.sinopse,
          tags: normalizeCampanhaTags(values.tags),
        }),
      });
      toast.success("Informações iniciais atualizadas.");
      setInfoOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await mutate(`/api/campanhas/${campanha.id}/inventario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      setObservacoes("");
      setAllowItemOverride(false);
      setDurabilidadeAtual("");
      setDurabilidadeMax("");
      setItemDialogOpen(false);
      toast.success("Item incluído no inventário com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao vincular item.");
    } finally {
      setLoading(false);
    }
  }

  async function updateInventoryItem(
    inventoryItemId: number,
    body: Record<string, unknown>,
    message: string
  ) {
    setLoading(true);

    try {
      await mutate(`/api/campanhas/${campanha.id}/inventario/${inventoryItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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
      await mutate(`/api/campanhas/${campanha.id}/inventario/${inventoryItemId}`, {
        method: "DELETE",
      });
      toast.success("Item expirado apagado do histórico.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao apagar item.");
    } finally {
      setLoading(false);
    }
  }

  function openRecoverDrawer(
    item: CampaignInventoryItem & { personagemNome: string }
  ) {
    setRecoveringItem(item);
  }

  const quickSections = [
    {
      title: "Escudo do mestre",
      text: "Referências rápidas, CDs, segredos e clima da sessão.",
      icon: Shield,
    },
    {
      title: "Criar combate",
      text: "Fila de iniciativa, turnos e estado dos inimigos.",
      icon: Swords,
    },
    {
      title: "Anotações",
      text: "Ganchos, consequências e decisões importantes.",
      icon: ClipboardList,
    },
    {
      title: "Criação de NPCs",
      text: "Aliados, rivais, vilões e rostos recorrentes.",
      icon: Drama,
    },
    {
      title: "Bestiário",
      text: "Criaturas preparadas para aparecer na mesa.",
      icon: Skull,
    },
    {
      title: "Crônicas",
      text: "Resumo de sessões e marcos da campanha.",
      icon: BookOpen,
    },
  ];

  return (
    <SidebarProvider>
      <AppSidebar
        campanha={{
          id: campanha.id,
          nome: campanha.nome,
          mestre: campanha.mestre,
        }}
        personagensCount={personagens.length}
        inventarioCount={totalItens}
        onAddItem={() => setItemDialogOpen(true)}
        onEditInfo={() => setInfoOpen(true)}
      />
      <SidebarInset className="bg-background text-foreground">
        <header className="sticky top-0 z-30 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <AppBreadcrumb
              className="mb-0 min-w-0"
              items={[
                { label: "Início", href: "/" },
                { label: "Dashboard", href: "/dashboard" },
                { label: "Editar campanha" },
              ]}
            />
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-2">
            <a href="/dashboard">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair do painel</span>
            </a>
          </Button>
        </header>

        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-2 py-6 sm:gap-8 sm:px-4 sm:py-8 lg:px-4">
      <section className="overflow-hidden rounded-xl border border-border/60 bg-card/70 shadow-sm sm:rounded-2xl">
        <div className="relative min-h-70">
          {campanha.capa ? (
            <Image
              src={campanha.capa}
              alt={`Capa da campanha ${campanha.nome}`}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-stone-900 via-zinc-800 to-emerald-950" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-black/20" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />
          <div className="relative flex min-h-70 flex-col justify-between gap-8 p-4 sm:p-8">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/85">
                Mesa do mestre
              </p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">
                {campanha.nome}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {campanha.sinopse ||
                  "A campanha ainda não tem sinopse. Defina o tom inicial e deixe a mesa pronta para aventura."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button type="button" className="gap-2" onClick={() => setItemDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Vincular item à ficha
                </Button>
                <Button type="button" variant="outline" className="gap-2" onClick={() => setInfoOpen(true)}>
                  <Save className="h-4 w-4" />
                  Editar informações iniciais
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card/70 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Mestre
          </p>
          <p className="mt-2 text-xl font-semibold">{campanha.mestre || "Não informado"}</p>
        </div>
        <div className="rounded-lg border bg-card/70 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Jogadores
          </p>
          <p className="mt-2 text-xl font-semibold">{personagens.length}</p>
        </div>
        <div className="rounded-lg border bg-card/70 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Inventário
          </p>
          <p className="mt-2 text-xl font-semibold">
            {totalItens} item{totalItens !== 1 ? "s" : ""} · {itensExpirados} expirado
            {itensExpirados !== 1 ? "s" : ""}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <section id="jogadores" className="scroll-mt-24 rounded-lg border bg-card/70 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Jogadores da campanha</h2>
          </div>
          <div className="mt-5 grid gap-3">
            {personagens.map((personagem) => (
              <div
                key={personagem.id}
                className="flex items-center justify-between gap-3 rounded-md border bg-background/70 px-3 py-3"
              >
                <div>
                  <p className="font-medium">{personagem.nome}</p>
                  <p className="text-xs text-muted-foreground">{personagem.jogador}</p>
                </div>
                <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                  {personagem.inventario.length} item
                  {personagem.inventario.length !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
            {personagens.length === 0 ? (
              <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
                Nenhum jogador vinculado a esta campanha ainda.
              </p>
            ) : null}
          </div>
        </section>

        <section id="inventario" className="-mx-2 scroll-mt-24 rounded-none border-y bg-card/70 p-3 sm:mx-0 sm:rounded-lg sm:border sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Inventário da campanha</h2>
            </div>
            <Button type="button" size="sm" className="w-full gap-2 sm:w-auto" onClick={() => setItemDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Vincular item
            </Button>
          </div>

          <div className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
            {personagens.map((personagem) => (
              <div key={personagem.id} className="rounded-md border bg-background/60 sm:rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-3 sm:px-4">
                  <div>
                    <h3 className="font-semibold">{personagem.nome}</h3>
                    <p className="text-xs text-muted-foreground">{personagem.jogador}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {personagem.inventario.length} registro
                    {personagem.inventario.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {personagem.inventario.length > 0 ? (
                  <div className="divide-y">
                    {personagem.inventario.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-3 px-3 py-4 sm:gap-4 sm:px-4 xl:grid-cols-[minmax(0,1.2fr)_0.7fr_0.9fr_auto]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{item.nome}</p>
                            <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                              {ITEM_TIPO_LABEL[item.tipo]}
                            </span>
                            {item.esgotado ? (
                              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700">
                                Expirado
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {item.descricao || item.observacoes || "Sem observações."}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs sm:max-w-xs xl:max-w-none">
                          <span>
                            Qtd.
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
                          </span>
                          <span>
                            Dur.
                            <p className="mt-1 rounded-md border px-2 py-1.5">
                              {item.durabilidadeAtual ?? "-"} / {item.durabilidadeMax ?? "-"}
                            </p>
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <select
                            id={`destino-${item.id}`}
                            className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm xl:min-w-32 xl:flex-none"
                            defaultValue=""
                            disabled={loading}
                          >
                            <option value="" disabled>
                              Destino
                            </option>
                            {personagens
                              .filter((destino) => destino.id !== personagem.id)
                              .map((destino) => (
                                <option key={destino.id} value={destino.id}>
                                  {destino.nome}
                                </option>
                              ))}
                          </select>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            disabled={loading}
                            onClick={() => {
                              const select = document.getElementById(
                                `destino-${item.id}`
                              ) as HTMLSelectElement | null;
                              if (!select?.value) return;
                              updateInventoryItem(
                                item.id,
                                {
                                  action: "transfer",
                                  targetPersonagemId: select.value,
                                },
                                "Item transferido."
                              );
                            }}
                            aria-label="Transferir item"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex justify-start gap-2 xl:justify-end">
                          {item.esgotado ? (
                            <>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                disabled={loading}
                                onClick={() =>
                                  openRecoverDrawer({
                                    ...item,
                                    personagemNome: personagem.nome,
                                  })
                                }
                                aria-label="Recuperar item"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="destructive"
                                disabled={loading}
                                onClick={() => deleteExpiredItem(item.id)}
                                aria-label="Apagar item expirado"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-6 text-sm text-muted-foreground sm:px-4">
                    Nenhum item vinculado a este personagem.
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </section>

      <section id="ferramentas" className="grid scroll-mt-24 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickSections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="rounded-lg border border-dashed bg-card/45 p-4 sm:p-5"
            >
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{section.text}</p>
            </div>
          );
        })}
      </section>

      {infoOpen ? (
        <CampanhaInfoDialog
          open={infoOpen}
          onOpenChange={setInfoOpen}
          title="Editar informações iniciais"
          description="Atualize o nome, mestre, capa, sinopse e tags principais da campanha."
          submitLabel="Salvar informações"
          loading={loading}
          initialValues={{
            nome: campanha.nome,
            mestre: campanha.mestre,
            capa: campanha.capa,
            sinopse: campanha.sinopse,
            tags: campanha.tags.join(", "),
          }}
          onSubmit={handleSaveCampaign}
        />
      ) : null}

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vincular item à ficha</DialogTitle>
            <DialogDescription>
              Selecione o personagem e confira os dados do item antes de incluir no inventário.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddItem} className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="personagem">Personagem</FieldLabel>
              <select
                id="personagem"
                value={selectedPersonagemId}
                onChange={(event) => setSelectedPersonagemId(event.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
                disabled={personagens.length === 0}
              >
                {personagens.map((personagem) => (
                  <option key={personagem.id} value={personagem.id}>
                    {personagem.nome}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="item">Item</FieldLabel>
              <select
                id="item"
                value={selectedItemId}
                onChange={(event) => {
                  setSelectedItemId(event.target.value);
                  setDurabilidadeAtual("");
                  setDurabilidadeMax("");
                }}
                className="h-9 rounded-md border bg-background px-3 text-sm"
                disabled={catalogoItens.length === 0}
              >
                {catalogoItens.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} ({ITEM_TIPO_LABEL[item.tipo]})
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="quantidade">Quantidade</FieldLabel>
              <Input
                id="quantidade"
                type="number"
                min="1"
                value={quantidade}
                onChange={(event) => setQuantidade(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="observacoes">Observações</FieldLabel>
              <Input
                id="observacoes"
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
              />
            </Field>

            <div className="rounded-lg border bg-background/70 p-4 sm:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {selectedCatalogItem?.nome ?? "Item não selecionado"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedCatalogItem?.descricao ?? "Sem descrição no catálogo."}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allowItemOverride}
                    onChange={(event) => setAllowItemOverride(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Editar valores deste inventário
                </label>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="durabilidade-max">Durabilidade max.</FieldLabel>
                  <Input
                    id="durabilidade-max"
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
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="durabilidade-atual">Durabilidade atual</FieldLabel>
                  <Input
                    id="durabilidade-atual"
                    type="number"
                    min="1"
                    max={
                      Number(durabilidadeMax) ||
                      selectedCatalogItem?.durabilidadeMax ||
                      selectedCatalogItem?.durabilidadeBase ||
                      undefined
                    }
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
                  />
                </Field>
              </div>
              <FieldDescription className="mt-3">
                A edição local altera apenas a durabilidade deste item no inventário.
              </FieldDescription>
            </div>

            <DialogFooter className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setItemDialogOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  !selectedPersonagemId ||
                  !selectedItemId ||
                  personagens.length === 0 ||
                  catalogoItens.length === 0
                }
              >
                Vincular item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
