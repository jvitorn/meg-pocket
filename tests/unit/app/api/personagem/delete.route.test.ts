import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validarEdicaoDaFicha: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(),
  transaction: vi.fn(),
  magiaDeleteMany: vi.fn(),
  periciaDeleteMany: vi.fn(),
  inventarioDeleteMany: vi.fn(),
  slotsDeleteMany: vi.fn(),
  personagemDelete: vi.fn(),
}));

vi.mock("@/lib/regras/personagemPermissao", () => ({
  getSessionUserId: vi.fn(),
  validarEdicaoDaFicha: mocks.validarEdicaoDaFicha,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  buildRateLimitHeaders: mocks.buildRateLimitHeaders,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personagem: {
      findUnique: vi.fn(),
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

import { DELETE } from "@/app/api/personagem/[id]/route";

describe("DELETE /api/personagem/[id]", () => {
  beforeEach(() => {
    mocks.validarEdicaoDaFicha.mockReset();
    mocks.enforceRateLimit.mockReset();
    mocks.buildRateLimitHeaders.mockReset();
    mocks.transaction.mockReset();
    mocks.magiaDeleteMany.mockReset();
    mocks.periciaDeleteMany.mockReset();
    mocks.inventarioDeleteMany.mockReset();
    mocks.slotsDeleteMany.mockReset();
    mocks.personagemDelete.mockReset();

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
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        magiaPersonagem: {
          deleteMany: mocks.magiaDeleteMany,
        },
        periciaPersonagem: {
          deleteMany: mocks.periciaDeleteMany,
        },
        itemInventario: {
          deleteMany: mocks.inventarioDeleteMany,
        },
        slotsDefensivos: {
          deleteMany: mocks.slotsDeleteMany,
        },
        personagem: {
          delete: mocks.personagemDelete,
        },
      })
    );
  });

  it("remove a ficha e os relacionamentos dependentes na mesma transacao", async () => {
    const response = await DELETE(
      new Request("http://localhost:3000/api/personagem/7", {
        method: "DELETE",
      }) as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
    });
    expect(response.status).toBe(200);
    expect(mocks.magiaDeleteMany).toHaveBeenCalledWith({
      where: { personagemId: 7 },
    });
    expect(mocks.periciaDeleteMany).toHaveBeenCalledWith({
      where: { personagemId: 7 },
    });
    expect(mocks.inventarioDeleteMany).toHaveBeenCalledWith({
      where: { personagemId: 7 },
    });
    expect(mocks.slotsDeleteMany).toHaveBeenCalledWith({
      where: { personagemId: 7 },
    });
    expect(mocks.personagemDelete).toHaveBeenCalledWith({
      where: { id: 7 },
    });
  });

  it("respeita o rate limit antes de deletar", async () => {
    mocks.enforceRateLimit.mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      retryAfter: 60,
      resetAt: Date.now() + 60_000,
    });

    const response = await DELETE(
      new Request("http://localhost:3000/api/personagem/7", {
        method: "DELETE",
      }) as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Muitas exclusões em sequência. Aguarde alguns instantes.",
    });
    expect(response.status).toBe(429);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
