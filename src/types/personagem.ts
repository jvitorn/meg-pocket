import { BaseInterface } from "@/types";



/* -------------------------------------------------------
   Personagem
---------------------------------------------------------*/
export interface PersonagemInterface extends BaseInterface {
  campanhaId: number;

  racaId: number;
  raca_nome?: string;

  classeId: number;
  classe_nome?: string;

  elemento: string;

  hp_atual?: number;
  mana_atual?: number;
  defesa_atual?: number;
  defesa_max?: number;

  sobre: string;

  url_imagem?: string;
  imagem_pixel?: string;

  magias?: MagiaPersonagem[];
  pericias?: PericiaPersonagem[];
  inventario?: PersonagemInventarioItem[];
  inventarioResumo?: InventarioResumo;

  statusEspecial?: StatusEspecial;
  especial?: {
    id: number;
    nome: string;
  } | null;

  actions?: {
    nome: string;
    descricao: string;
    custo_mana: number;
  }[];

  apelido?: string;

  /** Controle de slots defensivos por combate */
  slotsDefensivos?: SlotsDefensivos;

  /** Indica se usuário logado é dono da ficha (pode editar). */
  canEdit?: boolean;
}

/* -------------------------------------------------------
   Tipos auxiliares
---------------------------------------------------------*/
type StatusEspecial = "vivo" | "morto" | "killer";

export interface MagiaPersonagem {
  id?: string;
  nome: string;
  alcance: string;
  descricao: string;
  custo_nivel: number;
}

export interface PericiaPersonagem {
  nome: string;
  tipo: string;
  pontuacao: number;
  descricao?: string;
}

export type ItemTipo =
  | "ARMA"
  | "CONSUMIVEL"
  | "MAGICO"
  | "MATERIAL"
  | "EQUIPAMENTO";

export interface PersonagemInventarioItem {
  id: number;
  itemId: number;
  nome: string;
  tipo: ItemTipo;
  descricao?: string | null;
  notacaoRolagem?: string | null;
  slots: number;
  slotsTotal: number;
  quantidade: number;
  durabilidadeAtual?: number | null;
  durabilidadeMax?: number | null;
  efeitoAtivo?: boolean;
  esgotado?: boolean;
  efeito?: ItemEfeito | null;
  observacoes?: string | null;
}

export type ItemEfeitoModulo = "VIDA" | "MANA" | "DEFESA";
export type ItemEfeitoOperacao = "ADICIONAR" | "REMOVER";

export interface ItemEfeito {
  modulo: ItemEfeitoModulo;
  operacao: ItemEfeitoOperacao;
  valor: number;
}

export interface InventarioResumo {
  slotsMaximos: number;
  slotsOcupados: number;
  slotsDisponiveis: number;
  itensTotais: number;
}
/* -------------------------------------------------------
   Slots Defensivos
---------------------------------------------------------*/
export interface SlotsDefensivos {
  esquivaUsada: number;
  bloqueioUsado: number;
  contraAtaqueUsado: number;
}
