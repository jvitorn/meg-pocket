export interface CampanhaInterface {
  nome: string;
  count_jogadores: number;
  id: number;
  sinopse?: string;
  capa?: string;
  tags?: Array<string>;
  mestre: string;
}