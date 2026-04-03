import { expect, test } from "@playwright/test";

test("pagina de login permite navegar para cadastro", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByText("É bom vê-lo novamente")).toBeVisible();

  await page.getByRole("link", { name: "Cadastrar" }).click();

  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(page.getByText("Forje sua jornada")).toBeVisible();
});

test("cadastro valida senhas divergentes no cliente", async ({ page }) => {
  await page.goto("/cadastro");

  await page.getByLabel("Nome do aventureiro").fill("Arkan");
  await page.getByLabel("Email").fill("arkan@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("segredo-1");
  await page.getByLabel("Confirmar senha").fill("segredo-2");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page.getByText("As senhas não conferem.")).toBeVisible();
});

test("pagina de campanhas carrega o cabecalho principal", async ({ page }) => {
  await page.goto("/campanhas");

  await expect(
    page.getByRole("heading", { name: "Campanhas Ativas" })
  ).toBeVisible();
  await expect(
    page.getByText("Explore as campanhas e mergulhe nas histórias")
  ).toBeVisible();
});
