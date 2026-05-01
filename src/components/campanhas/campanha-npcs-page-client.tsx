"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Dice5,
  Edit3,
  RefreshCw,
  Save,
  Trash2,
  UserRoundPlus,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  type CampanhaNpcItem,
  type NpcEstiloNarrativoOption,
} from "@/components/campanhas/campanha-npcs-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CatalogOption = {
  id: number;
  nome: string;
};

type CampanhaInfo = {
  id: number;
  nome: string;
  mestre: string;
  capa: string;
  sinopse: string;
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

type NpcFilters = {
  racaId: string;
  genero: string;
  classeId: string;
  profissao: string;
  importancia: string;
  tom: string;
};

type Props = {
  campanha: CampanhaInfo;
  npcs: CampanhaNpcItem[];
  racas: CatalogOption[];
  classes: CatalogOption[];
  estilosNarrativos: NpcEstiloNarrativoOption[];
  limite: number;
};

const EMPTY_FORM: NpcForm = {
  nome: "",
  racaId: "",
  racaNome: "",
  genero: "neutro",
  classeId: "",
  classeNome: "",
  profissao: "",
  importancia: "",
  tom: "classico",
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

const EMPTY_FILTERS: NpcFilters = {
  racaId: "",
  genero: "",
  classeId: "",
  profissao: "",
  importancia: "",
  tom: "",
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

export function CampanhaNpcsPageClient({
  campanha,
  npcs,
  racas,
  classes,
  estilosNarrativos,
  limite,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<NpcForm>(EMPTY_FORM);
  const [filters, setFilters] = useState<NpcFilters>(EMPTY_FILTERS);
  const [editingId, setEditingId] = useState<number | null>(null);
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

  function setFilterField<K extends keyof NpcFilters>(key: K, value: NpcFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function startManual() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function editNpc(npc: CampanhaNpcItem) {
    setEditingId(npc.id);
    setForm(formFromNpc(npc));
  }

  async function callApi<T>(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error ?? "Não foi possível concluir a ação.");
    }

    return data as T;
  }

  async function generateNpc() {
    setLoading(true);

    try {
      const data = await callApi<{ ok: true; npc: Partial<CampanhaNpcItem> }>(
        `/api/campanhas/${campanha.id}/npcs/gerar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filtros: cleanPayload(filters) }),
        }
      );
      setEditingId(null);
      setForm(formFromNpc(data.npc));
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
      const data = await callApi<{ ok: true; descricao: string }>(
        `/api/campanhas/${campanha.id}/npcs/refinar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            npc: payloadFromForm(form),
            estilo: selectedStyle,
          }),
        }
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
      await callApi(
        editingId
          ? `/api/campanhas/${campanha.id}/npcs/${editingId}`
          : `/api/campanhas/${campanha.id}/npcs`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadFromForm(form)),
        }
      );
      toast.success(editingId ? "NPC atualizado." : "NPC salvo na campanha.");
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
      await callApi(`/api/campanhas/${campanha.id}/npcs/${editingId}`, {
        method: "DELETE",
      });
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
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative isolate overflow-hidden border-b">
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
          <div className="absolute inset-0 bg-linear-to-br from-zinc-950 via-indigo-950 to-emerald-950" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-black/45" />
        <div className="relative mx-auto flex min-h-90 max-w-7xl flex-col justify-end px-4 py-8 sm:px-6 lg:px-8">
          <Button asChild variant="outline" size="sm" className="mb-8 w-fit gap-2">
            <a href={`/campanhas/escudo/${campanha.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Voltar ao escudo
            </a>
          </Button>
          <div className="max-w-4xl">
            <p className="text-xs uppercase tracking-[0.3em] text-primary">
              Elenco da campanha
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-[0.08em] sm:text-6xl">
              NPCs
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Crie rostos recorrentes para a mesa, gere variações sem salvar automaticamente e refine a narração usando apenas templates internos.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-4">
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
                Novo NPC
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {remainingSlots} {remainingSlots === 1 ? "vaga restante" : "vagas restantes"}
            </p>
          </div>

          <div className="grid gap-2">
            {npcs.map((npc) => (
              <button
                key={npc.id}
                type="button"
                onClick={() => editNpc(npc)}
                className={`group overflow-hidden rounded-lg border p-3 text-left transition hover:border-primary/40 ${
                  editingId === npc.id
                    ? "border-primary/60 bg-primary/10"
                    : "bg-card/70"
                }`}
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
            ))}
            {npcs.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Nenhum NPC salvo.
              </p>
            ) : null}
          </div>
        </aside>

        <form onSubmit={saveNpc} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <section className="rounded-lg border bg-card/80 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Novo NPC
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto justify-start gap-3 px-4 py-4 text-left"
                  onClick={startManual}
                  disabled={loading}
                >
                  <Edit3 className="h-5 w-5 text-primary" />
                  <span>
                    <span className="block font-semibold">Criar manualmente</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Formulário vazio para preencher e salvar.
                    </span>
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto justify-start gap-3 px-4 py-4 text-left"
                  onClick={generateNpc}
                  disabled={loading}
                >
                  <Dice5 className="h-5 w-5 text-primary" />
                  <span>
                    <span className="block font-semibold">
                      Gerar proceduralmente
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Usa filtros, banco e templates internos.
                    </span>
                  </span>
                </Button>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border bg-card/80">
              <div className="border-b p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Geração procedural</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Os filtros são opcionais. Gerar novamente não salva o NPC.
                    </p>
                  </div>
                  <Button type="button" className="gap-2" onClick={generateNpc} disabled={loading}>
                    {hasDraft ? (
                      <RefreshCw className="h-4 w-4" />
                    ) : (
                      <Dice5 className="h-4 w-4" />
                    )}
                    {hasDraft ? "Gerar novamente" : "Gerar NPC"}
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 p-4 sm:p-5">
                <BadgePicker
                  label="Raça"
                  value={filters.racaId}
                  onChange={(value) => setFilterField("racaId", value)}
                  options={racas.map((raca) => ({
                    value: String(raca.id),
                    label: raca.nome,
                  }))}
                  emptyLabel="Sortear raça"
                />
                <BadgePicker
                  label="Gênero"
                  value={filters.genero}
                  onChange={(value) => setFilterField("genero", value)}
                  options={GENEROS}
                  emptyLabel="Sortear gênero"
                />
                <BadgePicker
                  label="Classe"
                  value={filters.classeId}
                  onChange={(value) => setFilterField("classeId", value)}
                  options={classes.map((classe) => ({
                    value: String(classe.id),
                    label: classe.nome,
                  }))}
                  emptyLabel="Sem classe ou sortear"
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <InputField
                    id="npc-filtro-profissao"
                    label="Profissão"
                    value={filters.profissao}
                    onChange={(value) => setFilterField("profissao", value)}
                  />
                  <BadgePicker
                    label="Importância"
                    value={filters.importancia}
                    onChange={(value) => setFilterField("importancia", value)}
                    options={IMPORTANCIAS}
                    emptyLabel="Sortear"
                  />
                  <BadgePicker
                    label="Tom"
                    value={filters.tom}
                    onChange={(value) => setFilterField("tom", value)}
                    options={TONS}
                    emptyLabel="Sortear"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-lg border bg-card/80 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Ficha do NPC</h2>
                {editingId ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={deleteNpc}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-4">
                <InputField
                  id="npc-nome"
                  label="Nome"
                  value={form.nome}
                  onChange={(value) => setFormField("nome", value)}
                />
                <BadgePicker
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
                  emptyLabel="Escolha a raça"
                />
                <BadgePicker
                  label="Gênero"
                  value={form.genero}
                  onChange={(value) => setFormField("genero", value)}
                  options={GENEROS}
                />
                <BadgePicker
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
                  emptyLabel="Sem classe"
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <InputField
                    id="npc-profissao"
                    label="Profissão"
                    value={form.profissao}
                    onChange={(value) => setFormField("profissao", value)}
                  />
                  <BadgePicker
                    label="Importância"
                    value={form.importancia}
                    onChange={(value) => setFormField("importancia", value)}
                    options={IMPORTANCIAS}
                    emptyLabel="Sem marcador"
                  />
                  <BadgePicker
                    label="Tom"
                    value={form.tom}
                    onChange={(value) => setFormField("tom", value)}
                    options={TONS}
                    emptyLabel="Sem marcador"
                  />
                </div>
                <TextareaField
                  id="npc-objetivo"
                  label="Objetivo na campanha"
                  value={form.objetivoCampanha}
                  onChange={(value) => setFormField("objetivoCampanha", value)}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <TextareaField
                    id="npc-personalidade"
                    label="Personalidade"
                    value={form.personalidade}
                    onChange={(value) => setFormField("personalidade", value)}
                  />
                  <TextareaField
                    id="npc-aparencia"
                    label="Aparência"
                    value={form.aparencia}
                    onChange={(value) => setFormField("aparencia", value)}
                  />
                  <TextareaField
                    id="npc-segredo"
                    label="Segredo"
                    value={form.segredo}
                    onChange={(value) => setFormField("segredo", value)}
                  />
                  <TextareaField
                    id="npc-gancho"
                    label="Gancho"
                    value={form.gancho}
                    onChange={(value) => setFormField("gancho", value)}
                  />
                </div>
                <InputField
                  id="npc-frase"
                  label="Frase"
                  value={form.frase}
                  onChange={(value) => setFormField("frase", value)}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <TextareaField
                    id="npc-relacao"
                    label="Relação com o grupo"
                    value={form.relacaoComGrupo}
                    onChange={(value) => setFormField("relacaoComGrupo", value)}
                  />
                  <TextareaField
                    id="npc-detalhe"
                    label="Detalhe visual"
                    value={form.detalheVisual}
                    onChange={(value) => setFormField("detalheVisual", value)}
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
            <section className="overflow-hidden rounded-lg border bg-card/90">
              <div className="relative flex min-h-72 items-center justify-center overflow-hidden border-b bg-linear-to-br from-indigo-950 via-zinc-950 to-emerald-950 p-8 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(255,255,255,0.22),transparent_22%),radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.22),transparent_28%)]" />
                <div className="relative text-center">
                  <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-2xl shadow-black/40 backdrop-blur">
                    <UserRoundPlus className="h-16 w-16 text-emerald-100" />
                  </div>
                  <h2 className="mt-5 text-2xl font-black uppercase tracking-[0.08em]">
                    {form.nome || "Novo NPC"}
                  </h2>
                  <p className="mt-2 text-sm text-white/70">
                    {form.profissao || form.classeNome || "Personagem não salvo"}
                  </p>
                </div>
              </div>
              <div className="space-y-4 p-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    form.racaNome,
                    formatGenero(form.genero),
                    form.classeNome,
                    form.importancia,
                    form.tom,
                  ]
                    .filter(Boolean)
                    .map((tag) => (
                      <span
                        key={String(tag)}
                        className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {form.descricao ||
                    form.objetivoCampanha ||
                    "Gere ou preencha os dados para ver uma prévia narrativa aqui."}
                </p>
              </div>
            </section>

            <section className="rounded-lg border bg-card/90 p-4">
              <div className="flex items-end gap-2">
                <label className="flex-1">
                  <span className="text-sm font-medium">Estilo narrativo</span>
                  <select
                    value={selectedStyle}
                    onChange={(event) => setSelectedStyle(event.target.value)}
                    className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {estilosNarrativos.map((estilo) => (
                      <option key={estilo.chave} value={estilo.chave}>
                        {estilo.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={refineNarrative}
                  disabled={loading || estilosNarrativos.length === 0}
                  aria-label="Refinar narrativa"
                >
                  <WandSparkles className="h-4 w-4" />
                </Button>
              </div>
              <TextareaField
                id="npc-descricao"
                label="Descrição final"
                value={form.descricao}
                onChange={(value) => setFormField("descricao", value)}
                rows={9}
              />
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={startManual}
                  disabled={loading}
                >
                  <Edit3 className="h-4 w-4" />
                  Limpar
                </Button>
                <Button type="submit" className="flex-1 gap-2" disabled={saveDisabled}>
                  <Save className="h-4 w-4" />
                  Salvar NPC
                </Button>
              </div>
            </section>
          </aside>
        </form>
      </section>
    </main>
  );
}

function BadgePicker({
  label,
  value,
  onChange,
  options,
  emptyLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  emptyLabel?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {emptyLabel ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              value === ""
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {emptyLabel}
          </button>
        ) : null}
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              value === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function InputField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block">
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

function TextareaField({
  id,
  label,
  value,
  onChange,
  rows = 3,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label htmlFor={id} className="mt-4 block">
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

function payloadFromForm(form: NpcForm) {
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

function cleanPayload<T extends Record<string, string>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value.trim())
  );
}

function formatGenero(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}
