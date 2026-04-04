import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validarEdicaoDaFicha: vi.fn(),
  enforceRateLimit: vi.fn(),
  buildRateLimitHeaders: vi.fn(),
  itemInventarioFindFirst: vi.fn(),
  itemInventarioFindMany: vi.fn(),
  itemInventarioUpdate: vi.fn(),
  personagemFindUnique: vi.fn(),
  personagemUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/regras/personagemPermissao", () => ({
  validarEdicaoDaFicha: mocks.validarEdicaoDaFicha,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  buildRateLimitHeaders: mocks.buildRateLimitHeaders,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personagem: {
      findUnique: mocks.personagemFindUnique,
      update: mocks.personagemUpdate,
    },
    itemInventario: {
      findFirst: mocks.itemInventarioFindFirst,
      findMany: mocks.itemInventarioFindMany,
      update: mocks.itemInventarioUpdate,
    },
    $transaction: mocks.transaction,
  },
}));

import { POST } from "@/app/api/personagem/[id]/inventario/[inventoryItemId]/usar/route";

describe("POST /api/personagem/[id]/inventario/[inventoryItemId]/usar", () => {
  beforeEach(() => {
    mocks.validarEdicaoDaFicha.mockReset();
    mocks.enforceRateLimit.mockReset();
    mocks.buildRateLimitHeaders.mockReset();
    mocks.itemInventarioFindFirst.mockReset();
    mocks.itemInventarioFindMany.mockReset();
    mocks.itemInventarioUpdate.mockReset();
    mocks.personagemFindUnique.mockReset();
    mocks.personagemUpdate.mockReset();
    mocks.transaction.mockReset();

    mocks.validarEdicaoDaFicha.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
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
    mocks.transaction.mockImplementation(async (callback: any) =>
      callback({
        personagem: {
          findUnique: mocks.personagemFindUnique,
          update: mocks.personagemUpdate,
        },
        itemInventario: {
          update: mocks.itemInventarioUpdate,
        },
      })
    );
  });

  it("reduz a durabilidade atual quando o item ainda tem usos", async () => {
    mocks.itemInventarioFindFirst.mockResolvedValue({
      id: 10,
      personagemId: 7,
      quantidade: 1,
      durabilidadeAtual: 4,
      durabilidadeMax: 4,
      efeitoAtivo: false,
      esgotadoEm: null,
      item: {
        id: 30,
        nome: "Adaga Rúnica",
        tipo: "ARMA",
        descricao: "Canaliza mana em golpes curtos.",
        slots: 1,
        durabilidadeBase: 4,
        durabilidadeMax: 4,
        efeito: null,
      },
    });
    mocks.personagemFindUnique.mockResolvedValue({
      hp_atual: 10,
      hp_base: 10,
      mana_atual: 8,
      mana_base: 8,
      defesa_atual: 0,
      defesa_max: 0,
    });
    mocks.itemInventarioFindMany.mockResolvedValue([
      {
        id: 10,
        quantidade: 1,
        durabilidadeAtual: 3,
        durabilidadeMax: 4,
        efeitoAtivo: false,
        esgotadoEm: null,
        observacoes: null,
        item: {
          id: 30,
          nome: "Adaga Rúnica",
          tipo: "ARMA",
          descricao: "Canaliza mana em golpes curtos.",
          slots: 1,
          empilhavel: true,
          durabilidadeBase: 4,
          durabilidadeMax: 4,
          efeito: null,
        },
      },
    ]);
    mocks.personagemFindUnique.mockResolvedValueOnce({
      hp_atual: 10,
      hp_base: 10,
      mana_atual: 8,
      mana_base: 8,
      defesa_atual: 0,
      defesa_max: 0,
    }).mockResolvedValueOnce({
      hp_atual: 10,
      mana_atual: 8,
      defesa_atual: 0,
      defesa_max: 0,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/inventario/10/usar", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "7", inventoryItemId: "10" }) }
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Adaga Rúnica usado com sucesso.",
      personagem: {
        hp_atual: 10,
        mana_atual: 8,
        defesa_atual: 0,
        defesa_max: 0,
      },
      inventario: [
        {
          id: 10,
          itemId: 30,
          nome: "Adaga Rúnica",
          tipo: "ARMA",
          descricao: "Canaliza mana em golpes curtos.",
          slots: 1,
          slotsTotal: 1,
          quantidade: 1,
          durabilidadeAtual: 3,
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
    });
    expect(mocks.itemInventarioUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: {
        durabilidadeAtual: 3,
        durabilidadeMax: 4,
        efeitoAtivo: false,
      },
    });
  });

  it("consome uma unidade da stack, aplica o efeito e reseta a proxima", async () => {
    mocks.itemInventarioFindFirst.mockResolvedValue({
      id: 11,
      personagemId: 7,
      quantidade: 2,
      durabilidadeAtual: 1,
      durabilidadeMax: 1,
      efeitoAtivo: false,
      esgotadoEm: null,
      item: {
        id: 31,
        nome: "Poção de Vida",
        tipo: "CONSUMIVEL",
        descricao: "Cura rápida.",
        slots: 0.25,
        durabilidadeBase: 1,
        durabilidadeMax: 1,
        efeito: {
          modulo: "VIDA",
          operacao: "ADICIONAR",
          valor: 3,
        },
      },
    });
    mocks.personagemFindUnique.mockResolvedValueOnce({
      hp_atual: 10,
      hp_base: 1,
      mana_atual: 8,
      mana_base: 1,
      defesa_atual: 0,
      defesa_max: 0,
      statusEspecial: null,
      raca: { hp: 12, mana: 4 },
      classe: { hp: 8, mana: 6 },
    }).mockResolvedValueOnce({
      hp_atual: 13,
      mana_atual: 8,
      defesa_atual: 0,
      defesa_max: 0,
    });
    mocks.itemInventarioFindMany.mockResolvedValue([
      {
        id: 11,
        quantidade: 1,
        durabilidadeAtual: 1,
        durabilidadeMax: 1,
        efeitoAtivo: false,
        esgotadoEm: null,
        observacoes: "Cura rápida",
        item: {
          id: 31,
          nome: "Poção de Vida",
          tipo: "CONSUMIVEL",
          descricao: "Cura rápida.",
          slots: 0.25,
          empilhavel: true,
          durabilidadeBase: 1,
          durabilidadeMax: 1,
          efeito: {
            modulo: "VIDA",
            operacao: "ADICIONAR",
            valor: 3,
          },
        },
      },
    ]);

    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/inventario/11/usar", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "7", inventoryItemId: "11" }) }
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Poção de Vida usado com sucesso.",
      personagem: {
        hp_atual: 13,
        mana_atual: 8,
        defesa_atual: 0,
        defesa_max: 0,
      },
      inventario: [
        {
          id: 11,
          itemId: 31,
          nome: "Poção de Vida",
          tipo: "CONSUMIVEL",
          descricao: "Cura rápida.",
          slots: 0.25,
          slotsTotal: 0.25,
          quantidade: 1,
          durabilidadeAtual: 1,
          durabilidadeMax: 1,
          efeitoAtivo: false,
          esgotado: false,
          efeito: {
            modulo: "VIDA",
            operacao: "ADICIONAR",
            valor: 3,
          },
          observacoes: "Cura rápida",
        },
      ],
      inventarioResumo: {
        slotsMaximos: 5,
        slotsOcupados: 0.25,
        slotsDisponiveis: 4.75,
        itensTotais: 1,
      },
    });
    expect(mocks.itemInventarioUpdate).toHaveBeenCalledWith({
      where: { id: 11 },
      data: {
        quantidade: 1,
        durabilidadeAtual: 1,
        durabilidadeMax: 1,
        efeitoAtivo: false,
      },
    });
    expect(mocks.personagemUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        hp_atual: 13,
      },
    });
  });

  it("aplica efeito de mana usando o maximo efetivo mesmo com base persistida desatualizada", async () => {
    mocks.itemInventarioFindFirst.mockResolvedValue({
      id: 14,
      personagemId: 7,
      quantidade: 3,
      durabilidadeAtual: 1,
      durabilidadeMax: 1,
      efeitoAtivo: false,
      esgotadoEm: null,
      item: {
        id: 34,
        nome: "Poção de Mana",
        tipo: "CONSUMIVEL",
        descricao: "Recupera energia arcana.",
        slots: 0.25,
        durabilidadeBase: 1,
        durabilidadeMax: 1,
        efeito: {
          modulo: "MANA",
          operacao: "ADICIONAR",
          valor: 3,
        },
      },
    });
    mocks.personagemFindUnique.mockResolvedValueOnce({
      hp_atual: 14,
      hp_base: 1,
      mana_atual: 13,
      mana_base: 1,
      defesa_atual: 0,
      defesa_max: 0,
      statusEspecial: null,
      raca: { hp: 4, mana: 9 },
      classe: { hp: 6, mana: 7 },
    }).mockResolvedValueOnce({
      hp_atual: 14,
      mana_atual: 16,
      defesa_atual: 0,
      defesa_max: 0,
    });
    mocks.itemInventarioFindMany.mockResolvedValue([
      {
        id: 14,
        quantidade: 2,
        durabilidadeAtual: 1,
        durabilidadeMax: 1,
        efeitoAtivo: false,
        esgotadoEm: null,
        observacoes: "Reserva de mana",
        item: {
          id: 34,
          nome: "Poção de Mana",
          tipo: "CONSUMIVEL",
          descricao: "Recupera energia arcana.",
          slots: 0.25,
          empilhavel: true,
          durabilidadeBase: 1,
          durabilidadeMax: 1,
          efeito: {
            modulo: "MANA",
            operacao: "ADICIONAR",
            valor: 3,
          },
        },
      },
    ]);

    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/inventario/14/usar", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "7", inventoryItemId: "14" }) }
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Poção de Mana usado com sucesso.",
      personagem: {
        hp_atual: 14,
        mana_atual: 16,
        defesa_atual: 0,
        defesa_max: 0,
      },
      inventario: [
        {
          id: 14,
          itemId: 34,
          nome: "Poção de Mana",
          tipo: "CONSUMIVEL",
          descricao: "Recupera energia arcana.",
          slots: 0.25,
          slotsTotal: 0.5,
          quantidade: 2,
          durabilidadeAtual: 1,
          durabilidadeMax: 1,
          efeitoAtivo: false,
          esgotado: false,
          efeito: {
            modulo: "MANA",
            operacao: "ADICIONAR",
            valor: 3,
          },
          observacoes: "Reserva de mana",
        },
      ],
      inventarioResumo: {
        slotsMaximos: 5,
        slotsOcupados: 0.5,
        slotsDisponiveis: 4.5,
        itensTotais: 2,
      },
    });
    expect(mocks.personagemUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        mana_atual: 16,
      },
    });
  });

  it("marca o item como esgotado quando o ultimo uso e consumido", async () => {
    mocks.itemInventarioFindFirst.mockResolvedValue({
      id: 12,
      personagemId: 7,
      quantidade: 1,
      durabilidadeAtual: 1,
      durabilidadeMax: 1,
      efeitoAtivo: false,
      esgotadoEm: null,
      item: {
        id: 32,
        nome: "Pergaminho de Fogo",
        tipo: "CONSUMIVEL",
        descricao: "Uso único.",
        slots: 0.25,
        durabilidadeBase: 1,
        durabilidadeMax: 1,
        efeito: null,
      },
    });
    mocks.personagemFindUnique.mockResolvedValueOnce({
      hp_atual: 10,
      hp_base: 10,
      mana_atual: 8,
      mana_base: 8,
      defesa_atual: 0,
      defesa_max: 0,
    }).mockResolvedValueOnce({
      hp_atual: 10,
      mana_atual: 8,
      defesa_atual: 0,
      defesa_max: 0,
    });
    mocks.itemInventarioFindMany.mockResolvedValue([
      {
        id: 12,
        quantidade: 0,
        durabilidadeAtual: 0,
        durabilidadeMax: 1,
        efeitoAtivo: false,
        esgotadoEm: new Date("2026-04-04T16:00:00.000Z"),
        observacoes: null,
        item: {
          id: 32,
          nome: "Pergaminho de Fogo",
          tipo: "CONSUMIVEL",
          descricao: "Uso único.",
          slots: 0.25,
          empilhavel: true,
          durabilidadeBase: 1,
          durabilidadeMax: 1,
          efeito: null,
        },
      },
    ]);

    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/inventario/12/usar", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "7", inventoryItemId: "12" }) }
    );
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      message: "Pergaminho de Fogo usado com sucesso.",
      personagem: {
        hp_atual: 10,
        mana_atual: 8,
        defesa_atual: 0,
        defesa_max: 0,
      },
      inventario: [
        {
          id: 12,
          itemId: 32,
          nome: "Pergaminho de Fogo",
          tipo: "CONSUMIVEL",
          descricao: "Uso único.",
          slots: 0.25,
          slotsTotal: 0,
          quantidade: 0,
          durabilidadeAtual: 0,
          durabilidadeMax: 1,
          efeitoAtivo: false,
          esgotado: true,
          efeito: null,
          observacoes: null,
        },
      ],
      inventarioResumo: {
        slotsMaximos: 5,
        slotsOcupados: 0,
        slotsDisponiveis: 5,
        itensTotais: 0,
      },
    });
    expect(mocks.itemInventarioUpdate).toHaveBeenCalledWith({
      where: { id: 12 },
      data: expect.objectContaining({
        quantidade: 0,
        durabilidadeAtual: 0,
        efeitoAtivo: false,
      }),
    });
  });

  it("ativa a defesa temporaria e mantém o item como efeito ativo", async () => {
    mocks.itemInventarioFindFirst.mockResolvedValue({
      id: 13,
      personagemId: 7,
      quantidade: 1,
      durabilidadeAtual: 5,
      durabilidadeMax: 5,
      efeitoAtivo: false,
      esgotadoEm: null,
      item: {
        id: 33,
        nome: "Capa Arcana",
        tipo: "EQUIPAMENTO",
        descricao: "Manto de proteção ritual.",
        slots: 1,
        durabilidadeBase: 5,
        durabilidadeMax: 5,
        efeito: {
          modulo: "DEFESA",
          operacao: "ADICIONAR",
          valor: 3,
        },
      },
    });
    mocks.personagemFindUnique.mockResolvedValueOnce({
      hp_atual: 10,
      hp_base: 10,
      mana_atual: 8,
      mana_base: 8,
      defesa_atual: 0,
      defesa_max: 0,
      statusEspecial: null,
      raca: null,
      classe: null,
    }).mockResolvedValueOnce({
      hp_atual: 10,
      mana_atual: 8,
      defesa_atual: 3,
      defesa_max: 3,
    });
    mocks.itemInventarioFindMany.mockResolvedValue([
      {
        id: 13,
        quantidade: 1,
        durabilidadeAtual: 0,
        durabilidadeMax: 1,
        efeitoAtivo: true,
        esgotadoEm: null,
        observacoes: null,
        item: {
          id: 33,
          nome: "Capa Arcana",
          tipo: "EQUIPAMENTO",
          descricao: "Manto de proteção ritual.",
          slots: 1,
          empilhavel: true,
          durabilidadeBase: 5,
          durabilidadeMax: 5,
          efeito: {
            modulo: "DEFESA",
            operacao: "ADICIONAR",
            valor: 3,
          },
        },
      },
    ]);

    const response = await POST(
      new Request("http://localhost:3000/api/personagem/7/inventario/13/usar", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "7", inventoryItemId: "13" }) }
    );

    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "Capa Arcana usado com sucesso.",
      personagem: {
        hp_atual: 10,
        mana_atual: 8,
        defesa_atual: 3,
        defesa_max: 3,
      },
      inventario: [
        {
          id: 13,
          itemId: 33,
          nome: "Capa Arcana",
          tipo: "EQUIPAMENTO",
          descricao: "Manto de proteção ritual.",
          slots: 1,
          slotsTotal: 1,
          quantidade: 1,
          durabilidadeAtual: 0,
          durabilidadeMax: 1,
          efeitoAtivo: true,
          esgotado: false,
          efeito: {
            modulo: "DEFESA",
            operacao: "ADICIONAR",
            valor: 3,
          },
          observacoes: null,
        },
      ],
      inventarioResumo: {
        slotsMaximos: 5,
        slotsOcupados: 1,
        slotsDisponiveis: 4,
        itensTotais: 1,
      },
    });
    expect(mocks.personagemUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        defesa_atual: 3,
        defesa_max: 3,
      },
    });
    expect(mocks.itemInventarioUpdate).toHaveBeenCalledWith({
      where: { id: 13 },
      data: {
        durabilidadeAtual: 0,
        durabilidadeMax: 1,
        efeitoAtivo: true,
      },
    });
  });
});
