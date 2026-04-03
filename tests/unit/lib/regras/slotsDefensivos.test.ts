import { describe, expect, it } from "vitest";

import { calcularLimiteSlotsDefensivos } from "@/lib/regras/slotsDefensivos";

describe("calcularLimiteSlotsDefensivos", () => {
  it("retorna o limite reduzido para esquiva sem a pericia relevante", () => {
    expect(
      calcularLimiteSlotsDefensivos("esquiva", [
        { nome: "Furtividade", tipo: "mental", pontuacao: 1 },
      ])
    ).toBe(1);
  });

  it("reconhece a pericia de esquiva mesmo com variacao de acento e separador", () => {
    expect(
      calcularLimiteSlotsDefensivos("esquiva", [
        {
          nome: "ATLETISMO e CONDICIONAMENTO FISICO",
          tipo: "fisica",
          pontuacao: 3,
        },
      ])
    ).toBe(3);
  });

  it("aumenta o limite de bloqueio quando o personagem possui Combate", () => {
    expect(
      calcularLimiteSlotsDefensivos("bloqueio", [
        { nome: "Combate", tipo: "fisica", pontuacao: 2 },
      ])
    ).toBe(3);
  });

  it("mantem contra-ataque com limite fixo", () => {
    expect(
      calcularLimiteSlotsDefensivos("contra", [
        { nome: "Combate", tipo: "fisica", pontuacao: 4 },
      ])
    ).toBe(1);
  });
});
