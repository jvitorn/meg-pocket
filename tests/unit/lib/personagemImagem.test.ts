import { describe, expect, it } from "vitest";

import { resolverImagemPerfilPersonagem } from "@/lib/personagemImagem";

describe("resolverImagemPerfilPersonagem", () => {
  it("prioriza a imagem de perfil quando ela existe", () => {
    expect(
      resolverImagemPerfilPersonagem({
        imagemPerfil: "https://example.com/perfil.png",
        imagemPrincipal: "https://example.com/principal.png",
      })
    ).toBe("https://example.com/perfil.png");
  });

  it("usa a imagem principal apenas quando nao ha perfil", () => {
    expect(
      resolverImagemPerfilPersonagem({
        imagemPerfil: null,
        imagemPrincipal: "https://example.com/principal.png",
      })
    ).toBe("https://example.com/principal.png");
  });

  it("ignora strings vazias ou com espacos", () => {
    expect(
      resolverImagemPerfilPersonagem({
        imagemPerfil: "   ",
        imagemPrincipal: " https://example.com/principal.png ",
      })
    ).toBe("https://example.com/principal.png");
  });
});
