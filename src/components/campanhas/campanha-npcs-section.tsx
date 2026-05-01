"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Edit3,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UserRoundPlus,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

type CatalogOption = {
  id: number;
  nome: string;
};

export type CampanhaNpcItem = {
  id: number;
  nome: string;
  racaId: number | null;
  racaNome: string;
  genero: string;
  classeId: number | null;
  classeNome: string | null;
  profissao: string | null;
  importancia: string | null;
  tom: string | null;
  personalidade: string | null;
  aparencia: string | null;
  segredo: string | null;
  objetivoCampanha: string;
  gancho: string | null;
  frase: string | null;
  relacaoComGrupo: string | null;
  detalheVisual: string | null;
  descricao: string | null;
  dadosJson?: unknown;
};

export type NpcEstiloNarrativoOption = {
  chave: string;
  nome: string;
  descricao: string | null;
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
  campanhaId: number;
  npcs?: CampanhaNpcItem[];
  racas?: CatalogOption[];
  classes?: CatalogOption[];
  estilosNarrativos?: NpcEstiloNarrativoOption[];
  limite?: number;
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

export function CampanhaNpcsSection({
  campanhaId,
  npcs = [],
  racas = [],
  classes = [],
  estilosNarrativos = [],
  limite = 50,
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"choice" | "manual" | "procedural" | "edit">(
    "choice"
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<NpcForm>(EMPTY_FORM);
  const [filters, setFilters] = useState<NpcFilters>(EMPTY_FILTERS);
  const [selectedStyle, setSelectedStyle] = useState(
    estilosNarrativos[0]?.chave ?? "classico"
  );
  const [loading, setLoading] = useState(false);

  const selectableClasses = useMemo(
    () => classes.filter((classe) => isClasseSelecionavel(classe.nome)),
    [classes]
  );
  const remainingSlots = Math.max(limite - npcs.length, 0);
  const hasDraft = Boolean(form.nome || form.descricao || form.objetivoCampanha);
  const saveDisabled =
    loading ||
    !form.nome.trim() ||
    !form.racaId ||
    !form.genero ||
    !form.objetivoCampanha.trim() ||
    (!editingId && remainingSlots <= 0);

  function setFormField<K extends keyof NpcForm>(key: K, value: NpcForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setFilterField<K extends keyof NpcFilters>(key: K, value: NpcFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function openChoice() {
    setDialogOpen(true);
    setMode("choice");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFilters(EMPTY_FILTERS);
  }

  function startManual() {
    setMode("manual");
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startProcedural() {
    setMode("procedural");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFilters(EMPTY_FILTERS);
  }

  function editNpc(npc: CampanhaNpcItem) {
    setDialogOpen(true);
    setMode("edit");
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
      const data = await callApi<{ ok: true; npc: CampanhaNpcItem }>(
        `/api/campanhas/${campanhaId}/npcs/gerar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filtros: cleanPayload(filters) }),
        }
      );
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
        `/api/campanhas/${campanhaId}/npcs/refinar`,
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
          ? `/api/campanhas/${campanhaId}/npcs/${editingId}`
          : `/api/campanhas/${campanhaId}/npcs`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadFromForm(form)),
        }
      );
      toast.success(editingId ? "NPC atualizado." : "NPC salvo na campanha.");
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar NPC.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteNpc(npc: CampanhaNpcItem) {
    if (!window.confirm(`Excluir ${npc.nome} da campanha?`)) {
      return;
    }

    setLoading(true);

    try {
      await callApi(`/api/campanhas/${campanhaId}/npcs/${npc.id}`, {
        method: "DELETE",
      });
      toast.success("NPC excluído.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir NPC.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="npcs" className="scroll-mt-24 rounded-lg border bg-card/70 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <UserRoundPlus className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">NPCs da campanha</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {npcs.length}/{limite} salvos · {remainingSlots}{" "}
              {remainingSlots === 1 ? "disponível" : "disponíveis"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full gap-2 sm:w-auto"
          onClick={openChoice}
          disabled={remainingSlots <= 0}
        >
          <Plus className="h-4 w-4" />
          Novo NPC
        </Button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {npcs.map((npc) => (
          <article key={npc.id} className="rounded-md border bg-background/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{npc.nome}</h3>
                  <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {npc.racaNome}
                  </span>
                  <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {formatGenero(npc.genero)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {npc.profissao || npc.classeNome || "Sem profissão definida"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={`Editar ${npc.nome}`}
                  onClick={() => editNpc(npc)}
                  disabled={loading}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  aria-label={`Excluir ${npc.nome}`}
                  onClick={() => deleteNpc(npc)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {npc.descricao || npc.objetivoCampanha}
            </p>
          </article>
        ))}

        {npcs.length === 0 ? (
          <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground lg:col-span-2">
            Nenhum NPC salvo nesta campanha.
          </p>
        ) : null}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {mode === "choice" ? (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Novo NPC</DialogTitle>
              <DialogDescription>
                Escolha como este NPC será iniciado.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start gap-3 px-4 py-5 text-left"
                onClick={startManual}
              >
                <Edit3 className="h-5 w-5 text-primary" />
                <span>
                  <span className="block font-semibold">Criar manualmente</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Formulário vazio.
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start gap-3 px-4 py-5 text-left"
                onClick={startProcedural}
              >
                <Sparkles className="h-5 w-5 text-primary" />
                <span>
                  <span className="block font-semibold">Gerar proceduralmente</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Usa banco e templates internos.
                  </span>
                </span>
              </Button>
            </div>
          </DialogContent>
        ) : (
          <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId
                  ? "Editar NPC"
                  : mode === "procedural"
                    ? "Gerar NPC procedural"
                    : "Criar NPC manualmente"}
              </DialogTitle>
              <DialogDescription>
                Campos marcados como obrigatórios precisam estar preenchidos antes de salvar.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={saveNpc} className="space-y-5">
              {mode === "procedural" ? (
                <div className="rounded-lg border bg-background/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold">Filtros de geração</h3>
                      <FieldDescription className="mt-1">
                        Deixe em branco para sortear.
                      </FieldDescription>
                    </div>
                    <Button
                      type="button"
                      variant={hasDraft ? "outline" : "default"}
                      className="gap-2"
                      onClick={generateNpc}
                      disabled={loading || racas.length === 0}
                    >
                      {hasDraft ? (
                        <RefreshCw className="h-4 w-4" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {hasDraft ? "Gerar Novamente" : "Gerar NPC"}
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <SelectField
                      id="npc-filtro-raca"
                      label="Raça"
                      value={filters.racaId}
                      onChange={(value) => setFilterField("racaId", value)}
                      options={racas.map((raca) => ({
                        value: String(raca.id),
                        label: raca.nome,
                      }))}
                      placeholder="Sortear"
                    />
                    <SelectField
                      id="npc-filtro-genero"
                      label="Gênero"
                      value={filters.genero}
                      onChange={(value) => setFilterField("genero", value)}
                      options={GENEROS}
                      placeholder="Sortear"
                    />
                    <SelectField
                      id="npc-filtro-classe"
                      label="Classe"
                      value={filters.classeId}
                      onChange={(value) => setFilterField("classeId", value)}
                      options={selectableClasses.map((classe) => ({
                        value: String(classe.id),
                        label: classe.nome,
                      }))}
                      placeholder="Sortear ou deixar sem"
                    />
                    <InputField
                      id="npc-filtro-profissao"
                      label="Profissão"
                      value={filters.profissao}
                      onChange={(value) => setFilterField("profissao", value)}
                    />
                    <SelectField
                      id="npc-filtro-importancia"
                      label="Importância"
                      value={filters.importancia}
                      onChange={(value) => setFilterField("importancia", value)}
                      options={IMPORTANCIAS}
                      placeholder="Sortear"
                    />
                    <SelectField
                      id="npc-filtro-tom"
                      label="Tom"
                      value={filters.tom}
                      onChange={(value) => setFilterField("tom", value)}
                      options={TONS}
                      placeholder="Sortear"
                    />
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg border bg-background/70 p-4">
                <h3 className="font-semibold">Dados principais</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <InputField
                    id="npc-nome"
                    label="Nome"
                    value={form.nome}
                    onChange={(value) => setFormField("nome", value)}
                    required
                  />
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
                    placeholder="Selecione"
                    required
                  />
                  <SelectField
                    id="npc-genero"
                    label="Gênero"
                    value={form.genero}
                    onChange={(value) => setFormField("genero", value)}
                    options={GENEROS}
                    required
                  />
                  <SelectField
                    id="npc-classe"
                    label="Classe"
                    value={form.classeId}
                    onChange={(value) => {
                      const classe = selectableClasses.find(
                        (item) => String(item.id) === value
                      );
                      setForm((current) => ({
                        ...current,
                        classeId: value,
                        classeNome: classe?.nome ?? "",
                      }));
                    }}
                    options={selectableClasses.map((classe) => ({
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
                  <TextareaField
                    id="npc-objetivo"
                    label="Objetivo na campanha"
                    value={form.objetivoCampanha}
                    onChange={(value) => setFormField("objetivoCampanha", value)}
                    required
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-background/70 p-4">
                <h3 className="font-semibold">Detalhes narrativos</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                  <InputField
                    id="npc-frase"
                    label="Frase"
                    value={form.frase}
                    onChange={(value) => setFormField("frase", value)}
                  />
                  <InputField
                    id="npc-detalhe-visual"
                    label="Detalhe visual"
                    value={form.detalheVisual}
                    onChange={(value) => setFormField("detalheVisual", value)}
                  />
                  <TextareaField
                    id="npc-relacao"
                    label="Relação com o grupo"
                    value={form.relacaoComGrupo}
                    onChange={(value) => setFormField("relacaoComGrupo", value)}
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-background/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold">Descrição final</h3>
                    <FieldDescription className="mt-1">
                      O refinamento troca apenas a descrição.
                    </FieldDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={selectedStyle}
                      onChange={(event) => setSelectedStyle(event.target.value)}
                      className="h-9 rounded-md border bg-background px-3 text-sm"
                      disabled={estilosNarrativos.length === 0}
                    >
                      {estilosNarrativos.map((estilo) => (
                        <option key={estilo.chave} value={estilo.chave}>
                          {estilo.nome}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={refineNarrative}
                      disabled={loading || estilosNarrativos.length === 0}
                    >
                      <WandSparkles className="h-4 w-4" />
                      Refinar Narrativa
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  <TextareaField
                    id="npc-descricao"
                    label="Descrição"
                    value={form.descricao}
                    onChange={(value) => setFormField("descricao", value)}
                    rows={7}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2" disabled={saveDisabled}>
                  <Save className="h-4 w-4" />
                  Salvar NPC
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}

function InputField({
  id,
  label,
  value,
  onChange,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
    </Field>
  );
}

function TextareaField({
  id,
  label,
  value,
  onChange,
  required = false,
  rows = 3,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={rows}
        className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </Field>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-9 rounded-md border bg-background px-3 text-sm"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
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
    tom: npc.tom ?? "",
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
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isClasseSelecionavel(nome: string) {
  const normalized = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  return !["unico", "unica"].includes(normalized);
}
