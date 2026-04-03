import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validarEdicaoDaFicha: vi.fn(),
  classeFindUnique: vi.fn(),
  racaFindUnique: vi.fn(),
  personagemUpdate: vi.fn(),
  magiaFindMany: vi.fn(),
  periciaFindMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/regras/personagemPermissao", () => ({
  validarEdicaoDaFicha: mocks.validarEdicaoDaFicha,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    classe: {
      findUnique: mocks.classeFindUnique,
    },
    raca: {
      findUnique: mocks.racaFindUnique,
    },
    personagem: {
      update: mocks.personagemUpdate,
    },
    magiaPersonagem: {
      findMany: mocks.magiaFindMany,
    },
    periciaPersonagem: {
      findMany: mocks.periciaFindMany,
    },
    $transaction: mocks.transaction,
  },
}));

import { POST } from "@/app/api/personagem/update/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/personagem/update", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/personagem/update", () => {
  beforeEach(() => {
    mocks.validarEdicaoDaFicha.mockReset();
    mocks.classeFindUnique.mockReset();
    mocks.racaFindUnique.mockReset();
    mocks.personagemUpdate.mockReset();
    mocks.magiaFindMany.mockReset();
    mocks.periciaFindMany.mockReset();
    mocks.transaction.mockReset();
  });

  it("rejeita campos nao permitidos", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });

    const response = await POST(
      makeRequest({
        index: 7,
        campo: "inventario",
        valor: "espada",
      })
    );

    await expect(response.json()).resolves.toEqual({
      success: false,
      error:
        "Campo 'inventario' não permitido por esta rota. Use endpoints específicos para magias/pericias/inventario.",
    });
    expect(response.status).toBe(400);
  });

  it("valida valores numericos antes de atualizar", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });

    const response = await POST(
      makeRequest({
        index: 7,
        campo: "mana_atual",
        valor: "abc",
      })
    );

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Valor numérico inválido para campo mana_atual",
    });
    expect(response.status).toBe(400);
  });

  it("atualiza a ficha e devolve o payload normalizado", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.personagemUpdate.mockResolvedValue({});
    mocks.magiaFindMany.mockResolvedValue([]);
    mocks.periciaFindMany.mockResolvedValue([]);
    mocks.transaction.mockResolvedValue([
      {
        id: 7,
        nome: "Selene",
        apelido: "A Cronista",
        campanhaId: 1,
        classeId: 2,
        racaId: 3,
        elemento: "fogo",
        hp_atual: 12,
        mana_atual: 9,
        hp_base: null,
        mana_base: null,
        descricao: "Arcanista veterana",
        url_imagem: "https://example.com/selene.png",
        imagem_pixel: null,
        status_baile: "vivo",
        raca: { nome: "Humana", hp: 5, mana: 2 },
        classe: { nome: "Elementalista", hp: 4, mana: 7 },
      },
      [],
      [],
    ]);

    const response = await POST(
      makeRequest({
        index: 7,
        campo: "mana_atual",
        valor: "9",
      })
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      personagem: {
        id: 7,
        nome: "A Cronista",
        apelido: "A Cronista",
        campanhaId: 1,
        classeId: 2,
        classe_nome: "Elementalista",
        racaId: 3,
        raca_nome: "Humana",
        elemento: "fogo",
        hp_atual: 12,
        mana_atual: 9,
        hp: 9,
        mana: 9,
        sobre: "Arcanista veterana",
        url_imagem: "https://example.com/selene.png",
        imagem_pixel: null,
        magias: [],
        pericias: [],
        status_baile: "vivo",
      },
    });
    expect(response.status).toBe(200);
    expect(mocks.personagemUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { mana_atual: 9 },
      include: {
        raca: true,
        classe: true,
      },
    });
  });
});
