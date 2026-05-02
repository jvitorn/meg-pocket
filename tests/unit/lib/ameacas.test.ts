import { describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ameaca: {
      findMany: prismaMocks.findMany,
      findUnique: prismaMocks.findUnique,
    },
  },
}));

import { buscarAmeacaPorSlug, listarAmeacas } from "@/lib/ameacas";

const row = {
  slug: "sentinela-db",
  nome: "Sentinela DB",
  tipo: "Constructo",
  tipoSecundario: null,
  elemento: "Terra",
  va: 2,
  pv: 18,
  mana: 4,
  danoBase: "1d6",
  danoMedio: 3,
  defesa: 13,
  funcao: "Guardião",
  reacoes: {
    bloqueio: 1,
    esquiva: 0,
    contraAtaque: 1,
  },
  fraquezas: ["Água"],
  resistencias: ["Corte"],
  imunidades: [],
  descricao: "Constructo usado em testes.",
  narrativa: "Protege uma sala importante.",
  golpes: [
    {
      nome: "Punho de Pedra",
      descricao: "1d6 físico",
      dano: "1d6",
    },
  ],
};

describe("lib/ameacas", () => {
  it("lista ameacas vindas da tabela e normaliza jsons", async () => {
    prismaMocks.findMany.mockResolvedValueOnce([row]);

    await expect(listarAmeacas()).resolves.toEqual([
      expect.objectContaining({
        id: "sentinela-db",
        nome: "Sentinela DB",
        tipo: "Constructo",
        elemento: "Terra",
        reacoes: {
          bloqueio: 1,
          esquiva: 0,
          contraAtaque: 1,
        },
        fraquezas: ["Água"],
        golpes: [
          {
            nome: "Punho de Pedra",
            descricao: "1d6 físico",
            dano: "1d6",
          },
        ],
      }),
    ]);
  });

  it("busca por slug e usa fallback do bestiario quando nao encontra no banco", async () => {
    prismaMocks.findUnique.mockResolvedValueOnce(null);

    await expect(buscarAmeacaPorSlug("dragao-glacial")).resolves.toEqual(
      expect.objectContaining({
        id: "dragao-glacial",
        nome: "Dragão Glacial",
      })
    );
  });
});
