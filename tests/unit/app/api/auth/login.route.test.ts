import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  compare: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.compare,
  },
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  buildRateLimitHeaders: mocks.buildRateLimitHeaders,
}));

import { POST } from "@/app/api/auth/login/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.compare.mockReset();
    mocks.enforceRateLimit.mockReset();
    mocks.buildRateLimitHeaders.mockReset();

    mocks.enforceRateLimit.mockResolvedValue({
      allowed: true,
      limit: 8,
      remaining: 7,
      retryAfter: 60,
      resetAt: Date.now() + 60_000,
    });
    mocks.buildRateLimitHeaders.mockReturnValue({
      "X-RateLimit-Limit": "8",
    });
  });

  it("retorna 429 quando o rate limit do login e excedido", async () => {
    mocks.enforceRateLimit.mockResolvedValue({
      allowed: false,
      limit: 8,
      remaining: 0,
      retryAfter: 60,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(
      makeRequest({
        email: "heroi@example.com",
        senha: "segredo",
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: "Muitas tentativas. Aguarde e tente novamente.",
    });
    expect(response.status).toBe(429);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("retorna sucesso quando as credenciais sao validas", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Heroi",
      email: "heroi@example.com",
      accounts: [
        {
          provider: "credentials",
          password: "hash",
        },
      ],
    });
    mocks.compare.mockResolvedValue(true);

    const response = await POST(
      makeRequest({
        email: "Heroi@Example.com",
        senha: "segredo",
      })
    );

    await expect(response.json()).resolves.toEqual({
      id: "user-1",
      name: "Heroi",
      email: "heroi@example.com",
    });
    expect(response.status).toBe(200);
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { email: "heroi@example.com" },
      include: { accounts: true },
    });
  });
});
