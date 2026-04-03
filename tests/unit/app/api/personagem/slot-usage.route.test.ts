import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validarEdicaoDaFicha: vi.fn(),
  findPersonagem: vi.fn(),
  updateSlots: vi.fn(),
}));

vi.mock("@/lib/regras/personagemPermissao", () => ({
  validarEdicaoDaFicha: mocks.validarEdicaoDaFicha,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personagem: {
      findUnique: mocks.findPersonagem,
    },
    slotsDefensivos: {
      update: mocks.updateSlots,
    },
  },
}));

import { POST } from "@/app/api/personagem/[id]/slots/[tipo]/route";

describe("POST /api/personagem/[id]/slots/[tipo]", () => {
  beforeEach(() => {
    mocks.validarEdicaoDaFicha.mockReset();
    mocks.findPersonagem.mockReset();
    mocks.updateSlots.mockReset();
  });

  it("rejeita tipo de slot invalido", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/slots/fuga") as never,
      { params: Promise.resolve({ id: "7", tipo: "fuga" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Tipo de slot defensivo inválido",
    });
    expect(response.status).toBe(400);
  });

  it("propaga falha de permissao", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Sem permissão para editar esta ficha.",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/slots/esquiva") as never,
      { params: Promise.resolve({ id: "7", tipo: "esquiva" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Sem permissão para editar esta ficha.",
    });
    expect(response.status).toBe(403);
  });

  it("bloqueia quando o limite do slot ja foi atingido", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.findPersonagem.mockResolvedValue({
      periciaPersonagem: [],
      slotsDefensivos: {
        esquivaUsada: 1,
        bloqueioUsado: 0,
        contraAtaqueUsado: 0,
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/slots/esquiva") as never,
      { params: Promise.resolve({ id: "7", tipo: "esquiva" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Limite de uso atingido para este slot defensivo",
      limite: 1,
      usados: 1,
    });
    expect(response.status).toBe(400);
    expect(mocks.updateSlots).not.toHaveBeenCalled();
  });

  it("incrementa o uso quando ainda ha limite disponivel", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.findPersonagem.mockResolvedValue({
      periciaPersonagem: [
        {
          pontuacao: 2,
          descricao: null,
          pericia: {
            nome: "Combate",
            tipo: "fisica",
            descricao: "Arte marcial.",
          },
        },
      ],
      slotsDefensivos: {
        esquivaUsada: 0,
        bloqueioUsado: 1,
        contraAtaqueUsado: 0,
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/slots/bloqueio") as never,
      { params: Promise.resolve({ id: "7", tipo: "bloqueio" }) }
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      tipo: "bloqueio",
      usadosAntes: 1,
      usadosAgora: 2,
      limite: 3,
    });
    expect(response.status).toBe(200);
    expect(mocks.updateSlots).toHaveBeenCalledWith({
      where: { personagemId: 7 },
      data: { bloqueioUsado: 2 },
    });
  });
});
