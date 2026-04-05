import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findClasse: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    classe: {
      findUnique: mocks.findClasse,
    },
  },
}));

import { GET } from "@/app/api/classes/[id]/route";

describe("GET /api/classes/[id]", () => {
  beforeEach(() => {
    mocks.findClasse.mockReset();
  });

  it("rejeita id invalido", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/classes/abc") as never,
      { params: Promise.resolve({ id: "abc" }) }
    );

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "ID inválido",
    });
    expect(response.status).toBe(400);
  });

  it("retorna 404 quando a classe nao existe", async () => {
    mocks.findClasse.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3000/api/classes/99") as never,
      { params: Promise.resolve({ id: "99" }) }
    );

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Classe não encontrada",
    });
    expect(response.status).toBe(404);
  });

  it("mapeia personagens relacionados para o formato esperado pela tela", async () => {
    mocks.findClasse.mockResolvedValue({
      id: 1,
      slug: "guerreiro",
      nome: "Guerreiro",
      subtitulo: "Combatente",
      descricao: "Linha de frente.",
      gameplay: "Seguro e constante.",
      img_corpo: null,
      exemploPersonagem: "Ragnar",
      background: "/imgs/backgrounds/classe_guerreiro.jpg",
      tags: ["Tanque"],
      hp: 12,
      mana: 6,
      personagens: [
        {
          id: 7,
          nome: "Arkan",
          apelido: "Arkan, o Firme",
          url_imagem: "https://example.com/arkan.png",
          imagem_pixel: null,
        },
      ],
      Magias: [
        {
          id: 10,
          nome: "Golpe Runico",
          descricao: "Canaliza energia na arma.",
          alcance: "Corpo a corpo",
          custo_nivel: 2,
        },
      ],
    });

    const response = await GET(
      new Request("http://localhost:3000/api/classes/1") as never,
      { params: Promise.resolve({ id: "1" }) }
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        id: 1,
        slug: "guerreiro",
        nome: "Guerreiro",
        subtitulo: "Combatente",
        descricao: "Linha de frente.",
        gameplay: "Seguro e constante.",
        img_corpo: null,
        exemploPersonagem: "Ragnar",
        background: "/imgs/backgrounds/classe_guerreiro.jpg",
        tags: ["Tanque"],
        hp: 12,
        mana: 6,
        Personagens: [
          {
            id: 7,
            nome: "Arkan",
            apelido: "Arkan, o Firme",
            url_imagem: "https://example.com/arkan.png",
            imagem_pixel: null,
          },
        ],
        Magias: [
          {
            id: 10,
            nome: "Golpe Runico",
            descricao: "Canaliza energia na arma.",
            alcance: "Corpo a corpo",
            custo_nivel: 2,
          },
        ],
      },
    });
    expect(response.status).toBe(200);
  });
});

