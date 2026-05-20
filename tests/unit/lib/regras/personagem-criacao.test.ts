import { describe, expect, it } from "vitest";

import { isValidExternalUrl } from "@/lib/regras/personagemCriacao";

describe("isValidExternalUrl", () => {
  it("aceita urls http, https e uploads publicos locais", () => {
    expect(isValidExternalUrl("https://example.com/imagem.png")).toBe(true);
    expect(isValidExternalUrl("http://localhost:3000/uploads/a.png")).toBe(true);
    expect(isValidExternalUrl("/uploads/personagens/2026/05/avatar.png")).toBe(
      true
    );
  });

  it("rejeita caminhos internos do container e traversal", () => {
    expect(isValidExternalUrl("/app/uploads/avatar.png")).toBe(false);
    expect(isValidExternalUrl("C:\\uploads\\avatar.png")).toBe(false);
    expect(isValidExternalUrl("/uploads/../secrets/avatar.png")).toBe(false);
  });
});
