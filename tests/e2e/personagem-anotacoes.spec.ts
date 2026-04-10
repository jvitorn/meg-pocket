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

test("login com credenciais renderiza o dashboard do jogador", async ({
  page,
}) => {
  await loginAsSeedUser(page);

  await expect(
    page.getByRole("heading", { name: "Personagens", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Novo Personagem" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Acessar Ficha" }).first()
  ).toBeVisible();
  await expect(page.getByText(/Bem-vindo/i)).toBeVisible();
});

test("salva anotacoes na ficha e preserva o texto apos recarregar", async ({
  page,
}) => {
  await loginAsSeedUser(page);

  await page.goto("/personagens/1");
  await expect(page.locator("#anotacoes")).toBeVisible();

  await page.locator("#anotacoes").getByRole("button", { name: "Abrir" }).click();
  const textarea = page.getByPlaceholder(/Escreva aqui pistas/i);
  await textarea.fill("Anotação e2e sobre o grimório escondido.");

  const saveResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/personagem/update") &&
      response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Salvar anotações" }).click();
  const saveResponse = await saveResponsePromise;

  expect(saveResponse.ok()).toBeTruthy();

  await expect(page.locator("#anotacoes")).toContainText("Com anotações salvas");

  await page.reload();
  await expect(page.locator("#anotacoes")).toContainText("Com anotações salvas");

  await page.locator("#anotacoes").getByRole("button", { name: "Abrir" }).click();
  await expect(page.getByPlaceholder(/Escreva aqui pistas/i)).toHaveValue(
    "Anotação e2e sobre o grimório escondido."
  );
});

test.describe("ficha mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("reposiciona elemento e secoes acima dos slots reativos no mobile", async ({
    page,
  }) => {
    await loginAsSeedUser(page);

    await page.goto("/personagens/1");
    await page.evaluate(() => window.scrollTo(0, 0));

    const elemento = page.getByText("Elemento").first();
    const secoes = page.getByText("Seções da ficha").first();
    const slots = page.getByRole("heading", { name: "Slots Reativos" });

    await expect(elemento).toBeVisible();
    await expect(secoes).toBeVisible();
    await expect(slots).toBeVisible();

    const elementoBox = await elemento.boundingBox();
    const secoesBox = await secoes.boundingBox();
    const slotsBox = await slots.boundingBox();

    expect(elementoBox).not.toBeNull();
    expect(secoesBox).not.toBeNull();
    expect(slotsBox).not.toBeNull();
    expect(elementoBox!.y).toBeLessThan(slotsBox!.y);
    expect(secoesBox!.y).toBeLessThan(slotsBox!.y);
  });
});
