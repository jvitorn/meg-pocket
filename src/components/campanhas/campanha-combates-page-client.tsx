"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Play,
  Plus,
  Search,
  Shield,
  Skull,
  Swords,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { CampanhaSectionHeader } from "@/components/campanhas/campanha-section-header";
import { EscudoLayoutShell } from "@/components/campanhas/escudo-layout-shell";
import { ReactiveSlotsPanel } from "@/components/personagens/ficha/ReactiveSlotsPanel";
import { Button } from "@/components/ui/button";
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
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { validarFormularioCombate } from "@/lib/regras/campanhaCombate";
import {
  criarCombateCampanha,
  executarAcaoCombateCampanha,
  excluirCombateCampanha,
} from "@/services/campanhaApiService";
import type {
  CampanhaInfo,
  CombateCatalogoAmeaca,
  CombateCatalogoPersonagem,
  CombateDetail,
  CombateParticipanteView,
  CombatePersonagemSelectionState,
  CombateThreatDraft,
} from "@/types";

type Props = {
  campanha: CampanhaInfo;
  combates: CombateDetail[];
  personagens: CombateCatalogoPersonagem[];
  ameacas: CombateCatalogoAmeaca[];
  personagensCount: number;
  inventarioCount: number;
  npcsCount: number;
  bestiarioCount?: number;
};

const STATUS_LABEL = {
  RASCUNHO: "Rascunho",
  EM_ANDAMENTO: "Em andamento",
  ENCERRADO: "Encerrado",
} as const;

type CombatTurnAction = "iniciar" | "proximo" | "voltar" | "encerrar";
type CombatMobileTab = "turno" | "ordem" | "acoes";

export function CampanhaCombatesPageClient({
  campanha,
  combates,
  personagens,
  ameacas,
  personagensCount,
  inventarioCount,
  npcsCount,
  bestiarioCount = 0,
}: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [combatId, setCombatId] = useState<number | null>(
    combates.find((combate) => combate.status === "EM_ANDAMENTO")?.id ??
      combates[0]?.id ??
      null
  );
  const [selectedParticipantId, setSelectedParticipantId] = useState<number | null>(
    null
  );
  const [formName, setFormName] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [selectedPersonagens, setSelectedPersonagens] =
    useState<CombatePersonagemSelectionState>({});
  const [selectedThreatId, setSelectedThreatId] = useState(
    ameacas[0]?.id ? String(ameacas[0].id) : ""
  );
  const [threatQuantity, setThreatQuantity] = useState("1");
  const [threatDrafts, setThreatDrafts] = useState<CombateThreatDraft[]>([]);

  const selectedCombat = useMemo(
    () => combates.find((combate) => combate.id === combatId) ?? null,
    [combatId, combates]
  );
  const currentParticipant =
    selectedCombat?.participantes[selectedCombat.turnoAtual] ?? null;
  const currentParticipantId = currentParticipant?.id ?? null;
  const selectedParticipant =
    selectedCombat?.participantes.find(
      (participante) => participante.id === selectedParticipantId
    ) ??
    currentParticipant ??
    null;
  const activeCombates = combates.filter(
    (combate) => combate.status === "EM_ANDAMENTO"
  ).length;
  const totalVa = combates.reduce((total, combate) => total + combate.vaTotal, 0);

  useEffect(() => {
    setSelectedParticipantId(null);
  }, [combatId]);

  useEffect(() => {
    if (selectedCombat?.status === "EM_ANDAMENTO" && currentParticipantId) {
      setSelectedParticipantId(currentParticipantId);
    }
  }, [currentParticipantId, selectedCombat?.status]);

  useEffect(() => {
    if (selectedCombat?.status !== "EM_ANDAMENTO") return;

    const interval = window.setInterval(() => {
      router.refresh();
    }, 7000);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router, selectedCombat?.status]);

  function resetForm() {
    setFormName("");
    setFormErrors([]);
    setSelectedPersonagens({});
    setSelectedThreatId(ameacas[0]?.id ? String(ameacas[0].id) : "");
    setThreatQuantity("1");
    setThreatDrafts([]);
  }

  function togglePersonagem(personagemId: number) {
    setSelectedPersonagens((current) => ({
      ...current,
      [personagemId]: {
        selected: !current[personagemId]?.selected,
        iniciativa: current[personagemId]?.iniciativa ?? "",
      },
    }));
  }

  function setPersonagemInitiative(personagemId: number, iniciativa: string) {
    setSelectedPersonagens((current) => ({
      ...current,
      [personagemId]: {
        selected: current[personagemId]?.selected ?? true,
        iniciativa,
      },
    }));
  }

  function addThreatDrafts(overrideThreatId?: number) {
    const ameacaId = overrideThreatId ?? Number(selectedThreatId);
    const threat = ameacas.find((item) => item.id === ameacaId);
    const quantity = Number(threatQuantity);

    if (!threat || !Number.isInteger(quantity) || quantity <= 0) {
      toast.error("Selecione uma ameaça e quantidade válida.");
      return;
    }

    const nextDrafts = Array.from({ length: Math.min(quantity, 20) }, (_, index) => ({
      tempId: `${Date.now()}-${ameacaId}-${index}`,
      ameacaId,
      nome: threat.nome,
      iniciativa: "",
    }));

    setThreatDrafts((current) => [...current, ...nextDrafts]);
    setThreatQuantity("1");
  }

  function setThreatInitiative(tempId: string, iniciativa: string) {
    setThreatDrafts((current) =>
      current.map((draft) =>
        draft.tempId === tempId ? { ...draft, iniciativa } : draft
      )
    );
  }

  function removeThreatDraft(tempId: string) {
    setThreatDrafts((current) =>
      current.filter((draft) => draft.tempId !== tempId)
    );
  }

  async function createCombat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validarFormularioCombate({
      nome: formName,
      selectedPersonagens,
      threatDrafts,
      exigirIniciativaAmeacas: true,
    });

    if (errors.length > 0) {
      setFormErrors(errors);
      toast.error(errors[0]);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        nome: formName,
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
      };

      const response = await criarCombateCampanha(campanha.id, payload);
      setCombatId(response.combate.id);
      resetForm();
      setCreateOpen(false);
      toast.success("Combate criado.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar combate.");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(
    combate: CombateDetail,
    action: CombatTurnAction
  ) {
    setLoading(true);

    try {
      await executarAcaoCombateCampanha(campanha.id, combate.id, { action });
      setCombatId(combate.id);
      if (action === "proximo" || action === "voltar" || action === "iniciar") {
        setSelectedParticipantId(null);
      }
      toast.success(actionMessage(action));
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar combate."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateThreatParticipant(
    participant: CombateParticipanteView,
    hpAtual: number,
    manaAtual: number
  ) {
    if (!selectedCombat || participant.tipo !== "AMEACA") return;

    setLoading(true);

    try {
      await executarAcaoCombateCampanha(campanha.id, selectedCombat.id, {
        action: "atualizar_ameaca",
        participanteId: participant.id,
        hpAtual,
        manaAtual,
      });
      setSelectedParticipantId(participant.id);
      toast.success("Ameaça atualizada.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar ameaça."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateThreatReaction(
    participant: CombateParticipanteView,
    action: "usar_reacao_ameaca" | "resetar_reacoes_ameaca",
    tipo?: "bloqueio" | "esquiva" | "contra"
  ) {
    if (!selectedCombat || participant.tipo !== "AMEACA") return;

    setLoading(true);

    try {
      await executarAcaoCombateCampanha(
        campanha.id,
        selectedCombat.id,
        action === "usar_reacao_ameaca"
          ? {
              action,
              participanteId: participant.id,
              tipo: tipo ?? "bloqueio",
            }
          : {
              action,
              participanteId: participant.id,
            }
      );
      setSelectedParticipantId(participant.id);
      toast.success(action === "usar_reacao_ameaca" ? "Reação usada." : "Reações resetadas.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar reação."
      );
    } finally {
      setLoading(false);
    }
  }

  function selectParticipant(participant: CombateParticipanteView) {
    setSelectedParticipantId(participant.id);

    if (!window.matchMedia("(min-width: 1280px)").matches) {
      setDetailsOpen(true);
    }
  }

  async function deleteCombat(combate: CombateDetail) {
    if (!window.confirm(`Excluir o combate "${combate.nome}"?`)) return;

    setLoading(true);

    try {
      await excluirCombateCampanha(campanha.id, combate.id);
      if (combatId === combate.id) {
        setCombatId(combates.find((item) => item.id !== combate.id)?.id ?? null);
      }
      toast.success("Combate excluído.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir combate.");
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
      }}
      activeSection="combates"
      currentLabel="Combates"
      personagensCount={personagensCount}
      inventarioCount={inventarioCount}
      npcsCount={npcsCount}
      combatesCount={combates.length}
      bestiarioCount={bestiarioCount}
    >
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 py-5 sm:gap-6 sm:px-4 sm:py-8">
        <section className="overflow-hidden rounded-lg border border-border/70 bg-card/75 shadow-sm">
          <CampanhaSectionHeader
            icon={Swords}
            eyebrow="Encontros"
            title="Combates da campanha"
            description="Monte a iniciativa, acompanhe rodadas e consulte fichas rápidas sem alterar os dados base."
            tone="sky"
            meta={`${combates.length} combate${combates.length !== 1 ? "s" : ""} · ${activeCombates} em andamento · VA ${formatVa(totalVa)}`}
            actions={
              <Button
                asChild
                size="sm"
                className="gap-2 bg-white text-zinc-950 hover:bg-white/90"
              >
                <Link href={`/campanhas/escudo/${campanha.id}/combates/criar`}>
                  <Plus className="h-4 w-4" />
                  Criar combate
                </Link>
              </Button>
            }
          />

          <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(18rem,0.82fr)_minmax(0,1.38fr)]">
            <section className="grid content-start gap-3">
              <div className="rounded-lg border border-border/70 bg-background p-3 shadow-xs">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Resumo
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <DetailStat label="Total" value={combates.length} compact />
                  <DetailStat label="Ativos" value={activeCombates} compact />
                  <DetailStat label="VA" value={formatVa(totalVa)} compact />
                </div>
              </div>

              {combates.map((combate) => (
                <article
                  key={combate.id}
                  className={cn(
                    "cursor-pointer rounded-lg border bg-background p-4 shadow-xs transition hover:border-primary/35 hover:bg-accent/35",
                    combate.id === selectedCombat?.id
                      ? "border-primary/60 bg-primary/5 shadow-sm ring-1 ring-primary/15"
                      : "hover:border-primary/30"
                  )}
                  onClick={() => setCombatId(combate.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-left font-semibold">
                        {combate.nome}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {STATUS_LABEL[combate.status]} · {combate.participantesCount} participantes · VA {formatVa(combate.vaTotal)}
                      </p>
                    </div>
                    <StatusBadge status={combate.status} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        setCombatId(combate.id);
                      }}
                    >
                      {combate.status === "ENCERRADO" ? "Ver encerrado" : "Abrir"}
                    </Button>
                    {combate.status === "RASCUNHO" ? (
                      <Button
                        type="button"
                        size="sm"
                        className="gap-2"
                        disabled={loading}
                        onClick={(event) => {
                          event.stopPropagation();
                          runAction(combate, "iniciar");
                        }}
                      >
                        <Play className="h-4 w-4" />
                        Iniciar
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-2 text-destructive hover:text-destructive"
                      disabled={loading}
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteCombat(combate);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </article>
              ))}

              {combates.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Nenhum combate criado para esta campanha ainda.
                </p>
              ) : null}
            </section>

            <section className="min-w-0">
              {selectedCombat ? (
                <CombatMode
                  combate={selectedCombat}
                  selectedParticipant={selectedParticipant}
                  currentParticipant={currentParticipant}
                  loading={loading}
                  onAction={(action) => runAction(selectedCombat, action)}
                  onSelectParticipant={selectParticipant}
                  onUpdateThreat={updateThreatParticipant}
                  onThreatReaction={updateThreatReaction}
                />
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
                  Crie ou selecione um combate para acompanhar a rodada.
                </div>
              )}
            </section>
          </div>
        </section>
      </main>

      <CreateCombatDialog
        open={createOpen}
        loading={loading}
        personagens={personagens}
        ameacas={ameacas}
        formName={formName}
        selectedPersonagens={selectedPersonagens}
        selectedThreatId={selectedThreatId}
        threatQuantity={threatQuantity}
        threatDrafts={threatDrafts}
        errors={formErrors}
        onOpenChange={setCreateOpen}
        onSubmit={createCombat}
        onNameChange={setFormName}
        onTogglePersonagem={togglePersonagem}
        onPersonagemInitiativeChange={setPersonagemInitiative}
        onThreatIdChange={setSelectedThreatId}
        onThreatQuantityChange={setThreatQuantity}
        onAddThreats={addThreatDrafts}
        onThreatInitiativeChange={setThreatInitiative}
        onRemoveThreat={removeThreatDraft}
      />

      <Drawer open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DrawerContent className="h-[92svh] max-h-[92svh] overflow-hidden">
          <DrawerHeader className="shrink-0 border-b bg-card/80 text-left">
            <DrawerTitle>{selectedParticipant?.nome ?? "Participante"}</DrawerTitle>
            <DrawerDescription>Consulta rápida do combate.</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {selectedParticipant ? (
            <ParticipantDetails
              key={`${selectedParticipant.id}-${selectedParticipant.hp}-${selectedParticipant.mana}`}
              participant={selectedParticipant}
              loading={loading}
              onUpdateThreat={updateThreatParticipant}
              onThreatReaction={updateThreatReaction}
            />
          ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </EscudoLayoutShell>
  );
}

function CombatMode({
  combate,
  selectedParticipant,
  currentParticipant,
  loading,
  onAction,
  onSelectParticipant,
  onUpdateThreat,
  onThreatReaction,
}: {
  combate: CombateDetail;
  selectedParticipant: CombateParticipanteView | null;
  currentParticipant: CombateParticipanteView | null;
  loading: boolean;
  onAction: (action: CombatTurnAction) => void;
  onSelectParticipant: (participant: CombateParticipanteView) => void;
  onUpdateThreat: (
    participant: CombateParticipanteView,
    hpAtual: number,
    manaAtual: number
  ) => void;
  onThreatReaction: (
    participant: CombateParticipanteView,
    action: "usar_reacao_ameaca" | "resetar_reacoes_ameaca",
    tipo?: "bloqueio" | "esquiva" | "contra"
  ) => void;
}) {
  const [mobileTab, setMobileTab] = useState<CombatMobileTab>("turno");

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <article className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-background shadow-xs">
        <div className="flex flex-col gap-3 border-b bg-card/55 p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">{combate.nome}</h3>
            <p className="text-sm text-muted-foreground">
              {STATUS_LABEL[combate.status]} · Rodada {combate.rodadaAtual} · VA {formatVa(combate.vaTotal)}
            </p>
          </div>
          <CombatTurnActions
            className="hidden md:flex md:flex-wrap"
            combate={combate}
            loading={loading}
            onAction={onAction}
          />
        </div>

        <div
          className={cn(
            "grid gap-3 border-b bg-muted/25 p-3",
            mobileTab !== "turno" && "hidden md:grid"
          )}
        >
          <CurrentTurnCard
            combate={combate}
            participant={currentParticipant}
            onSelectParticipant={onSelectParticipant}
          />
        </div>

        <div
          className={cn(
            "grid gap-2 p-2 sm:p-3",
            mobileTab !== "ordem" && "hidden md:grid"
          )}
        >
          {combate.participantes.map((participant, index) => {
            const isActive =
              combate.status === "EM_ANDAMENTO" &&
              currentParticipant?.id === participant.id;
            const isSelected = selectedParticipant?.id === participant.id;
            const Icon = participant.tipo === "AMEACA" ? Skull : Users;

            return (
              <button
                key={participant.id}
                type="button"
                className={cn(
                  "grid min-h-18 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-lg border bg-card/75 p-3 text-left transition hover:border-primary/40 hover:bg-accent/35 sm:grid-cols-[2.5rem_minmax(0,1fr)]",
                  isActive
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/20"
                    : participant.tipo === "AMEACA"
                      ? "border-red-500/30 bg-red-50/70 hover:border-red-500/45 dark:bg-red-950/10"
                      : "border-border/70",
                  isSelected && !isActive
                    ? "border-primary/45 ring-1 ring-primary/15"
                    : ""
                )}
                onClick={() => onSelectParticipant(participant)}
              >
                <span className="relative flex h-9 w-9 items-center justify-center rounded-md border bg-background text-sm font-semibold">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border bg-card px-1 text-[10px] leading-none">
                    {index + 1}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="truncate font-medium">{participant.nome}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {isActive ? (
                        <span className="rounded-md border border-primary/35 bg-primary/12 px-2 py-1 text-xs font-medium text-primary">
                          Turno atual
                        </span>
                      ) : null}
                      <span className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
                        Iniciativa {participant.iniciativa}
                      </span>
                    </span>
                  </span>
                  <span className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <InlineStat icon={<HeartPulse className="h-3.5 w-3.5" />} label="PV" value={participant.hp ?? "-"} />
                    <InlineStat icon={<Zap className="h-3.5 w-3.5" />} label="Mana" value={participant.mana ?? "-"} />
                    <InlineStat icon={<Shield className="h-3.5 w-3.5" />} label="Defesa" value={participant.defesa ?? "-"} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={cn(
            "grid gap-3 border-t bg-muted/20 p-3 md:hidden",
            mobileTab !== "acoes" && "hidden"
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Ações de turno
          </p>
          <CombatTurnActions
            className="grid grid-cols-2 gap-2"
            combate={combate}
            loading={loading}
            onAction={onAction}
          />
        </div>

        <div className="h-20 md:hidden" aria-hidden="true" />
        <CombatBottomNav
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          disabled={loading}
        />
      </article>

      <aside className="hidden self-start rounded-lg border border-border/70 bg-background p-4 shadow-xs xl:sticky xl:top-24 xl:block xl:max-h-[calc(100svh-7rem)] xl:overflow-y-auto">
        {selectedParticipant ? (
          <ParticipantDetails
            key={`${selectedParticipant.id}-${selectedParticipant.hp}-${selectedParticipant.mana}`}
            participant={selectedParticipant}
            loading={loading}
            onUpdateThreat={onUpdateThreat}
            onThreatReaction={onThreatReaction}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Selecione um participante para ver detalhes rápidos.
          </p>
        )}
      </aside>
    </div>
  );
}

function CombatTurnActions({
  combate,
  loading,
  onAction,
  className,
}: {
  combate: CombateDetail;
  loading: boolean;
  onAction: (action: CombatTurnAction) => void;
  className?: string;
}) {
  if (combate.status === "RASCUNHO") {
    return (
      <div className={cn("gap-2", className)}>
        <Button
          type="button"
          size="sm"
          className="gap-2"
          disabled={loading}
          onClick={() => onAction("iniciar")}
        >
          <Play className="h-4 w-4" />
          Iniciar
        </Button>
      </div>
    );
  }

  if (combate.status !== "EM_ANDAMENTO") {
    return null;
  }

  return (
    <div className={cn("gap-2", className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-2"
        disabled={loading}
        onClick={() => onAction("voltar")}
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </Button>
      <Button
        type="button"
        size="sm"
        className="gap-2"
        disabled={loading}
        onClick={() => onAction("proximo")}
      >
        Próximo
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="col-span-2"
        disabled={loading}
        onClick={() => onAction("encerrar")}
      >
        Encerrar
      </Button>
    </div>
  );
}

function CombatBottomNav({
  activeTab,
  disabled,
  onTabChange,
}: {
  activeTab: CombatMobileTab;
  disabled: boolean;
  onTabChange: (tab: CombatMobileTab) => void;
}) {
  const items: Array<{
    value: CombatMobileTab;
    label: string;
    icon: typeof Swords;
  }> = [
    { value: "turno", label: "Turno", icon: Swords },
    { value: "ordem", label: "Ordem", icon: Users },
    { value: "acoes", label: "Ações", icon: Shield },
  ];

  return (
    <nav
      aria-label="Navegação do combate"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto grid max-w-md grid-cols-3 gap-1 rounded-2xl border border-border/70 bg-background/94 p-1.5 shadow-2xl shadow-black/20 backdrop-blur md:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.value;

        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onTabChange(item.value)}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-semibold transition disabled:opacity-60",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function CurrentTurnCard({
  combate,
  participant,
  onSelectParticipant,
}: {
  combate: CombateDetail;
  participant: CombateParticipanteView | null;
  onSelectParticipant: (participant: CombateParticipanteView) => void;
}) {
  if (combate.status !== "EM_ANDAMENTO" || !participant) {
    return (
      <div className="rounded-lg border border-dashed bg-background/80 p-4 text-sm text-muted-foreground">
        {combate.status === "RASCUNHO"
          ? "Inicie o combate para destacar o turno atual."
          : "Combate encerrado. Consulte os participantes abaixo."}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="group grid gap-3 rounded-lg border border-primary/35 bg-primary/10 p-4 text-left shadow-xs transition hover:border-primary/55 hover:bg-primary/15 dark:bg-primary/12"
      onClick={() => onSelectParticipant(participant)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Turno atual
          </p>
          <h4 className="mt-1 truncate text-lg font-semibold text-foreground">
            {participant.nome}
          </h4>
        </div>
        <span className="rounded-md border border-primary/35 bg-background px-2.5 py-1 text-xs font-medium text-primary">
          Rodada {combate.rodadaAtual}
        </span>
      </div>
      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <InlineStat
          icon={<HeartPulse className="h-3.5 w-3.5" />}
          label="PV"
          value={participant.hp ?? "-"}
        />
        <InlineStat
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Mana"
          value={participant.mana ?? "-"}
        />
        <InlineStat
          icon={<Shield className="h-3.5 w-3.5" />}
          label="Defesa"
          value={participant.defesa ?? "-"}
        />
      </div>
    </button>
  );
}

function ParticipantDetails({
  participant,
  loading,
  onUpdateThreat,
  onThreatReaction,
}: {
  participant: CombateParticipanteView;
  loading: boolean;
  onUpdateThreat: (
    participant: CombateParticipanteView,
    hpAtual: number,
    manaAtual: number
  ) => void;
  onThreatReaction: (
    participant: CombateParticipanteView,
    action: "usar_reacao_ameaca" | "resetar_reacoes_ameaca",
    tipo?: "bloqueio" | "esquiva" | "contra"
  ) => void;
}) {
  const [hpAtual, setHpAtual] = useState(String(participant.hp ?? 0));
  const [manaAtual, setManaAtual] = useState(String(participant.mana ?? 0));
  const threatReactionRows =
    participant.detalhe.tipo === "AMEACA"
      ? [
          {
            tipo: "esquiva" as const,
            usados: participant.detalhe.reacoesUsadas.esquiva,
            limite: participant.detalhe.reacoes.esquiva,
            onUse: () =>
              onThreatReaction(participant, "usar_reacao_ameaca", "esquiva"),
          },
          {
            tipo: "bloqueio" as const,
            usados: participant.detalhe.reacoesUsadas.bloqueio,
            limite: participant.detalhe.reacoes.bloqueio,
            onUse: () =>
              onThreatReaction(participant, "usar_reacao_ameaca", "bloqueio"),
          },
          {
            tipo: "contra" as const,
            usados: participant.detalhe.reacoesUsadas.contraAtaque,
            limite: participant.detalhe.reacoes.contraAtaque,
            onUse: () =>
              onThreatReaction(participant, "usar_reacao_ameaca", "contra"),
          },
        ]
      : [];

  function saveThreatValues(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hp = Number(hpAtual);
    const mana = Number(manaAtual);

    if (!Number.isInteger(hp) || hp < 0 || !Number.isInteger(mana) || mana < 0) {
      toast.error("PV e mana precisam ser números inteiros positivos.");
      return;
    }

    onUpdateThreat(participant, hp, mana);
  }

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Participante
        </p>
        <h3 className="mt-1 text-lg font-semibold">{participant.nome}</h3>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <DetailStat label="PV" value={participant.hp ?? "-"} />
        <DetailStat label="Mana" value={participant.mana ?? "-"} />
        <DetailStat label="Defesa" value={participant.defesa ?? "-"} />
      </div>

      <div className="space-y-3 rounded-lg border bg-card p-3 shadow-xs">
        <ResourceBar
          label="Vida"
          value={participant.hp ?? 0}
          max={
            participant.detalhe.tipo === "AMEACA"
              ? participant.detalhe.hpMax
              : participant.hp ?? 0
          }
          className="bg-red-500"
        />
        <ResourceBar
          label="Mana"
          value={participant.mana ?? 0}
          max={
            participant.detalhe.tipo === "AMEACA"
              ? participant.detalhe.manaMax
              : participant.mana ?? 0
          }
          className="bg-purple-600"
        />
      </div>

      {participant.detalhe.tipo === "AMEACA" ? (
        <>
          <form
            onSubmit={saveThreatValues}
            className="grid gap-3 rounded-lg border border-red-500/25 bg-red-950/10 p-3"
          >
            <p className="text-sm font-medium">Estado da ameaça</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">PV atual</span>
                <Input
                  type="number"
                  min="0"
                  value={hpAtual}
                  onChange={(event) => setHpAtual(event.target.value)}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-muted-foreground">Mana atual</span>
                <Input
                  type="number"
                  min="0"
                  value={manaAtual}
                  onChange={(event) => setManaAtual(event.target.value)}
                />
              </label>
            </div>
            <Button type="submit" size="sm" disabled={loading}>
              Salvar PV e mana
            </Button>
          </form>
          <ReactiveSlotsPanel
            title="Reações"
            description="Slots reativos desta ameaça no combate."
            rows={threatReactionRows}
            canEdit
            disabled={loading}
            hideUnavailable
            onReset={() =>
              onThreatReaction(participant, "resetar_reacoes_ameaca")
            }
            emptyState={
              <p className="rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground shadow-xs">
                Esta ameaça não possui slots de reação.
              </p>
            }
          />
          <div>
            <p className="mb-2 text-sm font-medium">Golpes</p>
            <div className="grid gap-2">
              {participant.detalhe.golpes.map((golpe) => (
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
        </>
      ) : (
        <>
          <div className="rounded-lg border bg-card p-3 shadow-xs">
            <p className="text-sm font-medium">Slots defensivos</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Esquiva {participant.detalhe.slotsDefensivos?.esquivaUsada ?? 0} ·
              Bloqueio {participant.detalhe.slotsDefensivos?.bloqueioUsado ?? 0} ·
              Contra{" "}
              {participant.detalhe.slotsDefensivos?.contraAtaqueUsado ?? 0}
            </p>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Magias</p>
            <div className="grid gap-2">
              {participant.detalhe.magias.map((magia) => (
                <div key={magia.nome} className="rounded-lg border bg-card p-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{magia.nome}</p>
                    {magia.custo_nivel ? (
                      <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                        {magia.custo_nivel} mana
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {magia.descricao}
                  </p>
                </div>
              ))}
              {participant.detalhe.magias.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  Nenhuma magia cadastrada.
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CreateCombatDialog({
  open,
  loading,
  personagens,
  ameacas,
  formName,
  selectedPersonagens,
  selectedThreatId,
  threatQuantity,
  threatDrafts,
  errors,
  onOpenChange,
  onSubmit,
  onNameChange,
  onTogglePersonagem,
  onPersonagemInitiativeChange,
  onThreatIdChange,
  onThreatQuantityChange,
  onAddThreats,
  onThreatInitiativeChange,
  onRemoveThreat,
}: {
  open: boolean;
  loading: boolean;
  personagens: CombateCatalogoPersonagem[];
  ameacas: CombateCatalogoAmeaca[];
  formName: string;
  selectedPersonagens: CombatePersonagemSelectionState;
  selectedThreatId: string;
  threatQuantity: string;
  threatDrafts: CombateThreatDraft[];
  errors: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNameChange: (value: string) => void;
  onTogglePersonagem: (personagemId: number) => void;
  onPersonagemInitiativeChange: (personagemId: number, iniciativa: string) => void;
  onThreatIdChange: (value: string) => void;
  onThreatQuantityChange: (value: string) => void;
  onAddThreats: (ameacaId?: number) => void;
  onThreatInitiativeChange: (tempId: string, iniciativa: string) => void;
  onRemoveThreat: (tempId: string) => void;
}) {
  const [threatQuery, setThreatQuery] = useState("");
  const [visibleThreats, setVisibleThreats] = useState(8);
  const deferredThreatQuery = useDeferredValue(threatQuery);
  const vaTotal = threatDrafts.reduce((total, draft) => {
    const threat = ameacas.find((item) => item.id === draft.ameacaId);
    return total + (threat?.va ?? 0);
  }, 0);
  const selectedThreat = ameacas.find(
    (ameaca) => String(ameaca.id) === selectedThreatId
  ) ?? ameacas[0] ?? null;
  const filteredThreats = useMemo(() => {
    const query = normalizeSearch(deferredThreatQuery);
    return ameacas.filter((ameaca) => {
      if (!query) return true;

      return normalizeSearch(
        [
          ameaca.nome,
          ameaca.tipo,
          ameaca.elemento,
          ameaca.funcao,
          ameaca.descricao,
          ameaca.golpes.map((golpe) => golpe.nome).join(" "),
        ].join(" ")
      ).includes(query);
    });
  }, [ameacas, deferredThreatQuery]);
  const visibleThreatList = filteredThreats.slice(0, visibleThreats);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Criar combate</DialogTitle>
          <DialogDescription>
            Selecione participantes, adicione ameaças e informe a iniciativa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-5">
          {errors.length > 0 ? (
            <div className="rounded-lg border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-100">
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}

          <label className="grid gap-2">
            <span className="text-sm font-medium">Nome do combate</span>
            <Input
              value={formName}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Emboscada na estrada"
            />
          </label>

          <section className="grid gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Personagens</h3>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {personagens.map((personagem) => {
                const state = selectedPersonagens[personagem.id];
                const selected = Boolean(state?.selected);

                return (
                  <div
                    key={personagem.id}
                    className={cn(
                      "grid gap-3 rounded-lg border bg-card p-3 shadow-xs",
                      selected ? "border-primary/45" : ""
                    )}
                  >
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onTogglePersonagem(personagem.id)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {personagem.nome}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {personagem.racaNome ?? "Raça"} ·{" "}
                          {personagem.classeNome ?? "Classe"}
                        </span>
                      </span>
                    </label>
                    {selected ? (
                      <Input
                        type="number"
                        placeholder="Iniciativa"
                        value={state?.iniciativa ?? ""}
                        onChange={(event) =>
                          onPersonagemInitiativeChange(
                            personagem.id,
                            event.target.value
                          )
                        }
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Skull className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Ameaças</h3>
              </div>
              <span className="text-sm text-muted-foreground">
                VA selecionado: {formatVa(vaTotal)}
              </span>
            </div>
            <div className="grid gap-3 rounded-lg border border-red-500/25 bg-red-950/15 p-3 text-white">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-100/65" />
                <input
                  type="search"
                  value={threatQuery}
                  onChange={(event) => {
                    setThreatQuery(event.target.value);
                    setVisibleThreats(8);
                  }}
                  placeholder="Buscar por nome, função, elemento ou golpe..."
                  className="h-10 w-full rounded-md border border-red-300/20 bg-black/35 pl-10 pr-3 text-sm outline-none placeholder:text-red-100/50 focus:border-red-300/70 focus:ring-2 focus:ring-red-500/25"
                />
              </label>

              <div className="grid max-h-96 gap-2 overflow-y-auto pr-1">
                {visibleThreatList.map((ameaca) => (
                  <ThreatOptionCard
                    key={ameaca.id}
                    ameaca={ameaca}
                    selected={selectedThreat?.id === ameaca.id}
                    onSelect={() => onThreatIdChange(String(ameaca.id))}
                    onAdd={() => {
                      onThreatIdChange(String(ameaca.id));
                      onAddThreats(ameaca.id);
                    }}
                  />
                ))}
                {visibleThreatList.length === 0 ? (
                  <p className="rounded-md border border-red-300/20 p-4 text-sm text-red-100/75">
                    Nenhuma ameaça encontrada.
                  </p>
                ) : null}
              </div>

              {filteredThreats.length > visibleThreats ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-200/35 bg-black/20 text-white hover:bg-red-500/20 hover:text-white"
                  onClick={() => setVisibleThreats((current) => current + 8)}
                >
                  Carregar mais ameaças
                </Button>
              ) : null}

              <div className="grid gap-2 rounded-lg border border-red-300/20 bg-black/30 p-3 md:grid-cols-[minmax(0,1fr)_7rem_auto] md:items-end">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-red-100/60">
                    Selecionada
                  </p>
                  <p className="truncate font-semibold">
                    {selectedThreat?.nome ?? "Nenhuma ameaça"}
                  </p>
                  {selectedThreat ? (
                    <div className="mt-2 grid gap-1 text-xs text-red-50/70 sm:grid-cols-2">
                      <span>
                        PV {selectedThreat.pv} · Mana {selectedThreat.mana}
                      </span>
                      <span>Defesa {selectedThreat.defesa}</span>
                      <span className="sm:col-span-2">
                        Reações: B {selectedThreat.reacoes.bloqueio} · E{" "}
                        {selectedThreat.reacoes.esquiva} · C{" "}
                        {selectedThreat.reacoes.contraAtaque}
                      </span>
                    </div>
                  ) : null}
                </div>
                <label className="grid gap-1">
                  <span className="text-xs text-red-100/70">Qtd.</span>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={threatQuantity}
                    onChange={(event) => onThreatQuantityChange(event.target.value)}
                    aria-label="Quantidade de ameaças"
                    className="bg-black/35 text-white"
                  />
                </label>
                <Button
                  type="button"
                  className="gap-2 bg-red-600 hover:bg-red-500"
                  onClick={() => onAddThreats()}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {threatDrafts.map((draft, index) => (
                <div
                  key={draft.tempId}
                  className="grid gap-3 rounded-lg border bg-card p-3 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {draft.nome} {index + 1}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ameaça do bestiário
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => onRemoveThreat(draft.tempId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    type="number"
                    placeholder="Iniciativa"
                    value={draft.iniciativa}
                    onChange={(event) =>
                      onThreatInitiativeChange(draft.tempId, event.target.value)
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              Criar combate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: CombateDetail["status"] }) {
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-1 text-xs font-medium",
        status === "EM_ANDAMENTO" &&
          "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
        status === "RASCUNHO" &&
          "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-200",
        status === "ENCERRADO" &&
          "border-zinc-400/40 bg-zinc-500/10 text-muted-foreground"
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function ThreatOptionCard({
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
    <article
      className={cn(
        "relative overflow-hidden rounded-md border border-red-300/15 bg-black/35 text-white transition hover:border-red-200/55",
        selected && "border-red-200/70 shadow-[0_0_0_1px_rgba(248,113,113,0.5)]"
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_35%,rgba(239,68,68,0.22),transparent_30%),linear-gradient(90deg,rgba(127,29,29,0.72),rgba(69,10,10,0.28))]" />
      <div className="relative grid min-h-28 gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <button type="button" className="min-w-0 text-left" onClick={onSelect}>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-base font-semibold">{ameaca.nome}</h4>
            <span className="rounded-md border border-red-200/25 bg-black/25 px-2 py-0.5 text-xs text-red-50/85">
              VA {formatVa(ameaca.va)}
            </span>
          </div>
          <p className="mt-1 text-sm text-red-50/80">
            {ameaca.elemento} · {ameaca.funcao}
          </p>
          <div className="mt-3 grid gap-2 text-xs text-red-50/75 sm:grid-cols-3">
            <span>PV {ameaca.pv}</span>
            <span>Mana {ameaca.mana}</span>
            <span>Defesa {ameaca.defesa}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-red-50/60">
            {ameaca.descricao}
          </p>
        </button>
        <div className="flex gap-2 sm:flex-col">
          <Button
            type="button"
            variant="outline"
            className="border-white/55 bg-black/15 text-white hover:bg-white/10 hover:text-white"
            onClick={onSelect}
          >
            Ficha
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-500"
            onClick={onAdd}
          >
            Adicionar
          </Button>
        </div>
      </div>
    </article>
  );
}

function InlineStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {label}: {value}
    </span>
  );
}

function DetailStat({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-3 shadow-xs", compact && "p-2")}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 font-semibold", compact ? "text-base" : "text-lg")}>
        {value}
      </p>
    </div>
  );
}

function ResourceBar({
  label,
  value,
  max,
  className,
}: {
  label: string;
  value: number;
  max: number;
  className: string;
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px] text-muted-foreground">
        <span className="font-medium">{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-slate-200 dark:bg-white/6">
        <div
          className={cn("h-full transition-all duration-300", className)}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

function actionMessage(action: CombatTurnAction) {
  if (action === "iniciar") return "Combate iniciado.";
  if (action === "proximo") return "Turno avançado.";
  if (action === "voltar") return "Turno anterior.";
  return "Combate encerrado.";
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatVa(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
}
