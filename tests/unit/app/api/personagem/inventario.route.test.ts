import { describe, expect, it } from "vitest";

import {
  DELETE,
  PATCH,
  POST,
} from "@/app/api/personagem/[id]/inventario/route";

describe("/api/personagem/[id]/inventario", () => {
  it("bloqueia criacao de item pela ficha do player", async () => {
    const response = await POST();

    await expect(response.json()).resolves.toEqual({
      success: false,
      error:
        "Gerenciamento de itens do inventário é restrito ao administrador do sistema.",
    });
    expect(response.status).toBe(403);
  });

  it("bloqueia edicao estrutural pela ficha do player", async () => {
    const response = await PATCH();

    await expect(response.json()).resolves.toEqual({
      success: false,
      error:
        "Gerenciamento de itens do inventário é restrito ao administrador do sistema.",
    });
    expect(response.status).toBe(403);
  });

  it("bloqueia remocao estrutural pela ficha do player", async () => {
    const response = await DELETE();

    await expect(response.json()).resolves.toEqual({
      success: false,
      error:
        "Gerenciamento de itens do inventário é restrito ao administrador do sistema.",
    });
    expect(response.status).toBe(403);
  });
});
