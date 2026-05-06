import type { AmeacaGolpe } from "@/data/dataBestiario";
import type { MagiaPersonagem, SlotsDefensivos } from "@/types/personagem";

export type CombateStatusValue = "RASCUNHO" | "EM_ANDAMENTO" | "ENCERRADO";
export type CombateParticipanteTipoValue = "PERSONAGEM" | "AMEACA";

export type CombateCreatePayload = {
  nome: string;
  personagens: Array<{
    personagemId: number | string;
    iniciativa: number | string;
  }>;
  ameacas: Array<{
    ameacaId: number | string;
    iniciativa: number | string;
  }>;
};

export type CombatePersonagemSelectionState = Record<
  number,
  { selected: boolean; iniciativa: string }
>;

export type CombateThreatDraft = {
  tempId: string;
  ameacaId: number;
  nome: string;
  iniciativa: string;
};

export type CombateActionPayload =
  | { action: "iniciar" }
  | { action: "proximo" }
  | { action: "voltar" }
  | { action: "encerrar" }
  | {
      action: "atualizar_ameaca";
      participanteId: number | string;
      hpAtual: number | string;
      manaAtual: number | string;
    }
  | {
      action: "usar_reacao_ameaca";
      participanteId: number | string;
      tipo: "bloqueio" | "esquiva" | "contra";
    }
  | {
      action: "resetar_reacoes_ameaca";
      participanteId: number | string;
    };

export type CombateListItem = {
  id: number;
  nome: string;
  status: CombateStatusValue;
  rodadaAtual: number;
  turnoAtual: number;
  vaTotal: number;
  participantesCount: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
};

export type CombateParticipanteView = {
  id: number;
  tipo: CombateParticipanteTipoValue;
  nome: string;
  iniciativa: number;
  ordem: number;
  hp: number | null;
  mana: number | null;
  defesa: number | null;
  detalhe:
    | {
        tipo: "PERSONAGEM";
        classeNome: string | null;
        racaNome: string | null;
        magias: MagiaPersonagem[];
        slotsDefensivos: SlotsDefensivos | null;
      }
    | {
        tipo: "AMEACA";
        funcao: string | null;
        va: number | null;
        hpMax: number;
        manaMax: number;
        reacoes: {
          bloqueio: number;
          esquiva: number;
          contraAtaque: number;
        };
        reacoesUsadas: {
          bloqueio: number;
          esquiva: number;
          contraAtaque: number;
        };
        golpes: AmeacaGolpe[];
      };
};

export type CombateDetail = CombateListItem & {
  participantes: CombateParticipanteView[];
};

export type CombateCatalogoPersonagem = {
  id: number;
  nome: string;
  classeNome: string | null;
  racaNome: string | null;
  hp: number | null;
  mana: number | null;
};

export type CombateCatalogoAmeaca = {
  id: number;
  nome: string;
  slug: string;
  tipo: string;
  tipoSecundario: string | null;
  elemento: string;
  funcao: string;
  va: number;
  pv: number;
  mana: number;
  defesa: number;
  danoBase: string;
  danoMedio: number;
  descricao: string;
  narrativa: string;
  fraquezas: string[];
  resistencias: string[];
  imunidades: string[];
  golpes: AmeacaGolpe[];
  reacoes: {
    bloqueio: number;
    esquiva: number;
    contraAtaque: number;
  };
};
