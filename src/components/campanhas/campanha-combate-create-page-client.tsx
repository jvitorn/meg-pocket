"use client";

import { useDeferredValue, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Search, Skull, Swords, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { CampanhaSectionHeader } from "@/components/campanhas/campanha-section-header";
import { EscudoLayoutShell } from "@/components/campanhas/escudo-layout-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { criarCombateCampanha } from "@/services/campanhaApiService";
import type {
  CampanhaInfo,
  CombateCatalogoAmeaca,
  CombateCatalogoPersonagem,
} from "@/types";

type ThreatDraft = {
  tempId: string;
  ameacaId: number;
  nome: string;
  iniciativa: string;
};

type Props = {
  campanha: CampanhaInfo;
  personagens: CombateCatalogoPersonagem[];
  ameacas: CombateCatalogoAmeaca[];
  personagensCount: number;
  inventarioCount: number;
  npcsCount: number;
  combatesCount: number;
};

export function CampanhaCombateCreatePageClient({
  campanha,
  personagens,
  ameacas,
  personagensCount,
  inventarioCount,
  npcsCount,
  combatesCount,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [visible, setVisible] = useState(10);
  const [selectedThreatId, setSelectedThreatId] = useState(ameacas[0]?.id ?? 0);
  const [quantity, setQuantity] = useState("1");
  const [threatDrafts, setThreatDrafts] = useState<ThreatDraft[]>([]);
  const [selectedPersonagens, setSelectedPersonagens] = useState<
    Record<number, { selected: boolean; iniciativa: string }>
  >({});
  const [errors, setErrors] = useState<string[]>([]);

  const filteredThreats = useMemo(() => {
    const normalized = normalizeSearch(deferredQuery);
    return ameacas.filter((ameaca) => {
      if (!normalized) return true;
      return normalizeSearch(
        [
          ameaca.nome,
          ameaca.tipo,
          ameaca.elemento,
          ameaca.funcao,
          ameaca.descricao,
          ameaca.golpes.map((golpe) => golpe.nome).join(" "),
        ].join(" ")
      ).includes(normalized);
    });
  }, [ameacas, deferredQuery]);
  const selectedThreat =
    ameacas.find((ameaca) => ameaca.id === selectedThreatId) ?? ameacas[0] ?? null;
  const vaTotal = threatDrafts.reduce((total, draft) => {
    const threat = ameacas.find((ameaca) => ameaca.id === draft.ameacaId);
    return total + (threat?.va ?? 0);
  }, 0);

  function togglePersonagem(personagemId: number) {
    setSelectedPersonagens((current) => ({
      ...current,
      [personagemId]: {
        selected: !current[personagemId]?.selected,
        iniciativa: current[personagemId]?.iniciativa ?? "",
      },
    }));
  }

  function addThreat(ameacaId = selectedThreatId) {
    const threat = ameacas.find((ameaca) => ameaca.id === ameacaId);
    const amount = Number(quantity);

    if (!threat || !Number.isInteger(amount) || amount <= 0) {
      toast.error("Selecione uma ameaça e quantidade válida.");
      return;
    }

    setThreatDrafts((current) => [
      ...current,
      ...Array.from({ length: Math.min(amount, 20) }, (_, index) => ({
        tempId: `${Date.now()}-${ameacaId}-${index}`,
        ameacaId,
        nome: threat.nome,
        iniciativa: "",
      })),
    ]);
    setQuantity("1");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateCombatForm(nome, selectedPersonagens, threatDrafts);
    setErrors(nextErrors);

    if (nextErrors.length > 0) {
      toast.error(nextErrors[0]);
      return;
    }

    setLoading(true);
    try {
      await criarCombateCampanha(campanha.id, {
        nome,
        personagens: Object.entries(selectedPersonagens)
          .filter(([, value]) => value.selected)
          .map(([personagemId, value]) => ({
            personagemId,
            iniciativa: value.iniciativa,
          })),
        ameacas: threatDrafts.map((draft) => ({
          ameacaId: draft.ameacaId,
          iniciativa: draft.iniciativa,
        })),
      });
      toast.success("Combate criado.");
      router.push(`/campanhas/escudo/${campanha.id}/combates`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar combate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <EscudoLayoutShell
      campanha={{ id: campanha.id, nome: campanha.nome, mestre: campanha.mestre }}
      activeSection="combates"
      currentLabel="Criar combate"
      personagensCount={personagensCount}
      inventarioCount={inventarioCount}
      npcsCount={npcsCount}
      combatesCount={combatesCount}
    >
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-2 py-6 sm:px-4 sm:py-8">
        <section className="overflow-hidden rounded-lg border bg-card/70">
          <CampanhaSectionHeader
            icon={Swords}
            eyebrow="Preparação"
            title="Criar combate"
            description="Escolha personagens, adicione ameaças e informe a iniciativa. Se uma ameaça ficar sem iniciativa, será usada a defesa dela."
            tone="sky"
            meta={`VA selecionado: ${formatVa(vaTotal)}`}
            actions={
              <Button asChild size="sm" variant="outline" className="bg-white text-zinc-950 hover:bg-white/90">
                <Link href={`/campanhas/escudo/${campanha.id}/combates`}>
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Link>
              </Button>
            }
          />

          <form onSubmit={submit} className="grid gap-5 p-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            <section className="grid content-start gap-4">
              {errors.length > 0 ? (
                <div className="rounded-lg border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-100">
                  {errors.map((error) => <p key={error}>{error}</p>)}
                </div>
              ) : null}

              <label className="grid gap-2 rounded-lg border bg-background/75 p-4">
                <span className="text-sm font-medium">Nome do combate</span>
                <Input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Emboscada na estrada" />
              </label>

              <section className="grid gap-3 rounded-lg border bg-background/75 p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">Personagens</h2>
                </div>
                <div className="grid gap-2">
                  {personagens.map((personagem) => {
                    const state = selectedPersonagens[personagem.id];
                    const selected = Boolean(state?.selected);
                    return (
                      <div key={personagem.id} className={cn("grid gap-2 rounded-lg border p-3", selected ? "border-primary/45 bg-primary/5" : "bg-card/70")}>
                        <label className="flex items-center gap-3">
                          <input type="checkbox" checked={selected} onChange={() => togglePersonagem(personagem.id)} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{personagem.nome}</span>
                            <span className="block truncate text-xs text-muted-foreground">{personagem.racaNome ?? "Raça"} · {personagem.classeNome ?? "Classe"}</span>
                          </span>
                        </label>
                        {selected ? (
                          <Input
                            type="number"
                            placeholder="Iniciativa"
                            value={state?.iniciativa ?? ""}
                            onChange={(event) =>
                              setSelectedPersonagens((current) => ({
                                ...current,
                                [personagem.id]: { selected: true, iniciativa: event.target.value },
                              }))
                            }
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-3 rounded-lg border bg-background/75 p-4">
                <h2 className="font-semibold">Participantes adicionados</h2>
                <div className="grid gap-2">
                  {threatDrafts.map((draft, index) => (
                    <div key={draft.tempId} className="grid gap-2 rounded-lg border bg-card/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{draft.nome} {index + 1}</p>
                          <p className="text-xs text-muted-foreground">Iniciativa vazia usa a defesa da ameaça.</p>
                        </div>
                        <Button type="button" size="icon" variant="ghost" onClick={() => setThreatDrafts((current) => current.filter((item) => item.tempId !== draft.tempId))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        type="number"
                        placeholder="Iniciativa opcional"
                        value={draft.iniciativa}
                        onChange={(event) =>
                          setThreatDrafts((current) =>
                            current.map((item) =>
                              item.tempId === draft.tempId ? { ...item, iniciativa: event.target.value } : item
                            )
                          )
                        }
                      />
                    </div>
                  ))}
                  {threatDrafts.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nenhuma ameaça adicionada.</p>
                  ) : null}
                </div>
                <Button type="submit" disabled={loading}>Criar combate</Button>
              </section>
            </section>

            <section className="grid content-start gap-3 rounded-lg border border-red-500/25 bg-red-950/15 p-3 text-white">
              <div className="flex items-center gap-2">
                <Skull className="h-5 w-5 text-red-200" />
                <h2 className="font-semibold">Ameaças</h2>
              </div>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-100/65" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setVisible(10);
                  }}
                  placeholder="Buscar por nome, tipo, função ou golpe..."
                  className="h-10 w-full rounded-md border border-red-300/20 bg-black/35 pl-10 pr-3 text-sm outline-none placeholder:text-red-100/50 focus:border-red-300/70 focus:ring-2 focus:ring-red-500/25"
                />
              </label>
              <div className="grid gap-2">
                {filteredThreats.slice(0, visible).map((ameaca) => (
                  <ThreatCard
                    key={ameaca.id}
                    ameaca={ameaca}
                    selected={selectedThreat?.id === ameaca.id}
                    onSelect={() => setSelectedThreatId(ameaca.id)}
                    onAdd={() => addThreat(ameaca.id)}
                  />
                ))}
              </div>
              {filteredThreats.length > visible ? (
                <Button type="button" variant="outline" className="border-red-200/35 bg-black/20 text-white hover:bg-red-500/20 hover:text-white" onClick={() => setVisible((current) => current + 10)}>
                  Carregar mais ameaças
                </Button>
              ) : null}
              <div className="grid gap-2 rounded-lg border border-red-300/20 bg-black/30 p-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-red-100/60">Selecionada</p>
                  <p className="truncate font-semibold">{selectedThreat?.nome ?? "Nenhuma ameaça"}</p>
                </div>
                <label className="grid gap-1">
                  <span className="text-xs text-red-100/70">Qtd.</span>
                  <Input type="number" min="1" max="20" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="bg-black/35 text-white" />
                </label>
                <Button type="button" className="gap-2 bg-red-600 hover:bg-red-500" onClick={() => addThreat()}>
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </section>
          </form>
        </section>
      </main>
    </EscudoLayoutShell>
  );
}

function ThreatCard({
  ameaca,
  selected,
  onSelect,
  onAdd,
}: {
  ameaca: CombateCatalogoAmeaca;
  selected: boolean;
  onSelect: () => void;
  onAdd: () => void;
}) {
  return (
    <article className={cn("relative overflow-hidden rounded-md border border-red-300/15 bg-black/35 text-white transition hover:border-red-200/55", selected && "border-red-200/70 shadow-[0_0_0_1px_rgba(248,113,113,0.5)]")}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_35%,rgba(239,68,68,0.22),transparent_30%),linear-gradient(90deg,rgba(127,29,29,0.72),rgba(69,10,10,0.28))]" />
      <div className="relative grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <button type="button" className="min-w-0 text-left" onClick={onSelect}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{ameaca.nome}</h3>
            <span className="rounded-md border border-red-200/25 bg-black/25 px-2 py-0.5 text-xs text-red-50/85">VA {formatVa(ameaca.va)}</span>
          </div>
          <p className="mt-1 text-sm text-red-50/80">{ameaca.tipo} · {ameaca.elemento} · {ameaca.funcao}</p>
          <div className="mt-3 grid gap-2 text-xs text-red-50/75 sm:grid-cols-4">
            <span>PV {ameaca.pv}</span>
            <span>Mana {ameaca.mana}</span>
            <span>Defesa {ameaca.defesa}</span>
            <span>Dano {ameaca.danoBase}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-red-50/60">{ameaca.descricao}</p>
        </button>
        <div className="flex gap-2 sm:flex-col">
          <Button type="button" variant="outline" className="border-white/55 bg-black/15 text-white hover:bg-white/10 hover:text-white" onClick={onSelect}>Ficha</Button>
          <Button type="button" className="bg-red-600 text-white hover:bg-red-500" onClick={onAdd}>Adicionar</Button>
        </div>
      </div>
    </article>
  );
}

function validateCombatForm(
  nome: string,
  selectedPersonagens: Record<number, { selected: boolean; iniciativa: string }>,
  threatDrafts: ThreatDraft[]
) {
  const errors: string[] = [];
  const personagens = Object.values(selectedPersonagens).filter((item) => item.selected);
  if (nome.trim().length < 2) errors.push("Informe o nome do combate.");
  if (personagens.length + threatDrafts.length === 0) errors.push("Adicione pelo menos um personagem ou ameaça.");
  if (personagens.some((item) => item.iniciativa.trim() === "" || !Number.isInteger(Number(item.iniciativa)))) {
    errors.push("Informe a iniciativa de todos os personagens selecionados.");
  }
  return errors;
}

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function formatVa(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
}
