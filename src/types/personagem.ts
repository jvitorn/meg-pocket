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
}

export interface MagiaPersonagem {
  nome: string;
  alcance : string;
  descricao: string;
  custo_nivel: number;
}