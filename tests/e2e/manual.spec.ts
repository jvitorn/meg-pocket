import { expect, test, type Page } from "@playwright/test";

function collectHydrationErrors(page: Page) {
  const messages: string[] = [];

  page.on("console", (message) => {
    if (message.type() !== "error") return;

    const text = message.text();
    if (
      /hydration|hydrating|did not match|text content does not match|cannot be a descendant/i.test(
        text
      )
    ) {
      messages.push(text);
    }
  });

  page.on("pageerror", (error) => {
    if (/hydration|hydrating|did not match/i.test(error.message)) {
      messages.push(error.message);
    }
  });

  return messages;
}

test("manual redireciona para a edicao essencial", async ({ page }) => {
  await page.goto("/manual");

  await expect(page).toHaveURL(/\/manual\/essencial$/);
  await expect(page.getByRole("heading", { name: "M&G Essencial" }).first()).toBeVisible();
});

test("manual essencial renderiza conteudo, tags, sidebar e sumario", async ({
  page,
}) => {
  const hydrationErrors = collectHydrationErrors(page);

  await page.goto("/manual/essencial/aprendendo-juntos/combate-essencial");

  await expect(
    page.getByRole("heading", { name: "Combate Essencial" }).first()
  ).toBeVisible();
  const tags = page.getByRole("list", { name: "Marcadores da pagina" });

  await expect(tags.getByText("Essencial", { exact: true })).toBeVisible();
  await expect(tags.getByText("Todos", { exact: true })).toBeVisible();
  await expect(tags.getByText("Referência", { exact: true })).toBeVisible();
  const sidebar = page.getByRole("complementary", {
    name: "Navegação lateral do manual",
  });

  await expect(
    sidebar.getByRole("link", { name: "Trocar para M&G Completo" })
  ).toBeVisible();
  await expect(sidebar.getByText("Parte I · Aprendendo Juntos")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Sumario da pagina" })).toBeVisible();
  await expect(page.getByText("ILUSTRAÇÃO DE ABERTURA")).toBeVisible();
  await expect(page.getByText("Regra essencial")).toBeVisible();
  await expect(page.getByText("Exemplo simples")).toBeVisible();

  expect(hydrationErrors).toEqual([]);
});

test("drawer do manual abre no mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 820 });
  await page.goto("/manual/essencial/aprendendo-juntos/combate-essencial");

  await page.getByText("Capítulos", { exact: true }).click();

  await expect(
    page.getByRole("dialog", { name: "Navegação do manual" })
  ).toBeVisible();
  await expect(page.getByLabel("Buscar no manual")).toBeVisible();
  const dialog = page.getByRole("dialog", { name: "Navegação do manual" });

  await expect(dialog.getByText("M&G Essencial").first()).toBeVisible();
  await expect(dialog.getByText("Parte I · Aprendendo Juntos").first()).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: /Combate Essencial/ })
  ).toBeVisible();
});
