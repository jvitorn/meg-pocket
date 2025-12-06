import { BaseInterface } from "@/types";

export interface PersonagemInterface extends BaseInterface {
  campanhaId: number;
  racaId: number;
  raca_nome?: string;
  classeId: number;
  classe_nome?: string;
  elemento: string;
  hp_atual?: number;
  mana_atual?: number;
  sobre: string;
  url_imagem?: string;
  magias?: MagiaPersonagem[];
  pericias?: PericiaPersonagem [];
  status_baile?: StatusBaile;
  actions?: { nome: string; descricao: string; custo_mana: number; }[];
  apelido?: string;
}

type StatusBaile = 'vivo' | 'morto' | 'killer';
export interface MagiaPersonagem {
  id?: string;
  nome: string;
  alcance : string;
  descricao: string;
  custo_nivel: number;
}

export interface PericiaPersonagem {
  nome: string;
  tipo: string; 
  pontuacao: number;
  descricao?: string; // opcional, aparece no dialog
}