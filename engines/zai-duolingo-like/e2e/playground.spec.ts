import { test, expect } from "@playwright/test";
import { freshOnboardedPage, e2eDb } from "./helpers";

const STUB_REPLY = "resposta stub de Tóquio";
const STUB_ERROR_TEXT =
  "⚠️ Os servidores de Tóquio estão instáveis com a chuva. Tente novamente em instantes.";

test.describe("playground", () => {
  test.beforeEach(async ({ page }) => {
    // Stub the LLM mini-service for every test
    await page.route(/.*\/api\/chat.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, reply: STUB_REPLY }),
      });
    });
  });

  test("happy path: send a message and see the stubbed reply", async ({ page, request }) => {
    const name = await freshOnboardedPage(page, request, "Playground Tester");

    // navigate to playground via bottom nav
    await page.getByRole("button", { name: "IA", exact: true }).click();
    await expect(page.getByText("Playground de IA")).toBeVisible();

    // empty state: Bip greeting with learner name
    await expect(page.getByText(`Oi, ${name}! Sou o Bip.`)).toBeVisible();

    // type and send
    await page.getByPlaceholder("Escreva seu prompt para o Bip...").fill("Olá, Bip");
    await page.getByRole("button", { name: "Enviar" }).click();

    // user message renders
    await expect(page.getByText("Olá, Bip").first()).toBeVisible();

    // assistant reply renders
    await expect(page.getByText(STUB_REPLY)).toBeVisible();

    // DB-level assertion: one chatThread row with both messages.
    // The save POST fires after the reply renders — poll until it lands.
    const db = e2eDb();
    let threads: Awaited<ReturnType<typeof db.chatThread.findMany>> = [];
    await expect
      .poll(async () => {
        threads = await db.chatThread.findMany();
        return threads.length;
      })
      .toBe(1);
    const messages = JSON.parse(threads[0].messages);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "user", content: "Olá, Bip" });
    expect(messages[1]).toMatchObject({ role: "assistant", content: STUB_REPLY });
    await db.$disconnect();
  });

  test("persistence across views: thread survives home → playground round-trip", async ({
    page,
    request,
  }) => {
    await freshOnboardedPage(page, request);

    // go to playground and send a message
    await page.getByRole("button", { name: "IA", exact: true }).click();
    await expect(page.getByText("Playground de IA")).toBeVisible();
    await page.getByPlaceholder("Escreva seu prompt para o Bip...").fill("Mensagem persistente");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText(STUB_REPLY)).toBeVisible();

    // navigate to home and back
    await page.getByRole("button", { name: "Início" }).click();
    await expect(page.getByText("Próxima lição:")).toBeVisible();

    await page.getByRole("button", { name: "IA", exact: true }).click();
    await expect(page.getByText("Playground de IA")).toBeVisible();

    // thread is still shown (in-memory state within SPA session)
    await expect(page.getByText("Mensagem persistente")).toBeVisible();
    await expect(page.getByText(STUB_REPLY)).toBeVisible();
  });

  test("achievement: first message unlocks 'Alma Curiosa'", async ({ page, request }) => {
    await freshOnboardedPage(page, request);

    await page.getByRole("button", { name: "IA", exact: true }).click();
    await expect(page.getByText("Playground de IA")).toBeVisible();

    await page.getByPlaceholder("Escreva seu prompt para o Bip...").fill("Primeira mensagem");
    await page.getByRole("button", { name: "Enviar" }).click();

    // wait for stub reply so the save completes
    await expect(page.getByText(STUB_REPLY)).toBeVisible();

    // achievement toast appears (may share screen with compilador-iniciante)
    await expect(page.getByText("Alma Curiosa").first()).toBeVisible();

    // DB-level assertion
    const db = e2eDb();
    const ach = await db.achievement.findFirst({
      where: { slug: "explorador-playground" },
    });
    expect(ach).not.toBeNull();
    await db.$disconnect();
  });

  test("error path: aborted route shows friendly fallback and clears loading", async ({
    page,
    request,
  }) => {
    // override the stub to abort for this test
    const CHAT_ROUTE = /.*\/api\/chat.*/;
    await page.unroute(CHAT_ROUTE);
    await page.route(CHAT_ROUTE, (route) => route.abort("failed"));

    await freshOnboardedPage(page, request);

    await page.getByRole("button", { name: "IA", exact: true }).click();
    await expect(page.getByText("Playground de IA")).toBeVisible();

    await page.getByPlaceholder("Escreva seu prompt para o Bip...").fill("Vai falhar");
    await page.getByRole("button", { name: "Enviar" }).click();

    // loading indicator appears briefly then clears
    await expect(page.getByText(STUB_ERROR_TEXT)).toBeVisible();

    // send button is no longer showing spinner (loading cleared)
    // the button should be re-enabled because input is now empty after send
    await expect(page.getByPlaceholder("Escreva seu prompt para o Bip...")).toBeEnabled();
  });

  test("new thread: starting a new conversation creates a second chatThread row", async ({
    page,
    request,
  }) => {
    await freshOnboardedPage(page, request);

    await page.getByRole("button", { name: "IA", exact: true }).click();
    await expect(page.getByText("Playground de IA")).toBeVisible();

    // first exchange
    await page.getByPlaceholder("Escreva seu prompt para o Bip...").fill("Primeira thread");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText(STUB_REPLY)).toBeVisible();

    // click "Limpar" to start a new thread
    await page.getByRole("button", { name: "Limpar" }).click();

    // empty state should re-appear (starter prompts visible again)
    await expect(page.getByText("Me peça qualquer coisa.")).toBeVisible();

    // second exchange in new thread
    await page.getByPlaceholder("Escreva seu prompt para o Bip...").fill("Segunda thread");
    await page.getByRole("button", { name: "Enviar" }).click();
    // the new thread's stub reply renders (the old thread is cleared from view;
    // Enviar stays disabled post-send because the input is empty)
    await expect(page.getByText(STUB_REPLY).first()).toBeVisible();

    // the save POST fires after the reply renders — poll the DB for the 2nd row
    const db = e2eDb();
    let threads: Awaited<ReturnType<typeof db.chatThread.findMany>> = [];
    await expect
      .poll(async () => {
        threads = await db.chatThread.findMany({ orderBy: { createdAt: "asc" } });
        return threads.length;
      })
      .toBe(2);
    const msgs0 = JSON.parse(threads[0].messages);
    const msgs1 = JSON.parse(threads[1].messages);
    expect(msgs0[0]).toMatchObject({ role: "user", content: "Primeira thread" });
    expect(msgs1[0]).toMatchObject({ role: "user", content: "Segunda thread" });
    await db.$disconnect();
  });
});