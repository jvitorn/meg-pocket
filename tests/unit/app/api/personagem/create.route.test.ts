import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  transaction: vi.fn(),
  create: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    personagem: {
      create: mocks.create,
    },
    campanha: {
      findUnique: vi.fn(),
    },
    classe: {
      findUnique: vi.fn(),
    },
    raca: {
      findUnique: vi.fn(),
    },
    periciaCatalog: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  buildRateLimitHeaders: mocks.buildRateLimitHeaders,
}));

vi.mock("@/lib/cache/revalidate", () => ({
  revalidateCampanhasData: vi.fn(),
}));

import { POST } from "@/app/api/personagem/create/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/personagem/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/personagem/create", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset();
    mocks.transaction.mockReset();
    mocks.create.mockReset();
    mocks.enforceRateLimit.mockReset();
    mocks.buildRateLimitHeaders.mockReset();

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
  });

  it("retorna 401 quando nao ha sessao autenticada", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const response = await POST(makeRequest({}));

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Usuário não autenticado.",
    });
    expect(response.status).toBe(401);
  });

  it("valida o elemento antes de consultar o banco", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });

    const response = await POST(
      makeRequest({
        nome: "Arkan",
        campanhaId: 1,
        classeId: 2,
        racaId: 3,
        elemento: "sombra",
      })
    );

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Elemento inválido.",
    });
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("retorna 429 quando o rate limit de criacao e excedido", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.enforceRateLimit.mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      retryAfter: 60,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(
      makeRequest({
        nome: "Arkan",
        campanhaId: 1,
        classeId: 2,
        racaId: 3,
        elemento: "fogo",
      })
    );

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Muitas tentativas. Aguarde e tente novamente.",
    });
    expect(response.status).toBe(429);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("cria o personagem com hp, mana e relacionamentos derivados", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.transaction.mockResolvedValue([
      { id: 1, nome: "Campanha" },
      {
        id: 2,
        hp: 3,
        mana: 4,
        Magias: [{ id: 10 }, { id: 11 }, { id: 12 }],
      },
      { id: 3, hp: 5, mana: 6 },
      [
        { id: 1, tipo: "luta" },
        { id: 2, tipo: "luta" },
        { id: 3, tipo: "suporte" },
        { id: 4, tipo: "suporte" },
      ],
    ]);
    mocks.create.mockResolvedValue({ id: 99 });

    const response = await POST(
      makeRequest({
        nome: "Arkan",
        apelido: "O Cinzento",
        descricao: "Mago veterano.",
        campanhaId: 1,
        classeId: 2,
        racaId: 3,
        elemento: "fogo",
        imagemPrincipal: "https://example.com/arkan.png",
        periciaIds: [1, 2, 2],
        magiaIds: [10, 11, 11],
      })
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      id: 99,
    });
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        nome: "Arkan",
        apelido: "O Cinzento",
        descricao: "Mago veterano.",
        campanhaId: 1,
        classeId: 2,
        racaId: 3,
        elemento: "fogo",
        imagemPrincipal: "https://example.com/arkan.png",
        hp_base: 8,
        mana_base: 10,
        hp_atual: 8,
        mana_atual: 10,
        defesa_atual: 0,
        defesa_max: 0,
        userId: "user-1",
        slotsDefensivos: {
          create: {},
        },
        magiaPersonagem: {
          create: [{ magiaId: 10 }, { magiaId: 11 }],
        },
        periciaPersonagem: {
          create: [
            { periciaId: 1, pontuacao: 2 },
            { periciaId: 2, pontuacao: 2 },
          ],
        },
      },
    });
  });
});
