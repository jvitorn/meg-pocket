import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validarEdicaoDaFicha: vi.fn(),
  updatePersonagem: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(),
}));

vi.mock("@/lib/regras/personagemPermissao", () => ({
  validarEdicaoDaFicha: mocks.validarEdicaoDaFicha,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personagem: {
      update: mocks.updatePersonagem,
    },
  },
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  buildRateLimitHeaders: mocks.buildRateLimitHeaders,
}));

import {
  DELETE,
  POST,
} from "@/app/api/personagem/[id]/habilidade-diaria/route";

describe("/api/personagem/[id]/habilidade-diaria", () => {
  beforeEach(() => {
    mocks.validarEdicaoDaFicha.mockReset();
    mocks.updatePersonagem.mockReset();
    mocks.enforceRateLimit.mockReset();
    mocks.buildRateLimitHeaders.mockReset();

    mocks.enforceRateLimit.mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      retryAfter: 60,
      resetAt: Date.now() + 60_000,
    });
    mocks.buildRateLimitHeaders.mockReturnValue({
      "X-RateLimit-Limit": "20",
    });
  });

  it("rejeita id invalido", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/personagem/abc/habilidade-diaria") as never,
      { params: Promise.resolve({ id: "abc" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "ID do personagem inválido",
    });
    expect(response.status).toBe(400);
    expect(mocks.validarEdicaoDaFicha).not.toHaveBeenCalled();
  });

  it("propaga falha de permissao", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Sem permissão para editar esta ficha.",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/habilidade-diaria") as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Sem permissão para editar esta ficha.",
    });
    expect(response.status).toBe(403);
    expect(mocks.updatePersonagem).not.toHaveBeenCalled();
  });

  it("marca a habilidade diaria como usada", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.updatePersonagem.mockResolvedValue({
      id: 7,
      habilidadeDiariaUsada: true,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/habilidade-diaria") as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      personagem: {
        id: 7,
        habilidadeDiariaUsada: true,
      },
    });
    expect(response.status).toBe(200);
    expect(mocks.updatePersonagem).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { habilidadeDiariaUsada: true },
      select: { id: true, habilidadeDiariaUsada: true },
    });
  });

  it("reseta o uso da habilidade diaria", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.updatePersonagem.mockResolvedValue({
      id: 7,
      habilidadeDiariaUsada: false,
    });

    const response = await DELETE(
      new Request("http://localhost:3000/api/personagem/7/habilidade-diaria") as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      personagem: {
        id: 7,
        habilidadeDiariaUsada: false,
      },
    });
    expect(response.status).toBe(200);
    expect(mocks.updatePersonagem).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { habilidadeDiariaUsada: false },
      select: { id: true, habilidadeDiariaUsada: true },
    });
  });
});
