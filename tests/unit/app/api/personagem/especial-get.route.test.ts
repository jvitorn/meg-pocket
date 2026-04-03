import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validarEdicaoDaFicha: vi.fn(),
  findPersonagem: vi.fn(),
  findEspecial: vi.fn(),
  findRoleActions: vi.fn(),
  findMagias: vi.fn(),
  findPericias: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(),
}));

vi.mock("@/lib/regras/personagemPermissao", () => ({
  validarEdicaoDaFicha: mocks.validarEdicaoDaFicha,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personagem: {
      findUnique: mocks.findPersonagem,
    },
    especial: {
      findFirst: mocks.findEspecial,
    },
    especialRoleAction: {
      findMany: mocks.findRoleActions,
    },
    magiaPersonagem: {
      findMany: mocks.findMagias,
    },
    periciaPersonagem: {
      findMany: mocks.findPericias,
    },
  },
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  buildRateLimitHeaders: mocks.buildRateLimitHeaders,
}));

import { GET } from "@/app/api/personagem/especial/[id]/route";

describe("GET /api/personagem/especial/[id]", () => {
  beforeEach(() => {
    mocks.validarEdicaoDaFicha.mockReset();
    mocks.findPersonagem.mockReset();
    mocks.findEspecial.mockReset();
    mocks.findRoleActions.mockReset();
    mocks.findMagias.mockReset();
    mocks.findPericias.mockReset();
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

  it("retorna 403 quando o usuario nao pode acessar a ficha especial", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Sem permissão para editar esta ficha.",
    });

    const response = await GET(
      new Request("http://localhost:3000/api/personagem/especial/7") as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Sem permissão para editar esta ficha.",
    });
    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
  });

  it("retorna 429 quando o rate limit da ficha especial e excedido", async () => {
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

    const response = await GET(
      new Request("http://localhost:3000/api/personagem/especial/7") as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Muitas requisições. Aguarde alguns instantes.",
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.findPersonagem).not.toHaveBeenCalled();
  });
});
