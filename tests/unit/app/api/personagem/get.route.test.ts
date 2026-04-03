import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findPersonagem: vi.fn(),
  findMagias: vi.fn(),
  findPericias: vi.fn(),
  getSessionUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personagem: {
      findUnique: mocks.findPersonagem,
    },
    magiaPersonagem: {
      findMany: mocks.findMagias,
    },
    periciaPersonagem: {
      findMany: mocks.findPericias,
    },
  },
}));

vi.mock("@/lib/regras/personagemPermissao", () => ({
  getSessionUserId: mocks.getSessionUserId,
}));

import { GET } from "@/app/api/personagem/[id]/route";

describe("GET /api/personagem/[id]", () => {
  beforeEach(() => {
    mocks.findPersonagem.mockReset();
    mocks.findMagias.mockReset();
    mocks.findPericias.mockReset();
    mocks.getSessionUserId.mockReset();
  });

  it("rejeita id invalido", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/personagem/invalido") as never,
      { params: Promise.resolve({ id: "abc" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "ID do personagem inválido",
    });
    expect(response.status).toBe(400);
  });

  it("retorna 404 quando o personagem nao existe", async () => {
    mocks.findPersonagem.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3000/api/personagem/7") as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Personagem não encontrado",
    });
    expect(response.status).toBe(404);
  });

  it("monta a ficha completa e informa permissao de edicao", async () => {
    mocks.findPersonagem.mockResolvedValue({
      id: 7,
      nome: "Arkan",
      apelido: "Arkan, o Cinzento",
      campanhaId: 1,
      classeId: 2,
      racaId: 3,
      elemento: "fogo",
      hp_atual: 11,
      mana_atual: 9,
      descricao: "Cronista arcano",
      url_imagem: "https://example.com/arkan.png",
      imagem_pixel: null,
      status_baile: "vivo",
      userId: "user-1",
      raca: { nome: "Humano", hp: 5, mana: 2 },
      classe: { nome: "Mago", hp: 3, mana: 7 },
      slotsDefensivos: {
        esquivaUsada: 1,
        bloqueioUsado: 0,
        contraAtaqueUsado: 1,
      },
    });
    mocks.findMagias.mockResolvedValue([
      {
        descricao: null,
        custo_nivel: null,
        magia: {
          nome: "Chama Astral",
          alcance: "Toque",
          descricao: "Invoca fogo arcano.",
          custo_nivel: 3,
        },
      },
    ]);
    mocks.findPericias.mockResolvedValue([
      {
        pontuacao: 2,
        descricao: null,
        pericia: {
          nome: "Combate",
          tipo: "fisica",
          descricao: "Arte marcial.",
        },
      },
    ]);
    mocks.getSessionUserId.mockResolvedValue("user-1");

    const response = await GET(
      new Request("http://localhost:3000/api/personagem/7") as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      id: 7,
      nome: "Arkan, o Cinzento",
      apelido: "Arkan, o Cinzento",
      campanhaId: 1,
      classeId: 2,
      classe_nome: "Mago",
      racaId: 3,
      raca_nome: "Humano",
      elemento: "fogo",
      hp_atual: 11,
      mana_atual: 9,
      hp: 8,
      mana: 9,
      sobre: "Cronista arcano",
      url_imagem: "https://example.com/arkan.png",
      imagem_pixel: null,
      magias: [
        {
          nome: "Chama Astral",
          alcance: "Toque",
          descricao: "Invoca fogo arcano.",
          custo_nivel: 3,
        },
      ],
      pericias: [
        {
          nome: "Combate",
          tipo: "fisica",
          pontuacao: 2,
          descricao: "Arte marcial.",
        },
      ],
      status_baile: "vivo",
      slotsDefensivos: {
        esquivaUsada: 1,
        bloqueioUsado: 0,
        contraAtaqueUsado: 1,
      },
      canEdit: true,
    });
    expect(response.status).toBe(200);
  });
});
