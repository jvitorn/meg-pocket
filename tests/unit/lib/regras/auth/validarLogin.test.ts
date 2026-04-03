import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";

import { validarLogin } from "@/lib/regras/auth/validarLogin";

describe("validarLogin", () => {
  it("retorna false quando nao existe hash salvo", async () => {
    await expect(validarLogin("segredo", null)).resolves.toBe(false);
  });

  it("retorna true quando a senha confere com o hash", async () => {
    const hash = await bcrypt.hash("segredo-super-forte", 4);

    await expect(validarLogin("segredo-super-forte", hash)).resolves.toBe(
      true
    );
  });

  it("retorna false quando a senha nao confere", async () => {
    const hash = await bcrypt.hash("segredo-super-forte", 4);

    await expect(validarLogin("senha-errada", hash)).resolves.toBe(false);
  });
});
