import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validarEdicaoDaFicha: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(),
}));

vi.mock("@/lib/regras/personagemPermissao", () => ({
  validarEdicaoDaFicha: mocks.validarEdicaoDaFicha,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    slotsDefensivos: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  buildRateLimitHeaders: mocks.buildRateLimitHeaders,
}));

import { POST } from "@/app/api/personagem/[id]/slots/reset/route";

describe("POST /api/personagem/[id]/slots/reset", () => {
  beforeEach(() => {
    mocks.validarEdicaoDaFicha.mockReset();
    mocks.findUnique.mockReset();
    mocks.update.mockReset();
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

  it("rejeita ids invalidos", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/personagem/abc/slots/reset") as never,
      { params: Promise.resolve({ id: "abc" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "ID do personagem inválido",
    });
    expect(response.status).toBe(400);
  });

  it("retorna 404 quando os slots nao existem", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.findUnique.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/slots/reset") as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Slots defensivos não encontrados",
    });
    expect(response.status).toBe(404);
  });

  it("retorna 429 quando o rate limit do reset de slots e excedido", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.enforceRateLimit.mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      retryAfter: 60,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/slots/reset") as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Muitas tentativas. Aguarde alguns instantes.",
    });
    expect(response.status).toBe(429);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("zera todos os slots e retorna sucesso", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.findUnique.mockResolvedValue({
      personagemId: 7,
    });
    mocks.update.mockResolvedValue({});

    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/slots/reset") as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({ success: true });
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { personagemId: 7 },
      data: {
        esquivaUsada: 0,
        bloqueioUsado: 0,
        contraAtaqueUsado: 0,
      },
    });
  });
});
