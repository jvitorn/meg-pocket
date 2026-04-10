import { DiceRoll } from "@dice-roller/rpg-dice-roller";

export interface ResultadoRolagem {
  notacao: string;
  total: number;
  output: string;
}

export function rolarNotacao(notacao: string): ResultadoRolagem {
  const roll = new DiceRoll(notacao);

  return {
    notacao,
    total: roll.total,
    output: roll.output,
  };
}