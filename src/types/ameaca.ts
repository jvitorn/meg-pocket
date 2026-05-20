export type AmeacaTipo =
  | "Goblinoide"
  | "Besta"
  | "Gigante"
  | "Constructo"
  | "Morto-vivo"
  | "Planta"
  | "Dragão"
  | "Colosso"
  | "Elemental"
  | "Humanoide"
  | "Lobo"
  | "Sombra"
  | "Espírito"
  | "Ave"
  | "Celestial"
  | "Entidade";

export type AmeacaElemento =
  | "Neutro"
  | "Vento"
  | "Fogo"
  | "Natureza"
  | "Etéreo"
  | "Água"
  | "Sombrio"
  | "Radiante"
  | "Terra"
  | "Fogo ou Radiante";

export type AmeacaGolpe = {
  nome: string;
  descricao: string;
  dano?: string;
  custoMana?: number;
};

export type Ameaca = {
  id: string;
  nome: string;
  tipo: AmeacaTipo;
  tipoSecundario?: string;
  elemento: AmeacaElemento;
  va: number;
  pv: number;
  mana: number;
  danoBase: string;
  danoMedio: number;
  defesa: number;
  funcao: string;
  reacoes: {
    bloqueio: number;
    esquiva: number;
    contraAtaque: number;
  };
  fraquezas: string[];
  resistencias: string[];
  imunidades: string[];
  descricao: string;
  narrativa: string;
  golpes: AmeacaGolpe[];
};
