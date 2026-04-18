import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findCampanha: vi.fn(),
  findPersonagens: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campanha: {
      findUnique: mocks.findCampanha,
    },
    personagem: {
      findMany: mocks.findPersonagens,
    },
  },
}));

import { GET } from "@/app/api/campanhas/personagens/[id]/route";

describe("GET /api/campanhas/personagens/[id]", () => {
  beforeEach(() => {
    mocks.findCampanha.mockReset();
    mocks.findPersonagens.mockReset();
  });

  it("rejeita id invalido", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/campanhas/personagens/abc"),
      { params: Promise.resolve({ id: "abc" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "ID da campanha inválido",
    });
    expect(response.status).toBe(400);
    expect(mocks.findCampanha).not.toHaveBeenCalled();
    expect(mocks.findPersonagens).not.toHaveBeenCalled();
  });

  it("retorna 404 quando a campanha nao existe", async () => {
    mocks.findCampanha.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3000/api/campanhas/personagens/99"),
      { params: Promise.resolve({ id: "99" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Campanha não encontrada",
    });
    expect(response.status).toBe(404);
    expect(mocks.findPersonagens).not.toHaveBeenCalled();
  });

  it("inclui tema da raca nos personagens retornados", async () => {
    mocks.findCampanha.mockResolvedValue({ id: 3 });
    mocks.findPersonagens.mockResolvedValue([
      {
        id: 7,
        nome: "Orion",
        apelido: null,
        campanhaId: 3,
        classeId: 1,
        racaId: 2,
        elemento: "vento",
        hp_atual: 8,
        mana_atual: 5,
        hp_base: null,
        mana_base: null,
        descricao: "Vigia da fronteira.",
        url_imagem: null,
        imagem_pixel: null,
        statusEspecial: "vivo",
        raca: {
          nome: "Lumis",
          hp: 4,
          mana: 8,
          corTema: "amber",
          icone: "Sun",
        },
        classe: { nome: "Guerreiro", hp: 12, mana: 6 },
        magiaPersonagem: [],
        periciaPersonagem: [],
      },
    ]);

    const response = await GET(
      new Request("http://localhost:3000/api/campanhas/personagens/3"),
      { params: Promise.resolve({ id: "3" }) }
    );

    await expect(response.json()).resolves.toMatchObject([
      {
        id: 7,
        nome: "Orion",
        raca_nome: "Lumis",
        corTema: "amber",
        icone: "Sun",
        hp: 16,
        mana: 14,
      },
    ]);
    expect(response.status).toBe(200);
  });
});
