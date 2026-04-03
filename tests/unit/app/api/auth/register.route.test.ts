import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  hash: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      create: mocks.create,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mocks.hash,
  },
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  buildRateLimitHeaders: mocks.buildRateLimitHeaders,
}));

import { POST } from "@/app/api/auth/register/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.create.mockReset();
    mocks.hash.mockReset();
    mocks.enforceRateLimit.mockReset();
    mocks.buildRateLimitHeaders.mockReset();

    mocks.enforceRateLimit.mockResolvedValue({
      allowed: true,
      limit: 5,
      remaining: 4,
      retryAfter: 60,
      resetAt: Date.now() + 60_000,
    });
    mocks.buildRateLimitHeaders.mockReturnValue({
      "X-RateLimit-Limit": "5",
    });
  });

  it("rejeita payload incompleto", async () => {
    const response = await POST(
      makeRequest({ name: "Heroi", email: "", password: "" })
    );

    await expect(response.json()).resolves.toEqual({
      error: "Dados inválidos",
    });
    expect(response.status).toBe(400);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("retorna 429 quando o rate limit do cadastro e excedido", async () => {
    mocks.enforceRateLimit.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      retryAfter: 60,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(
      makeRequest({
        name: "Heroi",
        email: "heroi@example.com",
        password: "segredo",
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: "Muitas tentativas. Aguarde e tente novamente.",
    });
    expect(response.status).toBe(429);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rejeita email ja cadastrado", async () => {
    mocks.findUnique.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      makeRequest({
        name: "Heroi",
        email: "heroi@example.com",
        password: "segredo",
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: "Email já cadastrado",
    });
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("cria usuario com conta credentials quando o payload e valido", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.hash.mockResolvedValue("hash-gerado");
    mocks.create.mockResolvedValue({ id: "user-123" });

    const response = await POST(
      makeRequest({
        name: "Heroi",
        email: "heroi@example.com",
        password: "segredo",
      })
    );

    await expect(response.json()).resolves.toEqual({ id: "user-123" });
    expect(response.status).toBe(200);
    expect(mocks.hash).toHaveBeenCalledWith("segredo", 10);
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        name: "Heroi",
        email: "heroi@example.com",
        accounts: {
          create: {
            type: "credentials",
            provider: "credentials",
            providerAccountId: "heroi@example.com",
            password: "hash-gerado",
          },
        },
      },
    });
  });
});
