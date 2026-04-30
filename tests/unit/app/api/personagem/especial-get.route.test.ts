import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validarEdicaoDaFicha: vi.fn(),
  findPersonagem: vi.fn(),
  findEspecial: vi.fn(),
  findRoleActions: vi.fn(),
  findMagias: vi.fn(),
  findPericias: vi.fn(),
  findInventario: vi.fn(),
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
    itemInventario: {
      findMany: mocks.findInventario,
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
    mocks.findInventario.mockReset();
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

  it("monta a ficha especial com inventario e acoes", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.findPersonagem.mockResolvedValue({
      id: 7,
      nome: "Arkan",
      apelido: "O Encoberto",
      campanhaId: 1,
      classeId: 2,
      racaId: 3,
      elemento: "fogo",
      hp_atual: 10,
      mana_atual: 8,
      defesa_atual: 0,
      defesa_max: 0,
      descricao: "Um ritualista marcado.",
      imagemPrincipal: null,
      imagemPerfil: null,
      habilidadeDiariaUsada: false,
      statusEspecial: "vivo",
      raca: {
        nome: "Humano",
        hp: 5,
        mana: 2,
        habilidadeDiariaNome: null,
        habilidadeDiariaCombate: null,
        habilidadeDiariaForaDeCombate: null,
      },
      classe: { nome: "Mago", hp: 3, mana: 7 },
      especial: { id: 9, nome: "Mascarado" },
      slotsDefensivos: {
        esquivaUsada: 0,
        bloqueioUsado: 1,
        contraAtaqueUsado: 0,
      },
    });
    mocks.findRoleActions.mockResolvedValue([
      {
        id: 1,
        acoes: [
          {
            nome: "Investida Ritual",
            descricao: "Avança consumindo mana.",
            custo_mana: 2,
          },
        ],
      },
    ]);
    mocks.findMagias.mockResolvedValue([]);
    mocks.findPericias.mockResolvedValue([]);
    mocks.findInventario.mockResolvedValue([
      {
        id: 21,
        quantidade: 1,
        durabilidadeAtual: 4,
        durabilidadeMax: 4,
        efeitoAtivo: false,
        esgotadoEm: null,
        observacoes: null,
        item: {
          id: 6,
          nome: "Adaga Rúnica",
          tipo: "ARMA",
          descricao: "Canaliza mana em golpes curtos.",
          slots: 1,
          durabilidadeBase: 4,
          durabilidadeMax: 4,
          efeito: null,
        },
      },
    ]);

    const response = await GET(
      new Request("http://localhost:3000/api/personagem/especial/7") as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      id: 7,
      nome: "O Encoberto",
      apelido: "O Encoberto",
      campanhaId: 1,
      raca_nome: "Humano",
      classe_nome: "Mago",
      habilidadeDiariaNome: null,
      habilidadeDiariaCombate: null,
      habilidadeDiariaForaDeCombate: null,
      habilidadeDiariaUsada: false,
      racaId: 3,
      classeId: 2,
      statusEspecial: "vivo",
      hp: 8,
      mana: 9,
      hp_base: 8,
      mana_base: 9,
      hp_atual: 10,
      mana_atual: 8,
      defesa_atual: 0,
      defesa_max: 0,
      sobre: "Um ritualista marcado.",
      imagemPrincipal: null,
      imagemPerfil: null,
      actions: [
        {
          nome: "Investida Ritual",
          descricao: "Avança consumindo mana.",
          custo_mana: 2,
        },
      ],
      magias: [],
      pericias: [],
      inventario: [
        {
          id: 21,
          itemId: 6,
          nome: "Adaga Rúnica",
          tipo: "ARMA",
          descricao: "Canaliza mana em golpes curtos.",
          slots: 1,
          slotsTotal: 1,
          quantidade: 1,
          durabilidadeAtual: 4,
          durabilidadeMax: 4,
          efeitoAtivo: false,
          esgotado: false,
          efeito: null,
          observacoes: null,
        },
      ],
      inventarioResumo: {
        slotsMaximos: 5,
        slotsOcupados: 1,
        slotsDisponiveis: 4,
        itensTotais: 1,
      },
      slotsDefensivos: {
        esquivaUsada: 0,
        bloqueioUsado: 1,
        contraAtaqueUsado: 0,
      },
      canEdit: true,
      especial: { id: 9, nome: "Mascarado" },
    });
    expect(response.status).toBe(200);
  });
});
