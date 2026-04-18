import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  userUpdate: vi.fn(),
  findFirstResetToken: vi.fn(),
  updateResetToken: vi.fn(),
  updateManyResetToken: vi.fn(),
  accountUpdate: vi.fn(),
  transaction: vi.fn(),
  hash: vi.fn(),
  compare: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      update: mocks.userUpdate,
    },
    account: {
      update: mocks.accountUpdate,
    },
    passwordResetToken: {
      findFirst: mocks.findFirstResetToken,
      update: mocks.updateResetToken,
      updateMany: mocks.updateManyResetToken,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mocks.hash,
    compare: mocks.compare,
  },
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  buildRateLimitHeaders: mocks.buildRateLimitHeaders,
  getClientIp: mocks.getClientIp,
}));

import { POST } from "@/app/api/auth/password-reset/confirm/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/auth/password-reset/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/password-reset/confirm", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());

    mocks.getClientIp.mockReturnValue("127.0.0.1");
    mocks.enforceRateLimit.mockResolvedValue({
      allowed: true,
      limit: 5,
      remaining: 4,
      retryAfter: 900,
      resetAt: Date.now() + 900_000,
    });
    mocks.buildRateLimitHeaders.mockReturnValue({
      "X-RateLimit-Limit": "5",
    });
    mocks.transaction.mockImplementation((actions) => Promise.all(actions));
    mocks.hash.mockResolvedValue("nova-senha-hash");
    mocks.updateResetToken.mockResolvedValue({ id: "reset-1" });
    mocks.updateManyResetToken.mockResolvedValue({ count: 1 });
    mocks.accountUpdate.mockResolvedValue({ id: "account-1" });
    mocks.userUpdate.mockResolvedValue({ id: "user-1" });
  });

  it("incrementa tentativas quando o codigo e invalido", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      email: "heroi@example.com",
      accounts: [
        {
          id: "account-1",
          provider: "credentials",
          password: "hash-antigo",
        },
      ],
    });
    mocks.findFirstResetToken.mockResolvedValue({
      id: "reset-1",
      codeHash: "codigo-hash",
      attempts: 1,
    });
    mocks.compare.mockResolvedValue(false);

    const response = await POST(
      makeRequest({
        email: "heroi@example.com",
        code: "000000",
        password: "a",
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: "Código inválido ou expirado.",
    });
    expect(response.status).toBe(400);
    expect(mocks.updateResetToken).toHaveBeenCalledWith({
      where: { id: "reset-1" },
      data: { attempts: 2 },
    });
    expect(mocks.accountUpdate).not.toHaveBeenCalled();
  });

  it("atualiza senha e invalida sessoes quando o codigo e valido", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      email: "heroi@example.com",
      accounts: [
        {
          id: "account-1",
          provider: "credentials",
          password: "hash-antigo",
        },
      ],
    });
    mocks.findFirstResetToken.mockResolvedValue({
      id: "reset-1",
      codeHash: "codigo-hash",
      attempts: 0,
    });
    mocks.compare.mockResolvedValue(true);

    const response = await POST(
      makeRequest({
        email: "Heroi@Example.com",
        code: "123456",
        password: "a",
      })
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      message: "Senha atualizada com sucesso.",
    });
    expect(response.status).toBe(200);
    expect(mocks.hash).toHaveBeenCalledWith("a", 10);
    expect(mocks.accountUpdate).toHaveBeenCalledWith({
      where: { id: "account-1" },
      data: { password: "nova-senha-hash" },
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { sessionVersion: { increment: 1 } },
    });
  });
});
