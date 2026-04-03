import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validarEdicaoDaFicha: vi.fn(),
  personagemFindUnique: vi.fn(),
  personagemUpdate: vi.fn(),
  magiaFindMany: vi.fn(),
  periciaFindMany: vi.fn(),
  transaction: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(),
}));

vi.mock("@/lib/regras/personagemPermissao", () => ({
  validarEdicaoDaFicha: mocks.validarEdicaoDaFicha,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personagem: {
      findUnique: mocks.personagemFindUnique,
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

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  buildRateLimitHeaders: mocks.buildRateLimitHeaders,
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
    mocks.personagemFindUnique.mockReset();
    mocks.personagemUpdate.mockReset();
    mocks.magiaFindMany.mockReset();
    mocks.periciaFindMany.mockReset();
    mocks.transaction.mockReset();
    mocks.enforceRateLimit.mockReset();
    mocks.buildRateLimitHeaders.mockReset();

    mocks.enforceRateLimit.mockResolvedValue({
      allowed: true,
      limit: 30,
      remaining: 29,
      retryAfter: 60,
      resetAt: Date.now() + 60_000,
    });
    mocks.buildRateLimitHeaders.mockReturnValue({
      "X-RateLimit-Limit": "30",
    });
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
    mocks.personagemFindUnique.mockResolvedValue({
      id: 7,
      hp_base: 8,
      mana_base: 9,
      statusEspecial: "vivo",
      raca: { hp: 3, mana: 2 },
      classe: { hp: 5, mana: 7 },
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

  it("retorna 429 quando o rate limit de update e excedido", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.enforceRateLimit.mockResolvedValue({
      allowed: false,
      limit: 30,
      remaining: 0,
      retryAfter: 60,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(
      makeRequest({
        index: 7,
        campo: "mana_atual",
        valor: "9",
      })
    );

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Muitas alterações em sequência. Aguarde alguns instantes.",
    });
    expect(response.status).toBe(429);
    expect(mocks.personagemFindUnique).not.toHaveBeenCalled();
  });

  it("atualiza a ficha e devolve o payload normalizado", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.personagemFindUnique.mockResolvedValue({
      id: 7,
      hp_base: null,
      mana_base: null,
      statusEspecial: "vivo",
      raca: { hp: 5, mana: 2 },
      classe: { hp: 4, mana: 7 },
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
        statusEspecial: "vivo",
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
        statusEspecial: "vivo",
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
