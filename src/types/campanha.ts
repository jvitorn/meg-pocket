import type { ItemTipo } from "@/types/personagem";

export interface CampanhaInterface {
  nome: string;
  count_jogadores: number;
  id: number;
  sinopse?: string;
  capa?: string;
  tags?: Array<string>;
  mestre: string;
}

export type CampanhaInfo = {
  id: number;
  nome: string;
  mestre: string;
  capa: string;
  sinopse: string;
};

export type CampaignEditItem = CampanhaInfo & {
  tags: string[];
};

export type CampanhaInfoValues = {
  nome: string;
  mestre: string;
  capa: string;
  sinopse: string;
  tags: string;
};

export type CampanhaUpdatePayload = Omit<CampanhaInfoValues, "tags"> & {
  tags: string[];
};

export type CampaignCatalogItem = {
  id: number;
  nome: string;
  tipo: ItemTipo;
  descricao: string | null;
  durabilidadeBase: number | null;
  durabilidadeMax: number | null;
};

export type CampaignInventoryItem = {
  id: number;
  itemId: number;
  nome: string;
  tipo: ItemTipo;
  descricao: string | null;
  durabilidadeAtual: number | null;
  durabilidadeMax: number | null;
  quantidade: number;
  esgotado: boolean;
  observacoes: string;
};

export type CampaignInventoryCharacter = {
  id: number;
  nome: string;
  jogador: string;
  inventario: CampaignInventoryItem[];
};

export type CampaignInventoryCreatePayload = {
  personagemId: number | string;
  itemId: number | string;
  quantidade: number | string;
  observacoes?: string;
  durabilidadeAtual?: number | string;
  durabilidadeMax?: number | string;
};

export type CampaignInventoryUpdatePayload =
  | {
      quantidade: number | string;
    }
  | {
      action: "transfer";
      targetPersonagemId: number | string;
    }
  | {
      action: "recover";
      durabilidadeAtual: number | string;
    };

export type CampaignNpcItem = {
  id: number;
  nome: string;
  racaId: number | null;
  racaNome: string;
  genero: string;
  classeId: number | null;
  classeNome: string | null;
  profissao: string | null;
  importancia: string | null;
  tom: string | null;
  personalidade: string | null;
  aparencia: string | null;
  segredo: string | null;
  objetivoCampanha: string;
  gancho: string | null;
  frase: string | null;
  relacaoComGrupo: string | null;
  detalheVisual: string | null;
  descricao: string | null;
  dadosJson?: unknown;
};

export type NpcEstiloNarrativoOption = {
  chave: string;
  nome: string;
  descricao: string | null;
};

export type CampaignNpcPayload = {
  nome: string;
  racaId: number | null;
  genero: string;
  classeId: number | null;
  profissao: string;
  importancia: string;
  tom: string;
  personalidade: string;
  aparencia: string;
  segredo: string;
  objetivoCampanha: string;
  gancho: string;
  frase: string;
  relacaoComGrupo: string;
  detalheVisual: string;
  descricao: string;
  dadosJson?: unknown;
};

export type CampaignNpcFilters = {
  racaId?: number | string;
  genero?: string;
  classeId?: number | string;
  profissao?: string;
  importancia?: string;
  tom?: string;
};
