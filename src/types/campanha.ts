export interface CampanhaInterface {
  nome: string;
  count_jogadores: number;
  _id: string;
  sinopse?: string;
  capa?: string;
  tags?: Array<string>;
  mestre: string;
}