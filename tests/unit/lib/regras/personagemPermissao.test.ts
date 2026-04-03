import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personagem: {
      findUnique: mocks.findUnique,
    },
  },
}));

import {
  getSessionUserId,
  validarEdicaoDaFicha,
} from "@/lib/regras/personagemPermissao";

describe("validarEdicaoDaFicha", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset();
    mocks.findUnique.mockReset();
  });

  it("retorna o id do usuario autenticado quando ha sessao", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-123" },
    });

    await expect(getSessionUserId()).resolves.toBe("user-123");
  });

  it("bloqueia a edicao quando nao existe usuario autenticado", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    await expect(validarEdicaoDaFicha(7)).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Usuário não autenticado.",
    });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o personagem nao existe", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-123" },
    });
    mocks.findUnique.mockResolvedValue(null);

    await expect(validarEdicaoDaFicha(7)).resolves.toEqual({
      ok: false,
      status: 404,
      error: "Personagem não encontrado.",
    });
  });

  it("retorna 403 quando a ficha pertence a outro usuario", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-123" },
    });
    mocks.findUnique.mockResolvedValue({
      userId: "user-999",
    });

    await expect(validarEdicaoDaFicha(7)).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Sem permissão para editar esta ficha.",
    });
  });

  it("permite a edicao quando o usuario e dono da ficha", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-123" },
    });
    mocks.findUnique.mockResolvedValue({
      userId: "user-123",
    });

    await expect(validarEdicaoDaFicha(7)).resolves.toEqual({
      ok: true,
      userId: "user-123",
    });
  });
});
