import { describe, expect, it } from "vitest";

import {
  prepararDadosCombate,
  resolverProximoTurno,
  resolverTurnoAnterior,
} from "@/lib/regras/campanhaCombate";

describe("campanhaCombate", () => {
  it("permite cópias da mesma ameaça e soma o VA de cada instância", () => {
    const dados = prepararDadosCombate(
      {
        nome: "Emboscada",
        personagens: [{ personagemId: 1, iniciativa: 12 }],
        ameacas: [
          { ameacaId: 10, iniciativa: 8 },
          { ameacaId: 10, iniciativa: 14 },
        ],
      },
      [{ id: 1, nome: "Orion" }],
      [{ id: 10, nome: "Goblin", va: 0.5 }]
    );

    expect(dados.vaTotal).toBe(1);
    expect(dados.participantes).toMatchObject([
      { nome: "Goblin 2", iniciativa: 14, ordem: 0 },
      { nome: "Orion", iniciativa: 12, ordem: 1 },
      { nome: "Goblin 1", iniciativa: 8, ordem: 2 },
    ]);
  });

  it("não permite personagem duplicado no mesmo combate", () => {
    expect(() =>
      prepararDadosCombate(
        {
          nome: "Arena",
          personagens: [
            { personagemId: 1, iniciativa: 12 },
            { personagemId: 1, iniciativa: 10 },
          ],
          ameacas: [],
        },
        [{ id: 1, nome: "Orion" }],
        []
      )
    ).toThrow("O mesmo personagem não pode entrar duas vezes");
  });

  it("avança e volta turnos respeitando mudança de rodada", () => {
    expect(
      resolverProximoTurno({
        turnoAtual: 2,
        rodadaAtual: 1,
        totalParticipantes: 3,
      })
    ).toEqual({ turnoAtual: 0, rodadaAtual: 2 });

    expect(
      resolverTurnoAnterior({
        turnoAtual: 0,
        rodadaAtual: 2,
        totalParticipantes: 3,
      })
    ).toEqual({ turnoAtual: 2, rodadaAtual: 1 });
  });
});
