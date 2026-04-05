import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validarEdicaoDaFicha: vi.fn(),
  getSessionUserId: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(),
  personagemFindUnique: vi.fn(),
  personagemUpdate: vi.fn(),
  campanhaFindUnique: vi.fn(),
  classeFindUnique: vi.fn(),
  racaFindUnique: vi.fn(),
  periciaFindMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/regras/personagemPermissao", () => ({
  getSessionUserId: mocks.getSessionUserId,
  validarEdicaoDaFicha: mocks.validarEdicaoDaFicha,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  buildRateLimitHeaders: mocks.buildRateLimitHeaders,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personagem: {
      findUnique: mocks.personagemFindUnique,
      update: mocks.personagemUpdate,
    },
    campanha: {
      findUnique: mocks.campanhaFindUnique,
    },
    classe: {
      findUnique: mocks.classeFindUnique,
    },
    raca: {
      findUnique: mocks.racaFindUnique,
    },
    periciaCatalog: {
      findMany: mocks.periciaFindMany,
    },
    magiaPersonagem: {
      findMany: vi.fn(),
    },
    periciaPersonagem: {
      findMany: vi.fn(),
    },
    itemInventario: {
      findMany: vi.fn(),
    },
    $transaction: mocks.transaction,
  },
}));

import { PUT } from "@/app/api/personagem/[id]/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/personagem/7", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/personagem/[id]", () => {
  beforeEach(() => {
    mocks.validarEdicaoDaFicha.mockReset();
    mocks.getSessionUserId.mockReset();
    mocks.enforceRateLimit.mockReset();
    mocks.buildRateLimitHeaders.mockReset();
    mocks.personagemFindUnique.mockReset();
    mocks.personagemUpdate.mockReset();
    mocks.campanhaFindUnique.mockReset();
    mocks.classeFindUnique.mockReset();
    mocks.racaFindUnique.mockReset();
    mocks.periciaFindMany.mockReset();
    mocks.transaction.mockReset();

    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.enforceRateLimit.mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      retryAfter: 60,
      resetAt: Date.now() + 60_000,
    });
    mocks.buildRateLimitHeaders.mockReturnValue({
      "X-RateLimit-Limit": "10",
    });
    mocks.transaction.mockResolvedValue([
      {
        id: 7,
        hp_atual: 12,
        mana_atual: 9,
        statusEspecial: "vivo",
      },
      { id: 1, nome: "Campanha" },
      {
        id: 2,
        hp: 4,
        mana: 7,
        Magias: [{ id: 10 }, { id: 11 }],
      },
      { id: 3, hp: 5, mana: 2 },
      [
        { id: 20, tipo: "fisica" },
        { id: 21, tipo: "mental" },
        { id: 22, tipo: "social" },
      ],
    ]);
  });

  it("atualiza a ficha completa e substitui as selecoes relacionadas", async () => {
    mocks.personagemUpdate.mockResolvedValue({ id: 7 });

    const response = await PUT(
      makeRequest({
        nome: "Selene",
        apelido: "A Cronista",
        descricao: "Observadora dos véus.",
        url_imagem: "https://example.com/selene.png",
        campanhaId: 1,
        classeId: 2,
        racaId: 3,
        magiaIds: [10, 11],
        periciaIds: [20, 21],
        elemento: "fogo",
      }) as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      id: 7,
    });
    expect(response.status).toBe(200);
    expect(mocks.personagemUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        nome: "Selene",
        apelido: "A Cronista",
        descricao: "Observadora dos véus.",
        campanhaId: 1,
        classeId: 2,
        racaId: 3,
        elemento: "fogo",
        url_imagem: "https://example.com/selene.png",
        hp_base: 9,
        mana_base: 9,
        hp_atual: 9,
        mana_atual: 9,
        magiaPersonagem: {
          deleteMany: {},
          create: [{ magiaId: 10 }, { magiaId: 11 }],
        },
        periciaPersonagem: {
          deleteMany: {},
          create: [
            { periciaId: 20, pontuacao: 2 },
            { periciaId: 21, pontuacao: 2 },
          ],
        },
      },
      select: { id: true },
    });
  });

  it("respeita o rate limit antes de editar a ficha completa", async () => {
    mocks.enforceRateLimit.mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      retryAfter: 60,
      resetAt: Date.now() + 60_000,
    });

    const response = await PUT(
      makeRequest({
        nome: "Selene",
        campanhaId: 1,
        classeId: 2,
        racaId: 3,
        magiaIds: [10],
        periciaIds: [20],
        elemento: "fogo",
      }) as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Muitas alterações completas em sequência. Aguarde alguns instantes.",
    });
    expect(response.status).toBe(429);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
