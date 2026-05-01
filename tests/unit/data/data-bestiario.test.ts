import { describe, expect, it } from "vitest";

import { dataBestiario, getAmeacaById } from "@/data/dataBestiario";

describe("dataBestiario", () => {
  it("mantem o bestiario expandido com ids unicos", () => {
    const ids = dataBestiario.map((ameaca) => ameaca.id);

    expect(dataBestiario).toHaveLength(44);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mantem os campos essenciais preenchidos para a listagem e detalhe", () => {
    for (const ameaca of dataBestiario) {
      expect(ameaca.id).toBeTruthy();
      expect(ameaca.nome).toBeTruthy();
      expect(ameaca.tipo).toBeTruthy();
      expect(ameaca.elemento).toBeTruthy();
      expect(ameaca.descricao).toBeTruthy();
      expect(ameaca.narrativa).toBeTruthy();
      expect(ameaca.golpes.length).toBeGreaterThan(0);
      expect(ameaca.va).toBeGreaterThan(0);
      expect(ameaca.pv).toBeGreaterThan(0);
      expect(ameaca.defesa).toBeGreaterThan(0);
      expect(ameaca.reacoes).toEqual(
        expect.objectContaining({
          bloqueio: expect.any(Number),
          esquiva: expect.any(Number),
          contraAtaque: expect.any(Number),
        })
      );
    }
  });

  it("busca uma ameaca pelo id", () => {
    expect(getAmeacaById("dragao-glacial")).toEqual(
      expect.objectContaining({
        nome: "Dragão Glacial",
        tipo: "Dragão",
        elemento: "Água",
      })
    );

    expect(getAmeacaById("rota-inexistente")).toBeNull();
  });
});
