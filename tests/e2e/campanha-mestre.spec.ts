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

test("mestre cria campanha e salva um NPC procedural", async ({ page }) => {
  await loginAsSeedUser(page);

  const campaignName = `Mesa E2E NPC ${Date.now()}`;
  const campanha = await page.evaluate(async (nome) => {
    const response = await fetch("/api/campanhas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        mestre: "Mestre Seed",
        sinopse: "Campanha criada pelo fluxo e2e do mestre.",
        tags: ["e2e", "mestre", "npc"],
      }),
    });

    return {
      ok: response.ok,
      status: response.status,
      payload: await response.json(),
    };
  }, campaignName);

  expect(campanha.ok, JSON.stringify(campanha.payload)).toBe(true);
  expect(campanha.status).toBe(201);

  const campaignId = campanha.payload.campanha.id as number;

  const generated = await page.evaluate(async (id) => {
    const response = await fetch(`/api/campanhas/${id}/npcs/gerar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filtros: {
          genero: "neutro",
          importancia: "contato",
          tom: "classico",
        },
      }),
    });

    return {
      ok: response.ok,
      status: response.status,
      payload: await response.json(),
    };
  }, campaignId);

  expect(generated.ok, JSON.stringify(generated.payload)).toBe(true);
  expect(generated.payload.npc.nome).toBeTruthy();

  const saved = await page.evaluate(
    async ({ id, npc }) => {
      const response = await fetch(`/api/campanhas/${id}/npcs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...npc,
          nome: `Contato ${npc.nome}`,
          objetivoCampanha:
            npc.objetivoCampanha || "Servir como contato inicial da campanha.",
        }),
      });

      return {
        ok: response.ok,
        status: response.status,
        payload: await response.json(),
      };
    },
    { id: campaignId, npc: generated.payload.npc }
  );

  expect(saved.ok, JSON.stringify(saved.payload)).toBe(true);
  expect(saved.status).toBe(201);

  const npcId = saved.payload.npc.id as number;
  const npcName = saved.payload.npc.nome as string;

  await page.goto(`/campanhas/escudo/${campaignId}/npcs?npc=${npcId}`);

  await expect(
    page.getByRole("heading", { name: "NPCs", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: npcName, exact: true })
  ).toBeVisible();
  await expect(page.getByText("Ficha do NPC")).toBeVisible();
});
