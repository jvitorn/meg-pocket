import { BaseInterface } from "@/types";

export interface PersonagemInterface extends BaseInterface {
  campanha_id: number;
  raca_id: number;
  raca_nome?: string;
  classe_id: number;
  classe_nome?: string;
  elemento: string;
  hp_atual?: number;
  mana_atual?: number;
  sobre: string;
  url_imagem?: string;
  magias?: MagiaPersonagem[];
  index: number;
  pericias?: PericiaPersonagem [];
  status_baile?: StatusBaile;
  actions?: { nome: string; descricao: string; custo_mana: number; }[];
  apelido?: string;
}

type StatusBaile = 'vivo' | 'morto' | 'killer';
export interface MagiaPersonagem {
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