import { afterEach, describe, expect, it, vi } from "vitest";

import {
  atualizarItemInventarioCampanha,
  excluirNpcCampanha,
  gerarNpcCampanha,
  salvarNpcCampanha,
  vincularItemCampanha,
} from "@/services/campanhaApiService";

const fetchMock = vi.fn<typeof fetch>();

vi.stubGlobal("fetch", fetchMock);

describe("campanhaApiService", () => {
  afterEach(() => {
    fetchMock.mockReset();
  });

  it("vincula item ao inventario da campanha", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await expect(
      vincularItemCampanha(4, {
        personagemId: "10",
        itemId: "20",
        quantidade: "2",
        observacoes: "Recompensa",
      })
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith("/api/campanhas/4/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personagemId: "10",
        itemId: "20",
        quantidade: "2",
        observacoes: "Recompensa",
      }),
    });
  });

  it("atualiza item de inventario da campanha", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await atualizarItemInventarioCampanha(4, 30, { quantidade: "3" });

    expect(fetchMock).toHaveBeenCalledWith("/api/campanhas/4/inventario/30", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantidade: "3" }),
    });
  });

  it("gera e salva NPCs da campanha", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, npc: { nome: "Mira" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await gerarNpcCampanha(4, { genero: "neutro" });

    expect(fetchMock).toHaveBeenCalledWith("/api/campanhas/4/npcs/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filtros: { genero: "neutro" } }),
    });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    );

    await salvarNpcCampanha(4, {
      nome: "Mira",
      racaId: 1,
      genero: "neutro",
      classeId: null,
      profissao: "",
      importancia: "",
      tom: "classico",
      personalidade: "",
      aparencia: "",
      segredo: "",
      objetivoCampanha: "Guiar o grupo.",
      gancho: "",
      frase: "",
      relacaoComGrupo: "",
      detalheVisual: "",
      descricao: "",
    });

    expect(fetchMock).toHaveBeenLastCalledWith("/api/campanhas/4/npcs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.any(String),
    });
  });

  it("exclui NPC e propaga erro padronizado da API", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await excluirNpcCampanha(4, 9);

    expect(fetchMock).toHaveBeenCalledWith("/api/campanhas/4/npcs/9", {
      method: "DELETE",
    });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Falha controlada." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    );

    await expect(gerarNpcCampanha(4, {})).rejects.toMatchObject({
      name: "ApiRequestError",
      message: "Falha controlada.",
      status: 400,
    });
  });
});
