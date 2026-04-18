import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  create: vi.fn(),
  transaction: vi.fn(),
  hash: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(),
  getClientIp: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
    },
    passwordResetToken: {
      updateMany: mocks.updateMany,
      create: mocks.create,
    },
    $transaction: mocks.transaction,
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
  getClientIp: mocks.getClientIp,
}));

vi.mock("@/lib/email/password-reset-email", () => ({
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
}));

import { POST } from "@/app/api/auth/password-reset/request/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/auth/password-reset/request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/password-reset/request", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());

    mocks.getClientIp.mockReturnValue("127.0.0.1");
    mocks.enforceRateLimit.mockResolvedValue({
      allowed: true,
      limit: 3,
      remaining: 2,
      retryAfter: 900,
      resetAt: Date.now() + 900_000,
    });
    mocks.buildRateLimitHeaders.mockReturnValue({
      "X-RateLimit-Limit": "3",
    });
    mocks.hash.mockResolvedValue("codigo-hash");
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.create.mockResolvedValue({ id: "reset-1" });
    mocks.transaction.mockImplementation((actions) => Promise.all(actions));
    mocks.sendPasswordResetEmail.mockResolvedValue({
      delivered: true,
      previewCode: "123456",
    });
  });

  it("responde de forma neutra quando o email nao existe", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await POST(
      makeRequest({ email: "desconhecido@example.com" })
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      message:
        "Se esse email estiver cadastrado, enviaremos um código para redefinir sua senha.",
    });
    expect(response.status).toBe(200);
    expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("gera codigo hashado e aciona o mailer local para conta credentials", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Heroi",
      email: "heroi@example.com",
      accounts: [
        {
          provider: "credentials",
          password: "hash-antigo",
        },
      ],
    });

    const response = await POST(makeRequest({ email: "Heroi@Example.com" }));
    const code = mocks.hash.mock.calls[0][0];

    await expect(response.json()).resolves.toEqual({
      ok: true,
      message:
        "Se esse email estiver cadastrado, enviaremos um código para redefinir sua senha.",
      previewCode: "123456",
    });
    expect(response.status).toBe(200);
    expect(code).toMatch(/^\d{6}$/);
    expect(mocks.hash).toHaveBeenCalledWith(code, 10);
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        codeHash: "codigo-hash",
        expiresAt: expect.any(Date),
      },
    });
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith({
      to: "heroi@example.com",
      name: "Heroi",
      code,
      expiresInMinutes: 15,
    });
  });
});
