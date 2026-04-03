import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPersonagensNaCampanha,
  resetarSlotsDefensivos,
  setPersonagemValores,
  usarSlotDefensivo,
} from "@/services/personagemService";

const fetchMock = vi.fn<typeof fetch>();

vi.stubGlobal("fetch", fetchMock);

describe("personagemService", () => {
  afterEach(() => {
    fetchMock.mockReset();
  });

  it("busca personagens de uma campanha", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ id: 1, nome: "Arkan" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await expect(getPersonagensNaCampanha(3)).resolves.toEqual([
      { id: 1, nome: "Arkan" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("/api/campanhas/personagens//3");
  });

  it("envia atualizacao generica do personagem", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await expect(
      setPersonagemValores(7, "hp_atual", 15)
    ).resolves.toEqual({ success: true });

    expect(fetchMock).toHaveBeenCalledWith("/api/personagem//update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        index: 7,
        campo: "hp_atual",
        valor: 15,
      }),
    });
  });

  it("propaga o erro de regra de negocio ao usar slot defensivo", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "LIMITE_ATINGIDO", tipo: "contra" },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      )
    );

    await expect(usarSlotDefensivo(7, "contra")).rejects.toEqual({
      code: "LIMITE_ATINGIDO",
      tipo: "contra",
    });
  });

  it("reseta os slots defensivos quando a api responde com sucesso", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await expect(resetarSlotsDefensivos(7)).resolves.toEqual({
      success: true,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/personagem//7/slots/reset", {
      method: "POST",
    });
  });
});
