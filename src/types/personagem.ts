export interface Personagem {
  _id: number,
  campanha_id: number;
  raca_id: number;
  raca_nome?: string;
  classe_id: number;
  classe_nome?: string;
  nome: string;
  elemento: string;
  hp_atual?: number;
  mana_atual?: number;
  sobre: string;
  url_imagem?: string;
  magias?: MagiaPersonagem[];
  hp? : number;
  mana?: number;
}

interface MagiaPersonagem {
  nome: string;
  alcance : string;
  descricao: string;
  custo_nivel: number;
}