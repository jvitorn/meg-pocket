"use client";

import { useMemo, useState, type ComponentType, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  BookOpenText,
  Boxes,
  ClipboardList,
  LogOut,
  Save,
  Search,
  Shield,
  ShieldAlert,
  Skull,
  Swords,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  CampanhaInfoDialog,
  normalizeCampanhaTags,
  type CampanhaInfoValues,
} from "@/components/campanhas/campanha-info-dialog";
import { CampanhaSectionHeader } from "@/components/campanhas/campanha-section-header";
import { CampanhaNpcsSection } from "@/components/campanhas/campanha-npcs-section";
import { Button } from "@/components/ui/button";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { AppSidebar } from "@/components/app-sidebar";
import {
  atualizarCampanha,
  vincularItemCampanha,
} from "@/services/campanhaApiService";
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
import type {
  CampaignCatalogItem,
  CampaignEditItem,
  CampaignInventoryCharacter,
  CampaignNpcItem,
  NpcEstiloNarrativoOption,
  ItemTipo,
} from "@/types";

const ITEM_TIPO_LABEL: Record<ItemTipo, string> = {
  ARMA: "Arma",
  CONSUMIVEL: "Consumível",
  MAGICO: "Mágico",
  MATERIAL: "Material",
  EQUIPAMENTO: "Equipamento",
};

type Props = {
  campanha: CampaignEditItem;
  personagens: CampaignInventoryCharacter[];
  catalogoItens: CampaignCatalogItem[];
  npcs?: CampaignNpcItem[];
  racas?: Array<{ id: number; nome: string }>;
  classes?: Array<{ id: number; nome: string }>;
  estilosNarrativos?: NpcEstiloNarrativoOption[];
  npcLimit?: number;
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
  npcs = [],
  racas = [],
  classes = [],
  estilosNarrativos = [],
  npcLimit = 50,
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

  async function handleSaveCampaign(values: CampanhaInfoValues) {
    setLoading(true);

    try {
      await atualizarCampanha(campanha.id, {
        nome: values.nome,
        mestre: values.mestre,
        capa: values.capa,
        sinopse: values.sinopse,
        tags: normalizeCampanhaTags(values.tags),
      });
      router.refresh();
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
      setItemDialogOpen(false);
      toast.success("Item incluído no inventário com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao vincular item.");
    } finally {
      setLoading(false);
    }
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
        activeSection="escudo"
        personagensCount={personagens.length}
        inventarioCount={totalItens}
        npcsCount={npcs.length}
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
                { label: "Escudo do mestre" },
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
                Escudo do mestre
              </p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">
                {campanha.nome}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {campanha.sinopse ||
                  "A campanha ainda não tem sinopse. Defina o tom inicial e deixe a mesa pronta para aventura."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild className="gap-2">
                  <a href={`/campanhas/escudo/${campanha.id}/inventario`}>
                    <Boxes className="h-4 w-4" />
                    Abrir inventário
                  </a>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <a href={`/campanhas/escudo/${campanha.id}/npcs`}>
                    <Users className="h-4 w-4" />
                    Abrir NPCs
                  </a>
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

      <section className="grid gap-3 sm:gap-4 md:grid-cols-4">
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
        <div className="rounded-lg border bg-card/70 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            NPCs
          </p>
          <p className="mt-2 text-xl font-semibold">{npcs.length}</p>
        </div>
      </section>

      <section className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <section
          id="jogadores"
          className="scroll-mt-24 overflow-hidden rounded-lg border bg-card/70"
        >
          <CampanhaSectionHeader
            icon={Users}
            eyebrow="Mesa"
            title="Jogadores da campanha"
            description="Participantes vinculados e suas fichas ativas nesta campanha."
            tone="sky"
            meta={`${personagens.length} ${
              personagens.length === 1 ? "jogador" : "jogadores"
            }`}
          />
          <div className="grid gap-3 p-4 sm:p-5">
            {personagens.map((personagem) => (
              <div
                key={personagem.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-background/70 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{personagem.jogador}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Personagem: {personagem.nome}
                  </p>
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

        <section
          id="inventario"
          className="scroll-mt-24 overflow-hidden rounded-lg border bg-card/70"
        >
          <CampanhaSectionHeader
            icon={Boxes}
            eyebrow="Arsenal"
            title="Inventário da campanha"
            description="Resumo por jogador. A organização completa fica na tela de inventário."
            tone="amber"
            meta={`${totalItens} item${totalItens !== 1 ? "s" : ""} · ${itensExpirados} expirado${
              itensExpirados !== 1 ? "s" : ""
            }`}
            actions={
              <Button
                asChild
                size="sm"
                className="gap-2 bg-white text-zinc-950 hover:bg-white/90"
              >
                <a href={`/campanhas/escudo/${campanha.id}/inventario`}>
                  <Boxes className="h-4 w-4" />
                  Abrir inventário
                </a>
              </Button>
            }
          />

          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            {personagens.map((personagem) => (
              <a
                key={personagem.id}
                href={`/campanhas/escudo/${campanha.id}/inventario#personagem-${personagem.id}`}
                className="group relative overflow-hidden rounded-lg border bg-background/70 p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="absolute inset-0 bg-linear-to-br from-amber-500/10 via-transparent to-sky-500/10 opacity-70 transition group-hover:opacity-100" />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{personagem.jogador}</h3>
                    <p className="truncate text-xs text-muted-foreground">
                      Personagem: {personagem.nome}
                    </p>
                  </div>
                  <span className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                    {personagem.inventario.length} item
                    {personagem.inventario.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="relative mt-4 flex flex-wrap gap-2">
                  {personagem.inventario.slice(0, 4).map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full border bg-card/80 px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      {item.nome} · {ITEM_TIPO_LABEL[item.tipo]}
                    </span>
                  ))}
                  {personagem.inventario.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      Nenhum item vinculado a este personagem.
                    </span>
                  ) : null}
                  {personagem.inventario.length > 4 ? (
                    <span className="rounded-full border bg-card/80 px-2.5 py-1 text-[11px] text-muted-foreground">
                      +{personagem.inventario.length - 4}
                    </span>
                  ) : null}
                </div>
              </a>
            ))}
          </div>
        </section>
      </section>

      <CampanhaNpcsSection
        campanhaId={campanha.id}
        npcs={npcs}
        racas={racas}
        classes={classes}
        estilosNarrativos={estilosNarrativos}
        limite={npcLimit}
      />

      <section
        id="bestiario"
        className="scroll-mt-24 overflow-hidden rounded-lg border bg-card/70"
      >
        <CampanhaSectionHeader
          icon={Skull}
          eyebrow="Bestiário"
          title="Ameaças para a mesa"
          description="Consulte fichas prontas, variações por função e detalhes de combate sem sair do fluxo de preparação."
          tone="violet"
          meta="Catálogo público de ameaças"
          actions={
            <Button
              asChild
              size="sm"
              className="gap-2 bg-white text-zinc-950 hover:bg-white/90"
            >
              <Link href="/ameacas">
                <ArrowUpRight className="h-4 w-4" />
                Abrir ameaças
              </Link>
            </Button>
          }
        />
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Link
            href="/ameacas"
            className="group relative overflow-hidden rounded-lg border bg-background/75 p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <div className="absolute inset-0 bg-linear-to-br from-violet-500/10 via-transparent to-emerald-500/10 opacity-80 transition group-hover:opacity-100" />
            <div className="relative flex min-h-40 flex-col justify-between gap-6">
              <div className="max-w-2xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-card shadow-sm">
                  <BookOpenText className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">Arquivo de ameaças</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Abra a biblioteca pública para buscar por nome, tipo, elemento e
                  VA, com páginas de detalhe prontas para consulta em sessão.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                Ver catálogo completo
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <BestiaryFeatureCard
              icon={Search}
              title="Busca rápida"
              text="Filtre por nome, tipo e elemento quando a mesa precisar de uma ameaça em poucos segundos."
            />
            <BestiaryFeatureCard
              icon={ShieldAlert}
              title="Leitura de risco"
              text="Use VA, defesa, PV e reações para comparar encontros antes de puxar a ficha completa."
            />
            <BestiaryFeatureCard
              icon={Swords}
              title="Detalhe de combate"
              text="Golpes, dano, custos e narrativa ficam organizados na tela de detalhe da ameaça."
            />
          </div>
        </div>
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

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function BestiaryFeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border bg-background/70 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-card">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
