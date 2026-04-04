import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validarEdicaoDaFicha: vi.fn(),
  personagemFindUnique: vi.fn(),
  personagemUpdate: vi.fn(),
  magiaFindMany: vi.fn(),
  periciaFindMany: vi.fn(),
  itemInventarioFindMany: vi.fn(),
  itemInventarioUpdateMany: vi.fn(),
  transaction: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(),
}));

vi.mock("@/lib/regras/personagemPermissao", () => ({
  validarEdicaoDaFicha: mocks.validarEdicaoDaFicha,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personagem: {
      findUnique: mocks.personagemFindUnique,
      update: mocks.personagemUpdate,
    },
    magiaPersonagem: {
      findMany: mocks.magiaFindMany,
    },
    periciaPersonagem: {
      findMany: mocks.periciaFindMany,
    },
    itemInventario: {
      findMany: mocks.itemInventarioFindMany,
      updateMany: mocks.itemInventarioUpdateMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  buildRateLimitHeaders: mocks.buildRateLimitHeaders,
}));

import { POST } from "@/app/api/personagem/update/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost:3000/api/personagem/update", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/personagem/update", () => {
  beforeEach(() => {
    mocks.validarEdicaoDaFicha.mockReset();
    mocks.personagemFindUnique.mockReset();
    mocks.personagemUpdate.mockReset();
    mocks.magiaFindMany.mockReset();
    mocks.periciaFindMany.mockReset();
    mocks.itemInventarioFindMany.mockReset();
    mocks.itemInventarioUpdateMany.mockReset();
    mocks.transaction.mockReset();
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

  it("rejeita campos nao permitidos", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });

    const response = await POST(
      makeRequest({
        index: 7,
        campo: "inventario",
        valor: "espada",
      })
    );

    await expect(response.json()).resolves.toEqual({
      success: false,
      error:
        "Campo 'inventario' não permitido por esta rota. Use endpoints específicos para magias/pericias/inventario.",
    });
    expect(response.status).toBe(400);
  });

  it("valida valores numericos antes de atualizar", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.personagemFindUnique.mockResolvedValue({
      id: 7,
      hp_base: 8,
      mana_base: 9,
      statusEspecial: "vivo",
      raca: { hp: 3, mana: 2 },
      classe: { hp: 5, mana: 7 },
    });

    const response = await POST(
      makeRequest({
        index: 7,
        campo: "mana_atual",
        valor: "abc",
      })
    );

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Valor numérico inválido para campo mana_atual",
    });
    expect(response.status).toBe(400);
  });

  it("retorna 429 quando o rate limit de update e excedido", async () => {
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

    const response = await POST(
      makeRequest({
        index: 7,
        campo: "mana_atual",
        valor: "9",
      })
    );

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Muitas alterações em sequência. Aguarde alguns instantes.",
    });
    expect(response.status).toBe(429);
    expect(mocks.personagemFindUnique).not.toHaveBeenCalled();
  });

  it("atualiza a ficha e devolve o payload normalizado", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.personagemFindUnique.mockResolvedValue({
      id: 7,
      hp_base: null,
      mana_base: null,
      statusEspecial: "vivo",
      raca: { hp: 5, mana: 2 },
      classe: { hp: 4, mana: 7 },
    });
    mocks.personagemUpdate.mockResolvedValue({});
    mocks.magiaFindMany.mockResolvedValue([]);
    mocks.periciaFindMany.mockResolvedValue([]);
    mocks.transaction.mockImplementation(async (callback: any) =>
      callback({
        personagem: {
          update: mocks.personagemUpdate,
        },
        magiaPersonagem: {
          findMany: mocks.magiaFindMany,
        },
        periciaPersonagem: {
          findMany: mocks.periciaFindMany,
        },
        itemInventario: {
          findMany: mocks.itemInventarioFindMany,
          updateMany: mocks.itemInventarioUpdateMany,
        },
      })
    );
    mocks.personagemUpdate.mockResolvedValue({
      id: 7,
      nome: "Selene",
      apelido: "A Cronista",
      campanhaId: 1,
      classeId: 2,
      racaId: 3,
      elemento: "fogo",
      hp_atual: 12,
      mana_atual: 9,
      defesa_atual: 0,
      defesa_max: 0,
      hp_base: null,
      mana_base: null,
      descricao: "Arcanista veterana",
      url_imagem: "https://example.com/selene.png",
      imagem_pixel: null,
      statusEspecial: "vivo",
      raca: { nome: "Humana", hp: 5, mana: 2 },
      classe: { nome: "Elementalista", hp: 4, mana: 7 },
    });
    mocks.magiaFindMany.mockResolvedValue([]);
    mocks.periciaFindMany.mockResolvedValue([]);

    const response = await POST(
      makeRequest({
        index: 7,
        campo: "mana_atual",
        valor: "9",
      })
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      personagem: {
        id: 7,
        nome: "A Cronista",
        apelido: "A Cronista",
        campanhaId: 1,
        classeId: 2,
        classe_nome: "Elementalista",
        racaId: 3,
        raca_nome: "Humana",
        elemento: "fogo",
        hp_atual: 12,
        mana_atual: 9,
        defesa_atual: 0,
        defesa_max: 0,
        hp: 9,
        mana: 9,
        sobre: "Arcanista veterana",
        url_imagem: "https://example.com/selene.png",
        imagem_pixel: null,
        magias: [],
        pericias: [],
        statusEspecial: "vivo",
      },
    });
    expect(response.status).toBe(200);
    expect(mocks.personagemUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { mana_atual: 9 },
      include: {
        raca: true,
        classe: true,
      },
    });
  });

  it("aceita atualizar mana usando o maximo derivado quando a base persistida esta desatualizada", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.personagemFindUnique.mockResolvedValue({
      id: 7,
      hp_atual: 14,
      mana_atual: 13,
      hp_base: 1,
      mana_base: 1,
      statusEspecial: "vivo",
      raca: { hp: 4, mana: 9 },
      classe: { hp: 6, mana: 7 },
      defesa_max: 0,
    });
    mocks.magiaFindMany.mockResolvedValue([]);
    mocks.periciaFindMany.mockResolvedValue([]);
    mocks.transaction.mockImplementation(async (callback: any) =>
      callback({
        personagem: {
          update: mocks.personagemUpdate,
        },
        magiaPersonagem: {
          findMany: mocks.magiaFindMany,
        },
        periciaPersonagem: {
          findMany: mocks.periciaFindMany,
        },
        itemInventario: {
          findMany: mocks.itemInventarioFindMany,
          updateMany: mocks.itemInventarioUpdateMany,
        },
      })
    );
    mocks.personagemUpdate.mockResolvedValue({
      id: 7,
      nome: "Yuna",
      apelido: null,
      campanhaId: 1,
      classeId: 3,
      racaId: 4,
      elemento: "vento",
      hp_atual: 14,
      mana_atual: 12,
      defesa_atual: 0,
      defesa_max: 0,
      hp_base: 1,
      mana_base: 1,
      descricao: "Maga disciplinada",
      url_imagem: null,
      imagem_pixel: null,
      statusEspecial: "vivo",
      raca: { nome: "Arcana", hp: 4, mana: 9 },
      classe: { nome: "Feiticeira", hp: 6, mana: 7 },
    });

    const response = await POST(
      makeRequest({
        index: 7,
        campo: "mana_atual",
        valor: "12",
      })
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      personagem: {
        id: 7,
        nome: "Yuna",
        apelido: null,
        campanhaId: 1,
        classeId: 3,
        classe_nome: "Feiticeira",
        racaId: 4,
        raca_nome: "Arcana",
        elemento: "vento",
        hp_atual: 14,
        mana_atual: 12,
        defesa_atual: 0,
        defesa_max: 0,
        hp: 10,
        mana: 16,
        sobre: "Maga disciplinada",
        url_imagem: null,
        imagem_pixel: null,
        magias: [],
        pericias: [],
        statusEspecial: "vivo",
      },
    });
    expect(response.status).toBe(200);
    expect(mocks.personagemUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { mana_atual: 12 },
      include: {
        raca: true,
        classe: true,
      },
    });
  });

  it("ao zerar a defesa devolve o inventario atualizado e oculta item defensivo esgotado", async () => {
    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    mocks.personagemFindUnique.mockResolvedValue({
      id: 8,
      hp_atual: 10,
      mana_atual: 6,
      hp_base: null,
      mana_base: null,
      statusEspecial: null,
      defesa_atual: 1,
      defesa_max: 3,
      raca: { hp: 4, mana: 3 },
      classe: { hp: 6, mana: 3 },
    });
    mocks.magiaFindMany.mockResolvedValue([]);
    mocks.periciaFindMany.mockResolvedValue([]);
    mocks.itemInventarioFindMany.mockResolvedValue([
      {
        id: 6,
        quantidade: 1,
        durabilidadeAtual: 0,
        durabilidadeMax: 1,
        efeitoAtivo: false,
        esgotadoEm: new Date("2026-04-04T18:00:00.000Z"),
        observacoes: "Equipamento de jornada",
        item: {
          id: 6,
          nome: "Capa Arcana",
          tipo: "EQUIPAMENTO",
          descricao: "Manto reforçado para aventuras e viagens longas.",
          slots: 1,
          durabilidadeBase: 1,
          durabilidadeMax: 1,
          efeito: {
            modulo: "DEFESA",
            operacao: "ADICIONAR",
            valor: 3,
          },
        },
      },
    ]);
    mocks.transaction.mockImplementation(async (callback: any) =>
      callback({
        personagem: {
          update: mocks.personagemUpdate,
        },
        magiaPersonagem: {
          findMany: mocks.magiaFindMany,
        },
        periciaPersonagem: {
          findMany: mocks.periciaFindMany,
        },
        itemInventario: {
          findMany: mocks.itemInventarioFindMany,
          updateMany: mocks.itemInventarioUpdateMany,
        },
      })
    );
    mocks.personagemUpdate.mockResolvedValue({
      id: 8,
      nome: "Robin",
      apelido: null,
      campanhaId: 2,
      classeId: 2,
      racaId: 2,
      elemento: "vento",
      hp_atual: 10,
      mana_atual: 6,
      defesa_atual: 0,
      defesa_max: 0,
      hp_base: null,
      mana_base: null,
      descricao: "Guardiã da guilda.",
      url_imagem: null,
      imagem_pixel: null,
      statusEspecial: null,
      raca: { nome: "Celestial", hp: 4, mana: 3 },
      classe: { nome: "Guardiã", hp: 6, mana: 3 },
    });

    const response = await POST(
      makeRequest({
        index: 8,
        campo: "defesa_atual",
        valor: "0",
      })
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      personagem: {
        id: 8,
        nome: "Robin",
        apelido: null,
        campanhaId: 2,
        classeId: 2,
        classe_nome: "Guardiã",
        racaId: 2,
        raca_nome: "Celestial",
        elemento: "vento",
        hp_atual: 10,
        mana_atual: 6,
        defesa_atual: 0,
        defesa_max: 0,
        hp: 10,
        mana: 6,
        sobre: "Guardiã da guilda.",
        url_imagem: null,
        imagem_pixel: null,
        magias: [],
        pericias: [],
        statusEspecial: null,
      },
      inventario: [
        {
          id: 6,
          itemId: 6,
          nome: "Capa Arcana",
          tipo: "EQUIPAMENTO",
          descricao: "Manto reforçado para aventuras e viagens longas.",
          slots: 1,
          slotsTotal: 0,
          quantidade: 1,
          durabilidadeAtual: 0,
          durabilidadeMax: 1,
          efeitoAtivo: false,
          esgotado: true,
          efeito: {
            modulo: "DEFESA",
            operacao: "ADICIONAR",
            valor: 3,
          },
          observacoes: "Equipamento de jornada",
        },
      ],
      inventarioResumo: {
        slotsMaximos: 5,
        slotsOcupados: 0,
        slotsDisponiveis: 5,
        itensTotais: 0,
      },
    });
    expect(mocks.itemInventarioUpdateMany).toHaveBeenNthCalledWith(1, {
      where: {
        personagemId: 8,
        efeitoAtivo: true,
        durabilidadeAtual: {
          gt: 0,
        },
      },
      data: {
        efeitoAtivo: false,
      },
    });
    expect(mocks.itemInventarioUpdateMany).toHaveBeenNthCalledWith(2, {
      where: {
        personagemId: 8,
        efeitoAtivo: true,
        OR: [
          {
            durabilidadeAtual: 0,
          },
          {
            durabilidadeAtual: null,
          },
        ],
      },
      data: {
        efeitoAtivo: false,
        esgotadoEm: expect.any(Date),
      },
    });
  });
});
