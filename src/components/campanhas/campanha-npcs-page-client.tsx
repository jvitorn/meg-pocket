"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Briefcase,
  Dice5,
  Edit3,
  Eye,
  MessageCircle,
  RefreshCw,
  Save,
  ScrollText,
  Shield,
  Sparkles,
  Target,
  Trash2,
  UserRoundPlus,
  Users,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CampanhaSectionHeader } from "@/components/campanhas/campanha-section-header";
import { EscudoLayoutShell } from "@/components/campanhas/escudo-layout-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  excluirNpcCampanha,
  gerarNpcCampanha,
  refinarNarrativaNpcCampanha,
  salvarNpcCampanha,
} from "@/services/campanhaApiService";
import type {
  CampanhaInfo,
  CampaignNpcItem as CampanhaNpcItem,
  CampaignNpcPayload,
  NpcEstiloNarrativoOption,
} from "@/types/campanha";

type CatalogOption = {
  id: number;
  nome: string;
};

type NpcForm = {
  nome: string;
  racaId: string;
  racaNome: string;
  genero: string;
  classeId: string;
  classeNome: string;
  profissao: string;
  importancia: string;
  tom: string;
  personalidade: string;
  aparencia: string;
  segredo: string;
  objetivoCampanha: string;
  gancho: string;
  frase: string;
  relacaoComGrupo: string;
  detalheVisual: string;
  descricao: string;
  dadosJson?: unknown;
};

type Props = {
  campanha: CampanhaInfo;
  npcs: CampanhaNpcItem[];
  racas: CatalogOption[];
  classes: CatalogOption[];
  estilosNarrativos: NpcEstiloNarrativoOption[];
  limite: number;
  personagensCount: number;
  inventarioCount: number;
  combatesCount?: number;
};

const EMPTY_FORM: NpcForm = {
  nome: "",
  racaId: "",
  racaNome: "",
  genero: "",
  classeId: "",
  classeNome: "",
  profissao: "",
  importancia: "",
  tom: "",
  personalidade: "",
  aparencia: "",
  segredo: "",
  objetivoCampanha: "",
  gancho: "",
  frase: "",
  relacaoComGrupo: "",
  detalheVisual: "",
  descricao: "",
};

const GENEROS = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "neutro", label: "Neutro" },
];

const TONS = [
  { value: "classico", label: "Clássico" },
  { value: "simples", label: "Simples" },
  { value: "sombrio", label: "Sombrio" },
  { value: "heroico", label: "Heroico" },
  { value: "mistico", label: "Místico" },
];

const IMPORTANCIAS = [
  { value: "figurante", label: "Figurante" },
  { value: "contato", label: "Contato" },
  { value: "aliado", label: "Aliado" },
  { value: "rival", label: "Rival" },
  { value: "vilao", label: "Vilão" },
];

const npcTabTriggerClass =
  "min-h-10 justify-start gap-2 rounded-md border border-transparent bg-transparent px-3 text-muted-foreground hover:border-amber-400/25 hover:bg-amber-400/10 hover:text-foreground data-[state=active]:border-amber-400/45 data-[state=active]:bg-amber-400/12 data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_-2px_0_rgba(251,191,36,0.85)] xl:data-[state=active]:shadow-[inset_3px_0_0_rgba(251,191,36,0.85)]";

const rpgFrameClipPath =
  "polygon(22px 0, calc(100% - 22px) 0, 100% 18px, calc(100% - 10px) 50%, 100% calc(100% - 18px), calc(100% - 22px) 100%, 22px 100%, 0 calc(100% - 18px), 10px 50%, 0 18px)";

const rpgSmallClipPath =
  "polygon(15px 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 15px 100%, 0 50%)";

export function CampanhaNpcsPageClient({
  campanha,
  npcs,
  racas,
  classes,
  estilosNarrativos,
  limite,
  personagensCount,
  inventarioCount,
  combatesCount = 0,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<NpcForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(
    estilosNarrativos[0]?.chave ?? "classico"
  );
  const [loading, setLoading] = useState(false);

  const remainingSlots = Math.max(limite - npcs.length, 0);
  const hasDraft = Boolean(form.nome || form.objetivoCampanha || form.descricao);
  const saveDisabled =
    loading ||
    !form.nome.trim() ||
    !form.racaId ||
    !form.genero ||
    !form.objetivoCampanha.trim() ||
    (!editingId && remainingSlots <= 0);

  const selectedNpc = useMemo(
    () => npcs.find((npc) => npc.id === editingId) ?? null,
    [editingId, npcs]
  );
  const profileTags = [
    form.racaNome,
    form.profissao || form.classeNome,
    optionLabel(GENEROS, form.genero),
    optionLabel(IMPORTANCIAS, form.importancia),
    optionLabel(TONS, form.tom),
  ].filter(Boolean);

  useEffect(() => {
    const npcId = Number(new URLSearchParams(window.location.search).get("npc"));
    const npc = npcs.find((item) => item.id === npcId);
    if (npc) {
      editNpc(npc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setFormField<K extends keyof NpcForm>(key: K, value: NpcForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startManual() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsEditing(true);
  }

  function editNpc(npc: CampanhaNpcItem) {
    setEditingId(npc.id);
    setForm(formFromNpc(npc));
    setIsEditing(false);
  }

  async function generateNpc() {
    setLoading(true);

    try {
      const data = await gerarNpcCampanha(
        campanha.id,
        cleanPayload(generationFiltersFromForm(form))
      );
      setEditingId(null);
      setForm(formFromNpc(data.npc));
      setIsEditing(false);
      toast.success("NPC gerado para revisão.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar NPC.");
    } finally {
      setLoading(false);
    }
  }

  async function refineNarrative() {
    setLoading(true);

    try {
      const data = await refinarNarrativaNpcCampanha(
        campanha.id,
        payloadFromForm(form),
        selectedStyle
      );
      setFormField("descricao", data.descricao);
      toast.success("Narrativa refinada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao refinar narrativa."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveNpc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await salvarNpcCampanha(campanha.id, payloadFromForm(form), editingId);
      toast.success(editingId ? "NPC atualizado." : "NPC salvo na campanha.");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar NPC.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteNpc() {
    if (!editingId || !selectedNpc || !window.confirm(`Excluir ${selectedNpc.nome}?`)) {
      return;
    }

    setLoading(true);

    try {
      await excluirNpcCampanha(campanha.id, editingId);
      setEditingId(null);
      setForm(EMPTY_FORM);
      toast.success("NPC excluído.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir NPC.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <EscudoLayoutShell
      campanha={campanha}
      activeSection="npcs"
      currentLabel="NPCs"
      personagensCount={personagensCount}
      inventarioCount={inventarioCount}
      npcsCount={npcs.length}
      combatesCount={combatesCount}
    >
      <div className="mx-auto flex w-full max-w-384 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-lg border bg-card/70">
          <CampanhaSectionHeader
            icon={UserRoundPlus}
            eyebrow="Elenco da campanha"
            title="NPCs"
            description="Rostos recorrentes, vínculos e ganchos prontos para a mesa."
            tone="emerald"
            meta={`${npcs.length}/${limite} salvos · ${remainingSlots} ${
              remainingSlots === 1 ? "vaga restante" : "vagas restantes"
            }`}
            actions={
              <Button
                type="button"
                variant="outline"
                className="gap-2 bg-white text-zinc-950 hover:bg-white/90"
                onClick={startManual}
                disabled={loading}
              >
                <Edit3 className="h-4 w-4" />
                Novo NPC
              </Button>
            }
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="hidden space-y-4 lg:sticky lg:top-20 lg:block lg:max-h-[calc(100svh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
            <div className="rounded-lg border bg-card/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Salvos
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {npcs.length}/{limite}
                  </p>
                </div>
                <Button type="button" size="sm" onClick={startManual}>
                  Novo
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {remainingSlots}{" "}
                {remainingSlots === 1 ? "vaga restante" : "vagas restantes"}
              </p>
            </div>

            <div className="grid gap-2">
              {npcs.map((npc) => (
                <SavedNpcButton
                  key={npc.id}
                  npc={npc}
                  selected={editingId === npc.id}
                  onClick={() => editNpc(npc)}
                />
              ))}
              {npcs.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Nenhum NPC salvo.
                </p>
              ) : null}
            </div>
          </aside>

          <details className="group overflow-hidden rounded-lg border bg-card/80 lg:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium marker:hidden">
              NPCs salvos
              <span className="text-xs text-muted-foreground group-open:hidden">
                {npcs.length}/{limite}
              </span>
              <span className="hidden text-xs text-muted-foreground group-open:inline">
                Recolher
              </span>
            </summary>
            <div className="grid max-h-80 gap-2 overflow-y-auto border-t p-3">
              {npcs.map((npc) => (
                <SavedNpcButton
                  key={npc.id}
                  npc={npc}
                  selected={editingId === npc.id}
                  onClick={() => editNpc(npc)}
                />
              ))}
              {npcs.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Nenhum NPC salvo.
                </p>
              ) : null}
            </div>
          </details>

          <form onSubmit={saveNpc} className="lg:col-start-2 lg:row-start-1">
            <section className="overflow-hidden rounded-lg border bg-card/90">
              <div className="relative overflow-hidden border-b bg-linear-to-br from-zinc-950 via-emerald-950 to-indigo-950 p-5 text-white sm:p-6">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.05)_1px,transparent_1px)] opacity-35 bg-size-[28px_28px]" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-amber-200/50 to-transparent" />
                <div className="relative grid gap-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-end">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-2xl shadow-black/40 backdrop-blur sm:h-32 sm:w-32">
                    <UserRoundPlus className="h-14 w-14 text-emerald-100 sm:h-16 sm:w-16" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.26em] text-white/60">
                      {editingId ? "NPC salvo" : hasDraft ? "Rascunho" : "Nova ficha"}
                    </p>
                    {isEditing ? (
                      <Input
                        id="npc-nome"
                        aria-label="Nome"
                        value={form.nome}
                        onChange={(event) => setFormField("nome", event.target.value)}
                        placeholder="Nome do NPC"
                        className="mt-3 h-11 border-white/20 bg-white/10 text-xl font-semibold text-white placeholder:text-white/45 focus-visible:ring-white/40 sm:text-2xl"
                      />
                    ) : (
                      <h2 className="mt-2 wrap-break-word text-2xl font-black uppercase tracking-[0.08em] sm:text-3xl">
                        {form.nome || "Novo NPC"}
                      </h2>
                    )}
                    <p className="mt-2 min-h-5 text-sm text-white/70">
                      {form.profissao || form.classeNome || form.racaNome || "Ficha sem identidade definida"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profileTags.length > 0 ? (
                        profileTags.map((tag) => (
                          <span
                            key={String(tag)}
                            className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-white/80"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-white/55">
                          Sem marcadores
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <h2 className="text-lg font-semibold">Ficha do NPC</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isEditing ? "Modo edição" : "Modo leitura"}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="submit"
                    className="gap-2"
                    disabled={saveDisabled}
                  >
                    <Save className="h-4 w-4" />
                    Salvar
                  </Button>
                  <Button
                    type="button"
                    variant={isEditing ? "secondary" : "outline"}
                    className="gap-2"
                    onClick={() => setIsEditing((current) => !current)}
                    disabled={loading}
                  >
                    {isEditing ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <Edit3 className="h-4 w-4" />
                    )}
                    {isEditing ? "Prévia" : "Editar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={generateNpc}
                    disabled={loading}
                  >
                    {hasDraft ? (
                      <RefreshCw className="h-4 w-4" />
                    ) : (
                      <Dice5 className="h-4 w-4" />
                    )}
                    Gerar NPC
                  </Button>
                  {editingId ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={deleteNpc}
                      disabled={loading}
                      aria-label="Excluir NPC"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>

              <Tabs
                defaultValue="perfil"
                orientation="vertical"
                className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[12rem_minmax(0,1fr)]"
              >
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-lg border border-amber-400/20 bg-card/75 p-2 shadow-sm sm:grid-cols-4 xl:flex xl:flex-col xl:items-stretch">
                  <TabsTrigger className={npcTabTriggerClass} value="perfil">
                    <UserRoundPlus className="h-4 w-4" />
                    Perfil
                  </TabsTrigger>
                  <TabsTrigger className={npcTabTriggerClass} value="motivacoes">
                    <Target className="h-4 w-4" />
                    Motivações
                  </TabsTrigger>
                  <TabsTrigger className={npcTabTriggerClass} value="cena">
                    <Eye className="h-4 w-4" />
                    Cena
                  </TabsTrigger>
                  <TabsTrigger className={npcTabTriggerClass} value="narrativa">
                    <ScrollText className="h-4 w-4" />
                    Narrativa
                  </TabsTrigger>
                </TabsList>

                <div className="min-w-0">
                  <TabsContent value="perfil">
                    <RpgFrame>
                      {isEditing ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <SelectField
                            id="npc-raca"
                            label="Raça"
                            value={form.racaId}
                            onChange={(value) => {
                              const raca = racas.find((item) => String(item.id) === value);
                              setForm((current) => ({
                                ...current,
                                racaId: value,
                                racaNome: raca?.nome ?? "",
                              }));
                            }}
                            options={racas.map((raca) => ({
                              value: String(raca.id),
                              label: raca.nome,
                            }))}
                            placeholder="Escolha a raça"
                          />
                          <SelectField
                            id="npc-genero"
                            label="Gênero"
                            value={form.genero}
                            onChange={(value) => setFormField("genero", value)}
                            options={GENEROS}
                            placeholder="Escolha o gênero"
                          />
                          <SelectField
                            id="npc-classe"
                            label="Classe"
                            value={form.classeId}
                            onChange={(value) => {
                              const classe = classes.find((item) => String(item.id) === value);
                              setForm((current) => ({
                                ...current,
                                classeId: value,
                                classeNome: classe?.nome ?? "",
                              }));
                            }}
                            options={classes.map((classe) => ({
                              value: String(classe.id),
                              label: classe.nome,
                            }))}
                            placeholder="Sem classe"
                          />
                          <InputField
                            id="npc-profissao"
                            label="Profissão"
                            value={form.profissao}
                            onChange={(value) => setFormField("profissao", value)}
                          />
                          <SelectField
                            id="npc-importancia"
                            label="Importância"
                            value={form.importancia}
                            onChange={(value) => setFormField("importancia", value)}
                            options={IMPORTANCIAS}
                            placeholder="Sem marcador"
                          />
                          <SelectField
                            id="npc-tom"
                            label="Tom"
                            value={form.tom}
                            onChange={(value) => setFormField("tom", value)}
                            options={TONS}
                            placeholder="Sem marcador"
                          />
                        </div>
                      ) : (
                        <ProfileReadout
                          rows={[
                            { label: "Nome", value: form.nome },
                            { label: "Raça", value: form.racaNome },
                            { label: "Gênero", value: optionLabel(GENEROS, form.genero) },
                            { label: "Classe", value: form.classeNome || "Sem classe" },
                            { label: "Profissão", value: form.profissao },
                            {
                              label: "Importância",
                              value: optionLabel(IMPORTANCIAS, form.importancia),
                            },
                            { label: "Tom", value: optionLabel(TONS, form.tom) },
                          ]}
                        />
                      )}
                    </RpgFrame>
                  </TabsContent>

                  <TabsContent value="motivacoes">
                    <RpgFrame>
                      {isEditing ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <TextareaField
                            id="npc-objetivo"
                            label="Objetivo na campanha"
                            value={form.objetivoCampanha}
                            onChange={(value) => setFormField("objetivoCampanha", value)}
                            rows={4}
                          />
                          <TextareaField
                            id="npc-personalidade"
                            label="Personalidade"
                            value={form.personalidade}
                            onChange={(value) => setFormField("personalidade", value)}
                            rows={4}
                          />
                          <TextareaField
                            id="npc-segredo"
                            label="Segredo"
                            value={form.segredo}
                            onChange={(value) => setFormField("segredo", value)}
                            rows={4}
                          />
                          <TextareaField
                            id="npc-gancho"
                            label="Gancho"
                            value={form.gancho}
                            onChange={(value) => setFormField("gancho", value)}
                            rows={4}
                          />
                        </div>
                      ) : (
                        <TextReadout
                          items={[
                            {
                              icon: Target,
                              label: "Objetivo na campanha",
                              value: form.objetivoCampanha,
                            },
                            {
                              icon: Sparkles,
                              label: "Personalidade",
                              value: form.personalidade,
                            },
                            { icon: Shield, label: "Segredo", value: form.segredo },
                            { icon: BookOpen, label: "Gancho", value: form.gancho },
                          ]}
                        />
                      )}
                    </RpgFrame>
                  </TabsContent>

                  <TabsContent value="cena">
                    <RpgFrame>
                      {isEditing ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <TextareaField
                            id="npc-aparencia"
                            label="Aparência"
                            value={form.aparencia}
                            onChange={(value) => setFormField("aparencia", value)}
                            rows={4}
                          />
                          <TextareaField
                            id="npc-detalhe"
                            label="Detalhe visual"
                            value={form.detalheVisual}
                            onChange={(value) => setFormField("detalheVisual", value)}
                            rows={4}
                          />
                          <TextareaField
                            id="npc-relacao"
                            label="Relação com o grupo"
                            value={form.relacaoComGrupo}
                            onChange={(value) => setFormField("relacaoComGrupo", value)}
                            rows={4}
                          />
                          <InputField
                            id="npc-frase"
                            label="Frase"
                            value={form.frase}
                            onChange={(value) => setFormField("frase", value)}
                          />
                        </div>
                      ) : (
                        <TextReadout
                          items={[
                            { icon: Eye, label: "Aparência", value: form.aparencia },
                            {
                              icon: Briefcase,
                              label: "Detalhe visual",
                              value: form.detalheVisual,
                            },
                            {
                              icon: Users,
                              label: "Relação com o grupo",
                              value: form.relacaoComGrupo,
                            },
                            {
                              icon: MessageCircle,
                              label: "Frase",
                              value: form.frase ? `“${form.frase}”` : "",
                            },
                          ]}
                        />
                      )}
                    </RpgFrame>
                  </TabsContent>

                  <TabsContent value="narrativa">
                    <RpgFrame>
                      <div className="grid gap-4">
                        <div className="flex flex-col gap-3 rounded-lg border bg-background/70 p-4 sm:flex-row sm:items-end">
                          <SelectField
                            id="npc-estilo"
                            label="Estilo narrativo"
                            value={selectedStyle}
                            onChange={setSelectedStyle}
                            options={estilosNarrativos.map((estilo) => ({
                              value: estilo.chave,
                              label: estilo.nome,
                            }))}
                            placeholder="Estilo"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={refineNarrative}
                            disabled={loading || estilosNarrativos.length === 0}
                          >
                            <WandSparkles className="h-4 w-4" />
                            Refinar
                          </Button>
                        </div>
                        {isEditing ? (
                          <TextareaField
                            id="npc-descricao"
                            label="Descrição final"
                            value={form.descricao}
                            onChange={(value) => setFormField("descricao", value)}
                            rows={10}
                          />
                        ) : (
                          <LongTextReadout
                            title="Descrição final"
                            value={form.descricao || form.objetivoCampanha}
                          />
                        )}
                      </div>
                    </RpgFrame>
                  </TabsContent>
                </div>
              </Tabs>
            </section>
          </form>
        </section>
      </div>
    </EscudoLayoutShell>
  );
}

function RpgFrame({
  children,
  className,
  innerClassName,
  compact = false,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  compact?: boolean;
}) {
  const clipPath = compact ? rpgSmallClipPath : rpgFrameClipPath;
  const clipStyle = { clipPath } satisfies CSSProperties;

  return (
    <div
      className={cn(
        "relative isolate overflow-visible bg-[linear-gradient(135deg,#7c2d12_0%,#f97316_14%,#facc15_28%,#9a3412_48%,#fed7aa_56%,#b45309_74%,#7c2d12_100%)] p-0.75 shadow-[0_12px_30px_rgba(124,45,18,0.18),0_0_0_1px_rgba(254,240,138,0.35)]",
        compact ? "my-1" : "my-2",
        className
      )}
      style={clipStyle}
    >
      <div
        aria-hidden="true"
        className="absolute inset-1.25 z-0 border border-amber-200/60 shadow-[inset_0_0_14px_rgba(251,191,36,0.18)]"
        style={clipStyle}
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-amber-100 bg-emerald-500 shadow-[0_0_0_2px_rgba(154,52,18,0.75),0_0_14px_rgba(16,185,129,0.55)]"
      />
      {!compact ? (
        <>
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-1/2 z-20 h-4 w-4 -translate-x-1/2 translate-y-1/2 rotate-45 border border-amber-100 bg-red-500 shadow-[0_0_0_2px_rgba(154,52,18,0.75),0_0_14px_rgba(239,68,68,0.45)]"
          />
          <span
            aria-hidden="true"
            className="absolute left-1 top-1/2 z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-amber-100 bg-orange-600 shadow-[0_0_0_2px_rgba(124,45,18,0.75)]"
          />
          <span
            aria-hidden="true"
            className="absolute right-1 top-1/2 z-20 h-3 w-3 -translate-y-1/2 translate-x-1/2 rotate-45 border border-amber-100 bg-orange-600 shadow-[0_0_0_2px_rgba(124,45,18,0.75)]"
          />
        </>
      ) : null}
      <div
        className={cn(
          "relative z-10 bg-card/95 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-8px_18px_rgba(120,53,15,0.08)] sm:p-4",
          innerClassName
        )}
        style={clipStyle}
      >
        {children}
      </div>
    </div>
  );
}

function SavedNpcButton({
  npc,
  selected,
  onClick,
}: {
  npc: CampanhaNpcItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group overflow-hidden rounded-lg border p-3 text-left transition hover:border-primary/40",
        selected ? "border-primary/60 bg-primary/10" : "bg-card/70"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background">
          <UserRoundPlus className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{npc.nome}</p>
          <p className="truncate text-xs text-muted-foreground">
            {npc.racaNome}
            {npc.profissao ? ` · ${npc.profissao}` : ""}
          </p>
        </div>
      </div>
    </button>
  );
}

function InputField({
  id,
  label,
  value,
  onChange,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label htmlFor={id} className={cn("block", className)}>
      <span className="text-sm font-medium">{label}</span>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2"
      />
    </label>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label htmlFor={id} className={cn("block", className)}>
      <span className="text-sm font-medium">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextareaField({
  id,
  label,
  value,
  onChange,
  rows = 3,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <label htmlFor={id} className={cn("block", className)}>
      <span className="text-sm font-medium">{label}</span>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
    </label>
  );
}

function ProfileReadout({
  rows,
}: {
  rows: Array<{ label: string; value?: ReactNode }>;
}) {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {rows.map((row) => (
        <ProfileField key={row.label} label={row.label} value={row.value} />
      ))}
    </div>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value?: ReactNode;
}) {
  return (
    <NpcContentCard className="min-h-28 p-4">
      <NpcCardHeader label={label} />
      <p className="mt-4 min-w-0 wrap-break-word text-base font-semibold leading-6 text-foreground">
        {valueOrFallback(value)}
      </p>
    </NpcContentCard>
  );
}

function NpcContentCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-background/75 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function NpcIconBadge({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted/50 text-primary">
      {children}
    </span>
  );
}

function NpcDiamond() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted/50">
      <span className="h-3.5 w-3.5 rotate-45 border border-primary/70 bg-primary/10 shadow-[0_0_14px_rgba(147,51,234,0.18)]" />
    </span>
  );
}

function NpcCardHeader({
  icon: Icon,
  label,
}: {
  icon?: LucideIcon;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      {Icon ? (
        <NpcIconBadge>
          <Icon className="h-4 w-4" />
        </NpcIconBadge>
      ) : (
        <NpcDiamond />
      )}
      {label}
    </div>
  );
}

function TextReadout({
  items,
}: {
  items: Array<{ icon: LucideIcon; label: string; value?: ReactNode }>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <TextBlock
          key={item.label}
          icon={item.icon}
          label={item.label}
          value={item.value}
        />
      ))}
    </div>
  );
}

function TextBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: ReactNode;
}) {
  return (
    <NpcContentCard className="min-h-32 p-4">
      <NpcCardHeader icon={Icon} label={label} />
      <p className="mt-3 whitespace-pre-line wrap-break-word text-sm leading-6 text-muted-foreground">
        {valueOrFallback(value)}
      </p>
    </NpcContentCard>
  );
}

function LongTextReadout({
  title,
  value,
}: {
  title: string;
  value?: ReactNode;
}) {
  return (
    <NpcContentCard className="p-4 sm:p-5">
      <NpcCardHeader label={title} />
      <p className="mt-3 whitespace-pre-line wrap-break-word text-sm leading-7 text-muted-foreground">
        {valueOrFallback(value)}
      </p>
    </NpcContentCard>
  );
}

function formFromNpc(npc: Partial<CampanhaNpcItem>): NpcForm {
  return {
    nome: npc.nome ?? "",
    racaId: npc.racaId ? String(npc.racaId) : "",
    racaNome: npc.racaNome ?? "",
    genero: npc.genero ?? "neutro",
    classeId: npc.classeId ? String(npc.classeId) : "",
    classeNome: npc.classeNome ?? "",
    profissao: npc.profissao ?? "",
    importancia: npc.importancia ?? "",
    tom: npc.tom ?? "classico",
    personalidade: npc.personalidade ?? "",
    aparencia: npc.aparencia ?? "",
    segredo: npc.segredo ?? "",
    objetivoCampanha: npc.objetivoCampanha ?? "",
    gancho: npc.gancho ?? "",
    frase: npc.frase ?? "",
    relacaoComGrupo: npc.relacaoComGrupo ?? "",
    detalheVisual: npc.detalheVisual ?? "",
    descricao: npc.descricao ?? "",
    dadosJson: npc.dadosJson,
  };
}

function payloadFromForm(form: NpcForm): CampaignNpcPayload {
  return {
    nome: form.nome,
    racaId: form.racaId ? Number(form.racaId) : null,
    genero: form.genero,
    classeId: form.classeId ? Number(form.classeId) : null,
    profissao: form.profissao,
    importancia: form.importancia,
    tom: form.tom,
    personalidade: form.personalidade,
    aparencia: form.aparencia,
    segredo: form.segredo,
    objetivoCampanha: form.objetivoCampanha,
    gancho: form.gancho,
    frase: form.frase,
    relacaoComGrupo: form.relacaoComGrupo,
    detalheVisual: form.detalheVisual,
    descricao: form.descricao,
    dadosJson: form.dadosJson,
  };
}

function generationFiltersFromForm(form: NpcForm) {
  return {
    racaId: form.racaId,
    genero: form.genero,
    classeId: form.classeId,
    profissao: form.profissao,
    importancia: form.importancia,
    tom: form.tom,
  };
}

function cleanPayload<T extends Record<string, string>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value.trim())
  );
}

function optionLabel(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? "";
}

function valueOrFallback(value?: ReactNode) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return value || <span className="font-normal text-muted-foreground/70">A definir</span>;
}
