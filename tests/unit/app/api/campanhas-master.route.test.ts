import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  validarMestreDaCampanha: vi.fn(),
  revalidateCampanhasData: vi.fn(),
  transaction: vi.fn(),
  campanhaCreate: vi.fn(),
  campanhaUpdate: vi.fn(),
  personagemFindFirst: vi.fn(),
  itemFindUnique: vi.fn(),
  itemInventarioUpsert: vi.fn(),
  itemInventarioFindFirst: vi.fn(),
  itemInventarioUpdate: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/cache/revalidate", () => ({
  revalidateCampanhasData: mocks.revalidateCampanhasData,
}));

vi.mock("@/lib/regras/campanhaPermissao", () => ({
  validarMestreDaCampanha: mocks.validarMestreDaCampanha,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    campanha: {
      create: mocks.campanhaCreate,
      update: mocks.campanhaUpdate,
    },
    personagem: {
      findFirst: mocks.personagemFindFirst,
    },
    item: {
      findUnique: mocks.itemFindUnique,
    },
    itemInventario: {
      upsert: mocks.itemInventarioUpsert,
      findFirst: mocks.itemInventarioFindFirst,
      update: mocks.itemInventarioUpdate,
    },
  },
}));

import { POST as createCampaign } from "@/app/api/campanhas/route";
import { PATCH as updateCampaign } from "@/app/api/campanhas/[id]/route";
import { POST as linkInventoryItem } from "@/app/api/campanhas/[id]/inventario/route";
import { PATCH as updateInventoryItem } from "@/app/api/campanhas/[id]/inventario/[inventoryItemId]/route";

function jsonRequest(url: string, body: unknown, method = "POST") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("rotas do mestre de campanha", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.transaction.mockImplementation((arg) =>
      Array.isArray(arg) ? Promise.all(arg) : arg({})
    );
    mocks.validarMestreDaCampanha.mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      userId: "user-1",
      campanha: { id: 4 },
    });
  });

  it("cria campanha com dados iniciais normalizados", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-1", name: "Mestre" },
    });
    mocks.campanhaCreate.mockResolvedValue({
      id: 4,
      nome: "As Ruinas",
      sinopse: "Mesa sombria",
      capa: null,
      mestre: "Mestre",
      tags: ["ruinas", "misterio"],
    });

    const response = await createCampaign(
      jsonRequest("http://localhost:3000/api/campanhas", {
        nome: " As Ruinas ",
        sinopse: "Mesa sombria",
        mestre: "Mestre",
        tags: ["Ruinas", "ruinas", "Misterio"],
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      campanha: { id: 4, tags: ["ruinas", "misterio"] },
    });
    expect(mocks.campanhaCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nome: "As Ruinas",
          tags: ["ruinas", "misterio"],
          userId: "user-1",
        }),
      })
    );
    expect(mocks.revalidateCampanhasData).toHaveBeenCalledTimes(1);
  });

  it("edita as informações iniciais da campanha do mestre", async () => {
    mocks.campanhaUpdate.mockResolvedValue({
      id: 4,
      nome: "Novo Nome",
      sinopse: "Nova sinopse",
      mestre: "Narradora",
      capa: null,
      tags: ["politica"],
    });

    const response = await updateCampaign(
      jsonRequest(
        "http://localhost:3000/api/campanhas/4",
        {
          nome: "Novo Nome",
          sinopse: "Nova sinopse",
          mestre: "Narradora",
          tags: ["Politica"],
        },
        "PATCH"
      ),
      { params: Promise.resolve({ id: "4" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      campanha: { nome: "Novo Nome", tags: ["politica"] },
    });
    expect(mocks.validarMestreDaCampanha).toHaveBeenCalledWith(4);
    expect(mocks.campanhaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 4 },
        data: expect.objectContaining({
          nome: "Novo Nome",
          tags: ["politica"],
        }),
      })
    );
  });

  it("vincula item ao personagem da campanha criando ItemInventario", async () => {
    mocks.personagemFindFirst.mockResolvedValue({ id: 10 });
    mocks.itemFindUnique.mockResolvedValue({
      id: 20,
      durabilidadeBase: 2,
      durabilidadeMax: 4,
      efeito: null,
    });
    mocks.itemInventarioUpsert.mockResolvedValue({ id: 30 });

    const response = await linkInventoryItem(
      jsonRequest("http://localhost:3000/api/campanhas/4/inventario", {
        personagemId: "10",
        itemId: "20",
        quantidade: "2",
        durabilidadeAtual: "3",
        durabilidadeMax: "4",
        observacoes: "Entrega do mestre",
      }),
      { params: Promise.resolve({ id: "4" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.personagemFindFirst).toHaveBeenCalledWith({
      where: { id: 10, campanhaId: 4 },
      select: { id: true },
    });
    expect(mocks.itemInventarioUpsert).toHaveBeenCalledWith({
      where: {
        personagemId_itemId: {
          personagemId: 10,
          itemId: 20,
        },
      },
      create: expect.objectContaining({
        personagemId: 10,
        itemId: 20,
        quantidade: 2,
        durabilidadeAtual: 3,
        durabilidadeMax: 4,
        observacoes: "Entrega do mestre",
      }),
      update: expect.objectContaining({
        quantidade: { increment: 2 },
        durabilidadeAtual: 3,
        durabilidadeMax: 4,
        esgotadoEm: null,
      }),
    });
  });

  it("recupera item expirado respeitando a durabilidade maxima escolhida", async () => {
    mocks.itemInventarioFindFirst.mockResolvedValue({
      id: 30,
      personagemId: 10,
      itemId: 20,
      quantidade: 0,
      durabilidadeAtual: 0,
      durabilidadeMax: 4,
      efeitoAtivo: true,
      esgotadoEm: new Date("2026-04-01T00:00:00.000Z"),
      observacoes: null,
      item: {
        id: 20,
        tipo: "ARMA",
        durabilidadeBase: 2,
        durabilidadeMax: 4,
      },
      personagem: { id: 10, campanhaId: 4 },
    });
    mocks.itemInventarioUpdate.mockResolvedValue({ id: 30 });

    const response = await updateInventoryItem(
      jsonRequest(
        "http://localhost:3000/api/campanhas/4/inventario/30",
        { action: "recover", durabilidadeAtual: "9" },
        "PATCH"
      ),
      { params: Promise.resolve({ id: "4", inventoryItemId: "30" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.itemInventarioUpdate).toHaveBeenCalledWith({
      where: { id: 30 },
      data: {
        quantidade: 1,
        durabilidadeAtual: 4,
        durabilidadeMax: 4,
        efeitoAtivo: false,
        esgotadoEm: null,
      },
    });
  });
});
