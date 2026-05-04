import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validarMestreDaCampanha: vi.fn(),
  personagemFindMany: vi.fn(),
  ameacaFindMany: vi.fn(),
  combateCreate: vi.fn(),
  combateFindMany: vi.fn(),
  combateFindFirst: vi.fn(),
  combateUpdate: vi.fn(),
  combateDelete: vi.fn(),
  participanteUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/regras/campanhaPermissao", () => ({
  validarMestreDaCampanha: mocks.validarMestreDaCampanha,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    personagem: {
      findMany: mocks.personagemFindMany,
    },
    ameaca: {
      findMany: mocks.ameacaFindMany,
    },
    combate: {
      create: mocks.combateCreate,
      findMany: mocks.combateFindMany,
      findFirst: mocks.combateFindFirst,
      update: mocks.combateUpdate,
      delete: mocks.combateDelete,
    },
    combateParticipante: {
      update: mocks.participanteUpdate,
    },
  },
}));

import { POST as createCombat } from "@/app/api/campanhas/[id]/combates/route";
import {
  DELETE as deleteCombat,
  PATCH as updateCombat,
} from "@/app/api/campanhas/[id]/combates/[combateId]/route";

function jsonRequest(url: string, body: unknown, method = "POST") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("rotas de combates da campanha", () => {
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

  it("cria combate com ameaças repetidas e VA total correto", async () => {
    mocks.personagemFindMany.mockResolvedValue([{ id: 10, nome: "Orion" }]);
    mocks.ameacaFindMany.mockResolvedValue([{ id: 20, nome: "Goblin", va: 0.5 }]);
    mocks.combateCreate.mockResolvedValue({
      id: 30,
      nome: "Emboscada",
      status: "RASCUNHO",
      rodadaAtual: 1,
      turnoAtual: 0,
      vaTotal: 1,
      createdAt: new Date("2026-05-02T12:00:00.000Z"),
      startedAt: null,
      endedAt: null,
      _count: { participantes: 3 },
    });

    const response = await createCombat(
      jsonRequest("http://localhost:3000/api/campanhas/4/combates", {
        nome: "Emboscada",
        personagens: [{ personagemId: 10, iniciativa: 12 }],
        ameacas: [
          { ameacaId: 20, iniciativa: 8 },
          { ameacaId: 20, iniciativa: 14 },
        ],
      }),
      { params: Promise.resolve({ id: "4" }) }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      combate: { id: 30, vaTotal: 1, participantesCount: 3 },
    });
    expect(mocks.combateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          campanhaId: 4,
          vaTotal: 1,
          participantes: {
            create: [
              expect.objectContaining({ nome: "Goblin 2", ordem: 0 }),
              expect.objectContaining({ nome: "Orion", ordem: 1 }),
              expect.objectContaining({ nome: "Goblin 1", ordem: 2 }),
            ],
          },
        }),
      })
    );
  });

  it("inicia combate reordenando participantes por iniciativa", async () => {
    mocks.combateFindFirst.mockResolvedValue({
      id: 30,
      status: "RASCUNHO",
      rodadaAtual: 1,
      turnoAtual: 0,
      startedAt: null,
      participantes: [
        { id: 1, nome: "Orion", iniciativa: 8 },
        { id: 2, nome: "Goblin 1", iniciativa: 14 },
      ],
    });
    mocks.participanteUpdate.mockResolvedValue({});
    mocks.combateUpdate.mockResolvedValue({});

    const response = await updateCombat(
      jsonRequest(
        "http://localhost:3000/api/campanhas/4/combates/30",
        { action: "iniciar" },
        "PATCH"
      ),
      { params: Promise.resolve({ id: "4", combateId: "30" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.participanteUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 2 },
      data: { ordem: 0 },
    });
    expect(mocks.participanteUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 1 },
      data: { ordem: 1 },
    });
    expect(mocks.combateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 30 },
        data: expect.objectContaining({
          status: "EM_ANDAMENTO",
          rodadaAtual: 1,
          turnoAtual: 0,
        }),
      })
    );
  });

  it("avança, volta e encerra turnos de combate em andamento", async () => {
    mocks.combateFindFirst
      .mockResolvedValueOnce({
        id: 30,
        status: "EM_ANDAMENTO",
        rodadaAtual: 1,
        turnoAtual: 1,
        participantes: [
          { id: 1, nome: "Orion", iniciativa: 14 },
          { id: 2, nome: "Goblin 1", iniciativa: 8 },
        ],
      })
      .mockResolvedValueOnce({
        id: 30,
        status: "EM_ANDAMENTO",
        rodadaAtual: 2,
        turnoAtual: 0,
        participantes: [
          { id: 1, nome: "Orion", iniciativa: 14 },
          { id: 2, nome: "Goblin 1", iniciativa: 8 },
        ],
      })
      .mockResolvedValueOnce({
        id: 30,
        status: "EM_ANDAMENTO",
        rodadaAtual: 2,
        turnoAtual: 1,
        participantes: [
          { id: 1, nome: "Orion", iniciativa: 14 },
          { id: 2, nome: "Goblin 1", iniciativa: 8 },
        ],
      });
    mocks.combateUpdate.mockResolvedValue({});

    await updateCombat(
      jsonRequest(
        "http://localhost:3000/api/campanhas/4/combates/30",
        { action: "proximo" },
        "PATCH"
      ),
      { params: Promise.resolve({ id: "4", combateId: "30" }) }
    );
    await updateCombat(
      jsonRequest(
        "http://localhost:3000/api/campanhas/4/combates/30",
        { action: "voltar" },
        "PATCH"
      ),
      { params: Promise.resolve({ id: "4", combateId: "30" }) }
    );
    await updateCombat(
      jsonRequest(
        "http://localhost:3000/api/campanhas/4/combates/30",
        { action: "encerrar" },
        "PATCH"
      ),
      { params: Promise.resolve({ id: "4", combateId: "30" }) }
    );

    expect(mocks.combateUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 30 },
      data: { turnoAtual: 0, rodadaAtual: 2 },
    });
    expect(mocks.combateUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 30 },
      data: { turnoAtual: 1, rodadaAtual: 1 },
    });
    expect(mocks.combateUpdate).toHaveBeenNthCalledWith(3, {
      where: { id: 30 },
      data: expect.objectContaining({
        status: "ENCERRADO",
        endedAt: expect.any(Date),
      }),
    });
  });

  it("exclui combate da campanha do mestre", async () => {
    mocks.combateFindFirst.mockResolvedValue({ id: 30 });
    mocks.combateDelete.mockResolvedValue({});

    const response = await deleteCombat(
      new Request("http://localhost:3000/api/campanhas/4/combates/30", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "4", combateId: "30" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.combateDelete).toHaveBeenCalledWith({ where: { id: 30 } });
  });
});
