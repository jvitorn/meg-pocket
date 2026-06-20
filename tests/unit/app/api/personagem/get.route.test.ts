import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findPersonagem: vi.fn(),
  findMagias: vi.fn(),
  findPericias: vi.fn(),
  findInventario: vi.fn(),
  getOptionalSessionUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personagem: {
      findUnique: mocks.findPersonagem,
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

vi.mock("@/lib/regras/personagemPermissao", () => ({
  getOptionalSessionUserId: mocks.getOptionalSessionUserId,
}));

vi.mock("@/lib/cache/revalidate", () => ({
  revalidateCampanhasData: vi.fn(),
}));

import { GET } from "@/app/api/personagem/[id]/route";

describe("GET /api/personagem/[id]", () => {
  beforeEach(() => {
    mocks.findPersonagem.mockReset();
    mocks.findMagias.mockReset();
    mocks.findPericias.mockReset();
    mocks.findInventario.mockReset();
    mocks.getOptionalSessionUserId.mockReset();
  });

  it("rejeita id invalido", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/personagem/invalido") as never,
      { params: Promise.resolve({ id: "abc" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "ID do personagem inválido",
    });
    expect(response.status).toBe(400);
  });

  it("retorna 404 quando o personagem nao existe", async () => {
    mocks.findPersonagem.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3000/api/personagem/7") as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Personagem não encontrado",
    });
    expect(response.status).toBe(404);
  });

  it("monta a ficha completa e informa permissao de edicao", async () => {
    mocks.findPersonagem.mockResolvedValue({
      id: 7,
      nome: "Arkan",
      apelido: "Arkan, o Cinzento",
      campanhaId: 1,
      classeId: 2,
      racaId: 3,
      elemento: "fogo",
      hp_atual: 11,
      mana_atual: 9,
      defesa_atual: 0,
      defesa_max: 0,
      descricao: "Cronista arcano",
      anotacoes: "Investigar a torre ao amanhecer.",
      imagemPrincipal: "https://example.com/arkan.png",
      imagemPerfil: null,
      habilidadeDiariaUsada: true,
      statusEspecial: "vivo",
      userId: "user-1",
      raca: {
        nome: "Humano",
        hp: 5,
        mana: 2,
        corTema: "amber",
        habilidadeDiariaNome: "Versatilidade",
        habilidadeDiariaCombate: "Garante um acerto.",
        habilidadeDiariaForaDeCombate: "Garante sucesso em um teste.",
      },
      classe: { nome: "Mago", hp: 3, mana: 7 },
      slotsDefensivos: {
        esquivaUsada: 1,
        bloqueioUsado: 0,
        contraAtaqueUsado: 1,
      },
    });
    mocks.findMagias.mockResolvedValue([
      {
        descricao: null,
        custo_nivel: null,
        magia: {
          nome: "Chama Astral",
          alcance: "Toque",
          descricao: "Invoca fogo arcano.",
          custo_nivel: 3,
        },
      },
    ]);
    mocks.findPericias.mockResolvedValue([
      {
        pontuacao: 2,
        descricao: null,
        pericia: {
          nome: "Combate",
          tipo: "fisica",
          descricao: "Arte marcial.",
        },
      },
    ]);
    mocks.findInventario.mockResolvedValue([
      {
        id: 15,
        quantidade: 2,
        durabilidadeAtual: 1,
        durabilidadeMax: 1,
        efeitoAtivo: false,
        esgotadoEm: null,
        observacoes: "Uso rápido",
        item: {
          id: 4,
          nome: "Poção de Mana",
          tipo: "CONSUMIVEL",
          descricao: "Restaura energia arcana.",
          slots: 0.25,
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
    mocks.getOptionalSessionUserId.mockResolvedValue("user-1");

    const response = await GET(
      new Request("http://localhost:3000/api/personagem/7") as never,
      { params: Promise.resolve({ id: "7" }) }
    );

    await expect(response.json()).resolves.toEqual({
      id: 7,
      nome: "Arkan",
      apelido: "Arkan, o Cinzento",
      campanhaId: 1,
      classeId: 2,
      classe_nome: "Mago",
      racaId: 3,
      raca_nome: "Humano",
      corTema: "amber",
      habilidadeDiariaNome: "Versatilidade",
      habilidadeDiariaCombate: "Garante um acerto.",
      habilidadeDiariaForaDeCombate: "Garante sucesso em um teste.",
      habilidadeDiariaUsada: true,
      elemento: "fogo",
      hp_atual: 11,
      mana_atual: 9,
      defesa_atual: 0,
      defesa_max: 0,
      hp: 8,
      mana: 9,
      sobre: "Cronista arcano",
      anotacoes: "Investigar a torre ao amanhecer.",
      imagemPrincipal: "https://example.com/arkan.png",
      imagemPerfil: null,
      magias: [
        {
          nome: "Chama Astral",
          alcance: "Toque",
          descricao: "Invoca fogo arcano.",
          custo_nivel: 3,
        },
      ],
      pericias: [
        {
          nome: "Combate",
          tipo: "fisica",
          pontuacao: 2,
          descricao: "Arte marcial.",
        },
      ],
      inventario: [
        {
          id: 15,
          itemId: 4,
          nome: "Poção de Mana",
          tipo: "CONSUMIVEL",
          descricao: "Restaura energia arcana.",
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
          observacoes: "Uso rápido",
        },
      ],
      inventarioResumo: {
        slotsMaximos: 5,
        slotsOcupados: 0.5,
        slotsDisponiveis: 4.5,
        itensTotais: 2,
      },
      statusEspecial: "vivo",
      slotsDefensivos: {
        esquivaUsada: 1,
        bloqueioUsado: 0,
        contraAtaqueUsado: 1,
      },
      canEdit: true,
    });
    expect(response.status).toBe(200);
  });

  it("mantem GET publico quando a sessao opcional nao pode ser consultada", async () => {
    mocks.findPersonagem.mockResolvedValue({
      id: 8,
      nome: "Lia",
      apelido: null,
      campanhaId: null,
      classeId: null,
      racaId: null,
      elemento: "agua",
      hp_atual: null,
      mana_atual: null,
      defesa_atual: 0,
      defesa_max: 0,
      hp_base: null,
      mana_base: null,
      descricao: null,
      anotacoes: null,
      imagemPrincipal: null,
      imagemPerfil: null,
      habilidadeDiariaUsada: false,
      statusEspecial: null,
      userId: "user-1",
      raca: null,
      classe: null,
      slotsDefensivos: null,
    });
    mocks.findMagias.mockResolvedValue([]);
    mocks.findPericias.mockResolvedValue([]);
    mocks.findInventario.mockResolvedValue([]);
    mocks.getOptionalSessionUserId.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3000/api/personagem/8") as never,
      { params: Promise.resolve({ id: "8" }) }
    );

    await expect(response.json()).resolves.toMatchObject({
      id: 8,
      nome: "Lia",
      canEdit: false,
    });
    expect(response.status).toBe(200);
  });
});
