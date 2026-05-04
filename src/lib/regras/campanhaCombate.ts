import type { Prisma } from "@prisma/client";

import type {
  CombateActionPayload,
  CombateParticipanteTipoValue,
  CombatePersonagemSelectionState,
  CombateThreatDraft,
} from "@/types/combate";

export class CampanhaCombateError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CampanhaCombateError";
    this.status = status;
  }
}

export type PreparedCombateParticipant = {
  tipo: CombateParticipanteTipoValue;
  personagemId?: number;
  ameacaId?: number;
  nome: string;
  iniciativa: number;
  ordem: number;
  hpAtual?: number;
  manaAtual?: number;
};

export type CombatePersonagemOption = {
  id: number;
  nome: string;
};

export type CombateAmeacaOption = {
  id: number;
  nome: string;
  va: number;
  pv?: number;
  mana?: number;
  defesa?: number;
};

type OrderedParticipantInput = {
  id?: number;
  nome: string;
  iniciativa: number;
};

function toPositiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toInitiative(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function toNonNegativeInt(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function parseCombateId(value: string) {
  return toPositiveInt(value);
}

export function validarFormularioCombate({
  nome,
  selectedPersonagens,
  threatDrafts,
  exigirIniciativaAmeacas,
}: {
  nome: string;
  selectedPersonagens: CombatePersonagemSelectionState;
  threatDrafts: CombateThreatDraft[];
  exigirIniciativaAmeacas: boolean;
}) {
  const errors: string[] = [];
  const personagens = Object.values(selectedPersonagens).filter(
    (item) => item.selected
  );

  if (nome.trim().length < 2) {
    errors.push("Informe o nome do combate.");
  }

  if (personagens.length + threatDrafts.length === 0) {
    errors.push("Adicione pelo menos um personagem ou ameaça.");
  }

  if (
    personagens.some(
      (personagem) =>
        personagem.iniciativa.trim() === "" ||
        !Number.isInteger(Number(personagem.iniciativa))
    )
  ) {
    errors.push("Informe a iniciativa de todos os personagens selecionados.");
  }

  if (
    exigirIniciativaAmeacas &&
    threatDrafts.some(
      (ameaca) =>
        ameaca.iniciativa.trim() === "" ||
        !Number.isInteger(Number(ameaca.iniciativa))
    )
  ) {
    errors.push("Informe a iniciativa de todas as ameaças adicionadas.");
  }

  return errors;
}

export function prepararAcaoCombate(body: unknown): CombateActionPayload {
  if (!isRecord(body)) {
    throw new CampanhaCombateError("Ação inválida.");
  }

  const action = String(body.action ?? "");
  if (
    action !== "iniciar" &&
    action !== "proximo" &&
    action !== "voltar" &&
    action !== "encerrar" &&
    action !== "atualizar_ameaca" &&
    action !== "usar_reacao_ameaca" &&
    action !== "resetar_reacoes_ameaca"
  ) {
    throw new CampanhaCombateError("Ação de combate inválida.");
  }

  return { action } as CombateActionPayload;
}

export function prepararDadosCombate(
  body: unknown,
  personagens: CombatePersonagemOption[],
  ameacas: CombateAmeacaOption[]
) {
  if (!isRecord(body)) {
    throw new CampanhaCombateError("Dados do combate inválidos.");
  }

  const nome = String(body.nome ?? "").trim();
  if (nome.length < 2) {
    throw new CampanhaCombateError("Informe um nome para o combate.");
  }

  const personagemInputs = Array.isArray(body.personagens)
    ? body.personagens
    : [];
  const ameacaInputs = Array.isArray(body.ameacas) ? body.ameacas : [];

  if (personagemInputs.length + ameacaInputs.length === 0) {
    throw new CampanhaCombateError(
      "Adicione pelo menos um participante ao combate."
    );
  }

  const personagensById = new Map(personagens.map((item) => [item.id, item]));
  const ameacasById = new Map(ameacas.map((item) => [item.id, item]));
  const selectedPersonagemIds = new Set<number>();
  const participantes: PreparedCombateParticipant[] = [];

  for (const input of personagemInputs) {
    if (!isRecord(input)) {
      throw new CampanhaCombateError("Personagem inválido no combate.");
    }

    const personagemId = toPositiveInt(input.personagemId);
    const iniciativa = toInitiative(input.iniciativa);

    if (!personagemId || !personagensById.has(personagemId)) {
      throw new CampanhaCombateError(
        "Um dos personagens não pertence a esta campanha."
      );
    }

    if (selectedPersonagemIds.has(personagemId)) {
      throw new CampanhaCombateError(
        "O mesmo personagem não pode entrar duas vezes no combate."
      );
    }

    if (iniciativa === null) {
      throw new CampanhaCombateError(
        "Informe a iniciativa de todos os personagens."
      );
    }

    selectedPersonagemIds.add(personagemId);
    participantes.push({
      tipo: "PERSONAGEM",
      personagemId,
      nome: personagensById.get(personagemId)?.nome ?? "Personagem",
      iniciativa,
      ordem: 0,
    });
  }

  const ameacaCounters = new Map<number, number>();
  let vaTotal = 0;

  for (const input of ameacaInputs) {
    if (!isRecord(input)) {
      throw new CampanhaCombateError("Ameaça inválida no combate.");
    }

    const ameacaId = toPositiveInt(input.ameacaId);
    const ameaca = ameacaId ? ameacasById.get(ameacaId) : null;
    const iniciativa = toInitiative(input.iniciativa) ?? ameaca?.defesa ?? null;

    if (!ameacaId || !ameaca) {
      throw new CampanhaCombateError("Uma das ameaças não existe no bestiário.");
    }

    if (iniciativa === null) {
      throw new CampanhaCombateError(
        "Informe a iniciativa de todas as ameaças."
      );
    }

    const count = (ameacaCounters.get(ameacaId) ?? 0) + 1;
    ameacaCounters.set(ameacaId, count);
    vaTotal += ameaca.va;

    participantes.push({
      tipo: "AMEACA",
      ameacaId,
      nome: `${ameaca.nome} ${count}`,
      iniciativa,
      ordem: 0,
      hpAtual: ameaca.pv,
      manaAtual: ameaca.mana,
    });
  }

  const ordered = ordenarParticipantes(participantes).map((participante, index) => ({
    ...participante,
    ordem: index,
  }));

  return {
    nome,
    vaTotal,
    participantes: ordered,
  };
}

export function prepararAtualizacaoAmeacaCombate(body: unknown) {
  if (!isRecord(body)) {
    throw new CampanhaCombateError("Dados da ameaça inválidos.");
  }

  const participanteId = toPositiveInt(body.participanteId);
  const hpAtual = toNonNegativeInt(body.hpAtual);
  const manaAtual = toNonNegativeInt(body.manaAtual);

  if (!participanteId) {
    throw new CampanhaCombateError("Participante inválido.");
  }

  if (hpAtual === null || manaAtual === null) {
    throw new CampanhaCombateError(
      "PV e mana da ameaça precisam ser valores válidos."
    );
  }

  return { participanteId, hpAtual, manaAtual };
}

export function prepararReacaoAmeacaCombate(body: unknown) {
  if (!isRecord(body)) {
    throw new CampanhaCombateError("Dados da reação inválidos.");
  }

  const participanteId = toPositiveInt(body.participanteId);
  const tipo = String(body.tipo ?? "");

  if (!participanteId) {
    throw new CampanhaCombateError("Participante inválido.");
  }

  if (tipo !== "bloqueio" && tipo !== "esquiva" && tipo !== "contra") {
    throw new CampanhaCombateError("Tipo de reação inválido.");
  }

  return { participanteId, tipo };
}

export function ordenarParticipantes<T extends OrderedParticipantInput>(
  participantes: T[]
) {
  return [...participantes].sort(
    (a, b) => b.iniciativa - a.iniciativa || a.nome.localeCompare(b.nome)
  );
}

export function resolverProximoTurno({
  turnoAtual,
  rodadaAtual,
  totalParticipantes,
}: {
  turnoAtual: number;
  rodadaAtual: number;
  totalParticipantes: number;
}) {
  if (totalParticipantes <= 0) {
    throw new CampanhaCombateError("Combate sem participantes.");
  }

  if (turnoAtual >= totalParticipantes - 1) {
    return { turnoAtual: 0, rodadaAtual: rodadaAtual + 1 };
  }

  return { turnoAtual: turnoAtual + 1, rodadaAtual };
}

export function resolverTurnoAnterior({
  turnoAtual,
  rodadaAtual,
  totalParticipantes,
}: {
  turnoAtual: number;
  rodadaAtual: number;
  totalParticipantes: number;
}) {
  if (totalParticipantes <= 0) {
    throw new CampanhaCombateError("Combate sem participantes.");
  }

  if (turnoAtual > 0) {
    return { turnoAtual: turnoAtual - 1, rodadaAtual };
  }

  if (rodadaAtual > 1) {
    return { turnoAtual: totalParticipantes - 1, rodadaAtual: rodadaAtual - 1 };
  }

  return { turnoAtual: 0, rodadaAtual: 1 };
}

export function toJsonArray(value: Prisma.JsonValue): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function toJsonRecord(value: Prisma.JsonValue): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
