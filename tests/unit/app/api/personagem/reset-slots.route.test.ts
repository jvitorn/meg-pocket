import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validarEdicaoDaFicha: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
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

import { POST } from "@/app/api/personagem/[id]/slots/reset/route";

describe("POST /api/personagem/[id]/slots/reset", () => {
  beforeEach(() => {
    mocks.validarEdicaoDaFicha.mockReset();
    mocks.findUnique.mockReset();
    mocks.update.mockReset();
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
