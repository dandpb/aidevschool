import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { once } from "node:events";
import { createServer } from "node:http";
import { createApp } from "../server/app.mjs";
import { createStore } from "../server/store.mjs";
import { hashPassword } from "../server/auth.mjs";
import { CATALOG } from "../server/catalog.mjs";

let browser;
before(async () => {
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
});
async function fixture(t, { mode = "recommended", enabled = 4 } = {}) {
  const store = createStore(":memory:");
  const dest = createServer((req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.end("<h1>Destino de teste</h1>");
  });
  dest.listen(0, "127.0.0.1");
  await once(dest, "listening");
  const destination = `http://127.0.0.1:${dest.address().port}`;
  const selected = CATALOG.slice(0, enabled);
  for (const e of selected) {
    const old = store.list().find((x) => x.id === e.id);
    store.setEnabled(e.id, true, old.version);
  }
  const targets = Object.fromEntries(
    CATALOG.map((e) => [
      e.id,
      { url: destination + "/" + e.id, readySelector: "h1" },
    ]),
  );
  const ranker = async (_description, engines) => {
    if (mode === "fallback") throw Error("test unavailable");
    return {
      anyFit: mode === "no-match" ? 0.1 : 0.95,
      scores: Object.fromEntries(engines.map((e, i) => [e.id, 3 - i * 0.25])),
    };
  };
  const app = createApp({
    store,
    targets,
    checker: async () => true,
    ranker,
    adminPasswordHash: hashPassword("browser-test-only-password"),
  });
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  const base = `http://127.0.0.1:${app.address().port}`;
  const context = await browser.newContext();
  const page = await context.newPage();
  t.after(async () => {
    await context.close();
    await new Promise((r) => app.close(r));
    await new Promise((r) => dest.close(r));
    try {
      store.close();
    } catch {}
  });
  return { page, base, store, context, selected, destination };
}
async function ask(page, base) {
  await page.goto(base);
  await page
    .getByLabel("O que você quer aprender ou fazer?")
    .fill("Quero aprender a programar com prática");
  await page
    .getByRole("button", { name: "Encontrar meu caminho", exact: true })
    .click();
  await page.locator("[data-engine-card]").first().waitFor();
}

test("C16 student submits without login and chooses destination", async (t) => {
  const { page, base, selected, destination } = await fixture(t);
  await ask(page, base);
  assert.equal(await page.locator("[data-engine-card]").count(), 3);
  assert.equal(
    await page
      .locator("[data-engine-card]")
      .first()
      .getAttribute("data-engine-id"),
    selected[0].id,
  );
  assert.equal(new URL(page.url()).origin, base);
  await page
    .locator("[data-engine-card]")
    .nth(1)
    .getByRole("button", { name: "Começar" })
    .click();
  await page.waitForURL(destination + "/" + selected[1].id);
  assert.equal(await page.locator("h1").textContent(), "Destino de teste");
});
test("C21 browser distinguishes fallback no match and empty", async (t) => {
  for (const mode of ["fallback", "no-match", "empty"]) {
    const { page, base } = await fixture(t, {
      mode,
      enabled: mode === "empty" ? 0 : 4,
    });
    await page.goto(base);
    await page
      .getByLabel("O que você quer aprender ou fazer?")
      .fill("Quero aprender algo novo");
    await page
      .getByRole("button", { name: "Encontrar meu caminho", exact: true })
      .click();
    await page.locator(`[data-result-mode="${mode}"]`).waitFor();
    assert.equal(
      await page.locator("[data-engine-card]").count(),
      mode === "empty" ? 0 : 4,
    );
    const text = await page.locator("#results").textContent();
    assert.match(
      text,
      mode === "fallback"
        ? /personalizar/
        : mode === "no-match"
          ? /combina bem/
          : /Nenhuma experiência/,
    );
  }
});
test("C22 operator login toggle and logout work in browser", async (t) => {
  const { page, base, store } = await fixture(t, { enabled: 0 });
  await page.goto(base + "/admin/engines");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("browser-test-only-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.locator("[data-admin-engine]").first().waitFor();
  assert.equal(await page.locator("[data-admin-engine]").count(), 13);
  const first = page.locator("[data-admin-engine]").first();
  const id = await first.getAttribute("data-admin-engine");
  await first.getByRole("checkbox").check();
  await first.getByText("Alteração salva.", { exact: true }).waitFor();
  assert.equal(Boolean(store.list().find((e) => e.id === id).enabled), true);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.getByRole("button", { name: "Entrar", exact: true }).waitFor();
  assert.equal(await page.locator("[data-admin-engine]").count(), 0);
});
test("C23 mobile and desktop content does not overflow", async (t) => {
  const { page, base } = await fixture(t);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await ask(page, base);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.equal(await page.locator("[data-engine-card]").count(), 3);
  }
});
test("C24 newest student request owns displayed results", async (t) => {
  const { page, base } = await fixture(t);
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/api/recommend", async (route) => {
    await gate;
    try {
      await route.fulfill({
        json: {
          mode: "recommended",
          engines: [
            {
              id: "old",
              name: "Resultado antigo",
              description: "Obsoleto",
              reason: "Old",
            },
          ],
        },
      });
    } catch {}
  });
  await page.goto(base);
  await page
    .getByLabel("O que você quer aprender ou fazer?")
    .fill("Primeiro pedido");
  await page
    .getByRole("button", { name: "Encontrar meu caminho", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ver experiências disponíveis", exact: true })
    .click();
  await page.locator('[data-result-mode="catalog"]').waitFor();
  release();
  await page.waitForTimeout(100);
  assert.equal(
    await page.getByText("Resultado antigo", { exact: true }).count(),
    0,
  );
  assert.equal(await page.locator("[data-engine-card]").count(), 4);
});
