import { expect, test, type Page } from "@playwright/test";

const SEED_EMAIL = "seed.user.1@meg-pocket.local";
const SEED_PASSWORD = "seed123";

async function loginAsSeedUser(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SEED_EMAIL);
  await page.getByLabel("Senha", { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test("ficha básica cobre recursos críticos do personagem", async ({ page }) => {
  await loginAsSeedUser(page);

  await test.step("atualiza HP, mana, sobre e slot reativo na ficha base", async () => {
    await page.goto("/personagens/1");
    await expect(
      page.getByRole("heading", { name: "Celi", exact: true })
    ).toBeVisible();

    await page.getByRole("button", { name: "Atualizar HP" }).click();
    await page.getByRole("button", { name: "Diminuir HP" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("19/20")).toBeVisible();

    await page.getByRole("button", { name: "Atualizar Mana" }).click();
    await page.getByRole("button", { name: "Diminuir Mana" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText(/^8\/\d+$/)).toBeVisible();

    await page.locator("#sobre").getByRole("button", { name: "Editar" }).click();
    const textarea = page.locator("textarea");
    await textarea.fill("Celi testada em fluxo e2e.");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(
      page.locator("#sobre").getByText("Celi testada em fluxo e2e.")
    ).toBeVisible();

    const usarEsquiva = page
      .locator("#defesa")
      .getByRole("button", { name: "Usar Esquiva" });
    await usarEsquiva.click();
    await expect(
      page.locator("#defesa").getByRole("button", { name: "Usar Esquiva" })
    ).toBeDisabled();
  });

  await test.step("conjura magia e atualiza a mana da ficha", async () => {
    await page
      .locator("#magias")
      .getByRole("button", { name: /Escudo Rochoso/i })
      .click();
    await page.getByRole("button", { name: "Ativar" }).click();
    await expect(page.getByText(/^6\/\d+$/)).toBeVisible();
  });

  await test.step("ativa defesa por item e move o item esgotado para o registro oculto ao zerar a barra", async () => {
    await page.goto("/personagens/8");
    await expect(
      page.getByRole("heading", { name: "Robin", exact: true })
    ).toBeVisible();

    await expect(page.getByText("Capa Arcana")).toBeVisible();

    const useResponse = await page.evaluate(async () => {
      const response = await fetch("/api/personagem/8/inventario/6/usar", {
        method: "POST",
      });

      return {
        ok: response.ok,
        payload: await response.json(),
      };
    });

    expect(useResponse.ok).toBe(true);

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Robin", exact: true })
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Atualizar Defesa" })).toBeVisible();

    await page.getByRole("button", { name: "Atualizar Defesa" }).click();
    await page.getByRole("button", { name: "Diminuir Defesa" }).click();
    await page.getByRole("button", { name: "Diminuir Defesa" }).click();
    await page.getByRole("button", { name: "Diminuir Defesa" }).click();

    const defesaResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/personagem/update") &&
        response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Confirmar" }).click();
    const defesaResponse = await defesaResponsePromise;

    expect(defesaResponse.ok()).toBeTruthy();

    await expect(
      page.getByRole("button", { name: "Atualizar Defesa" })
    ).toHaveCount(0);
    await expect(page.getByText("Itens esgotados (1)")).toBeVisible();

    await page.getByRole("button", { name: "Itens esgotados (1)" }).click();
    await expect(page.getByText("Capa Arcana")).toBeVisible();
    await expect(
      page.getByText("Registro preservado após esgotar a durabilidade.")
    ).toBeVisible();
  });
});
