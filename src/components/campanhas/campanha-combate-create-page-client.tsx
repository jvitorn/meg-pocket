"use client";

import {
  useDeferredValue,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Skull, Swords, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { CampanhaSectionHeader } from "@/components/campanhas/campanha-section-header";
import { EscudoLayoutShell } from "@/components/campanhas/escudo-layout-shell";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { validarFormularioCombate } from "@/lib/regras/campanhaCombate";
import { criarCombateCampanha } from "@/services/campanhaApiService";
import type {
  CampanhaInfo,
  CombateCatalogoAmeaca,
  CombateCatalogoPersonagem,
  CombatePersonagemSelectionState,
  CombateThreatDraft,
} from "@/types";

type Props = {
  campanha: CampanhaInfo;
  personagens: CombateCatalogoPersonagem[];
  ameacas: CombateCatalogoAmeaca[];
  personagensCount: number;
  inventarioCount: number;
  npcsCount: number;
  combatesCount: number;
  bestiarioCount?: number;
};

export function CampanhaCombateCreatePageClient({
  campanha,
  personagens,
  ameacas,
  personagensCount,
  inventarioCount,
  npcsCount,
  combatesCount,
  bestiarioCount = 0,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [visible, setVisible] = useState(10);
  const [quantity, setQuantity] = useState("1");
  const [consultedThreat, setConsultedThreat] =
    useState<CombateCatalogoAmeaca | null>(null);
  const [threatDrafts, setThreatDrafts] = useState<CombateThreatDraft[]>([]);
  const [selectedPersonagens, setSelectedPersonagens] =
    useState<CombatePersonagemSelectionState>({});
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

  function addThreat(ameacaId: number) {
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
        iniciativa: defaultThreatInitiative(threat),
      })),
    ]);
    setQuantity("1");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validarFormularioCombate({
      nome,
      selectedPersonagens,
      threatDrafts,
      exigirIniciativaAmeacas: false,
    });
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
      campanha={{
        id: campanha.id,
        nome: campanha.nome,
        mestre: campanha.mestre,
        status: campanha.status,
      }}
      activeSection="combates"
      currentLabel="Criar combate"
      personagensCount={personagensCount}
      inventarioCount={inventarioCount}
      npcsCount={npcsCount}
      combatesCount={combatesCount}
      bestiarioCount={bestiarioCount}
    >
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-5 sm:px-4 sm:py-8">
        <section className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
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

              <label className="grid gap-2 rounded-lg border border-border/70 bg-background p-4 shadow-xs">
                <span className="text-sm font-medium">Nome do combate</span>
                <Input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Emboscada na estrada" />
              </label>

              <section className="grid gap-3 rounded-lg border border-border/70 bg-background p-4 shadow-xs">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">Personagens</h2>
                </div>
                <div className="grid gap-2">
                  {personagens.map((personagem) => {
                    const state = selectedPersonagens[personagem.id];
                    const selected = Boolean(state?.selected);
                    return (
                      <div key={personagem.id} className={cn("grid gap-2 rounded-lg border p-3 shadow-xs", selected ? "border-primary/45 bg-primary/5 ring-1 ring-primary/15" : "bg-card")}>
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

              <section className="grid gap-3 rounded-lg border border-border/70 bg-background p-4 shadow-xs">
                <h2 className="font-semibold">Participantes adicionados</h2>
                <div className="grid gap-2">
                  {threatDrafts.map((draft, index) => (
                    <div key={draft.tempId} className="grid gap-2 rounded-lg border bg-card p-3 shadow-xs">
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
              <div className="grid gap-2 rounded-lg border border-red-300/20 bg-black/30 p-3 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-end">
                <div>
                  <p className="text-sm font-medium text-red-50">
                    Adicionar pelo card
                  </p>
                  <p className="mt-1 text-xs text-red-100/65">
                    A ficha abre em consulta. A iniciativa inicial usa a defesa
                    da ameaça.
                  </p>
                </div>
                <label className="grid gap-1">
                  <span className="text-xs text-red-100/70">Qtd.</span>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    aria-label="Quantidade de ameaças"
                    className="bg-black/35 text-white"
                  />
                </label>
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
                  placeholder="Buscar por nome, função, elemento ou golpe..."
                  className="h-10 w-full rounded-md border border-red-300/20 bg-black/35 pl-10 pr-3 text-sm outline-none placeholder:text-red-100/50 focus:border-red-300/70 focus:ring-2 focus:ring-red-500/25"
                />
              </label>
              <div className="grid gap-2">
                {filteredThreats.slice(0, visible).map((ameaca) => (
                  <ThreatCard
                    key={ameaca.id}
                    ameaca={ameaca}
                    onView={() => setConsultedThreat(ameaca)}
                    onAdd={() => addThreat(ameaca.id)}
                  />
                ))}
              </div>
              {filteredThreats.length > visible ? (
                <Button type="button" variant="outline" className="border-red-200/35 bg-black/20 text-white hover:bg-red-500/20 hover:text-white" onClick={() => setVisible((current) => current + 10)}>
                  Carregar mais ameaças
                </Button>
              ) : null}
            </section>
          </form>
        </section>
      </main>

      <Drawer
        open={Boolean(consultedThreat)}
        onOpenChange={(open) => {
          if (!open) setConsultedThreat(null);
        }}
      >
        <DrawerContent className="h-[92svh] max-h-[92svh] overflow-hidden">
          <DrawerHeader className="shrink-0 border-b bg-card/80 text-left">
            <DrawerTitle>{consultedThreat?.nome ?? "Ameaça"}</DrawerTitle>
            <DrawerDescription>
              Ficha de consulta. Nenhuma ação de combate é alterada por aqui.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {consultedThreat ? (
              <ThreatDetails threat={consultedThreat} />
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </EscudoLayoutShell>
  );
}

function ThreatCard({
  ameaca,
  onView,
  onAdd,
}: {
  ameaca: CombateCatalogoAmeaca;
  onView: () => void;
  onAdd: () => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onView();
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Consultar ficha de ${ameaca.nome}`}
      onClick={onView}
      onKeyDown={handleKeyDown}
      className="relative cursor-pointer overflow-hidden rounded-md border border-red-300/15 bg-black/35 text-white transition hover:border-red-200/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200/80"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_35%,rgba(239,68,68,0.22),transparent_30%),linear-gradient(90deg,rgba(127,29,29,0.72),rgba(69,10,10,0.28))]" />
      <div className="relative grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold">{ameaca.nome}</h3>
            <span className="rounded-md border border-red-200/25 bg-black/25 px-2 py-0.5 text-xs text-red-50/85">VA {formatVa(ameaca.va)}</span>
          </div>
          <p className="mt-1 text-sm text-red-50/80">{ameaca.elemento} · {ameaca.funcao}</p>
          <div className="mt-3 grid gap-2 text-xs text-red-50/75 sm:grid-cols-3">
            <span>PV {ameaca.pv}</span>
            <span>Mana {ameaca.mana}</span>
            <span>Defesa {ameaca.defesa}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-red-50/60">{ameaca.descricao}</p>
        </div>
        <div className="flex gap-2 sm:flex-col">
          <Button
            type="button"
            variant="outline"
            className="border-white/55 bg-black/15 text-white hover:bg-white/10 hover:text-white"
            onClick={(event) => {
              event.stopPropagation();
              onView();
            }}
          >
            Ficha
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-500"
            onClick={(event) => {
              event.stopPropagation();
              onAdd();
            }}
          >
            Adicionar
          </Button>
        </div>
      </div>
    </article>
  );
}

function ThreatDetails({ threat }: { threat: CombateCatalogoAmeaca }) {
  return (
    <div className="grid gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {threat.tipo}
          {threat.tipoSecundario ? ` / ${threat.tipoSecundario}` : ""}
        </p>
        <h3 className="mt-1 text-lg font-semibold">{threat.nome}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {threat.elemento} · {threat.funcao} · VA {formatVa(threat.va)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <DetailStat label="PV" value={threat.pv} />
        <DetailStat label="Mana" value={threat.mana} />
        <DetailStat label="Defesa" value={threat.defesa} />
        <DetailStat label="Dano" value={threat.danoBase} />
      </div>

      <div className="rounded-lg border bg-card p-3 shadow-xs">
        <p className="text-sm font-medium">Descrição</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {threat.descricao}
        </p>
        {threat.narrativa ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {threat.narrativa}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <TagList title="Fraquezas" items={threat.fraquezas} />
        <TagList title="Resistências" items={threat.resistencias} />
        <TagList title="Imunidades" items={threat.imunidades} />
      </div>

      <div className="rounded-lg border bg-card p-3 shadow-xs">
        <p className="text-sm font-medium">Reações</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Bloqueio {threat.reacoes.bloqueio} · Esquiva{" "}
          {threat.reacoes.esquiva} · Contra-ataque{" "}
          {threat.reacoes.contraAtaque}
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Golpes</p>
        <div className="grid gap-2">
          {threat.golpes.map((golpe) => (
            <div key={golpe.nome} className="rounded-lg border bg-card p-3 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{golpe.nome}</p>
                {golpe.custoMana ? (
                  <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                    {golpe.custoMana} mana
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {golpe.descricao}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-xs">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function TagList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-xs">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.length > 0 ? (
          items.map((item) => (
            <span
              key={item}
              className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">Nenhum registro.</span>
        )}
      </div>
    </div>
  );
}

function defaultThreatInitiative(threat: CombateCatalogoAmeaca) {
  return Number.isInteger(threat.defesa) ? String(threat.defesa) : "";
}

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function formatVa(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
}
