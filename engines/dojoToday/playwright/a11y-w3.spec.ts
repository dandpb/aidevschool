import { type Browser, type Page, expect, test } from "@playwright/test";

/**
 * AID-1096/W3 — evidência executável do contrato do loop tentativa/feedback/retry
 * (docs/design/design-foundations.md §3, spec canônica AID-914 §4 rev 70649549)
 * + forced-colors wave 1 (B7 da §3):
 * 1. papéis canônicos: #soc-reply = feedback-panel, #soc-send = submit-attempt (§4.3-4);
 * 2. sob emulação forced-colors, erro distinguível sem cor (borda dashed) e
 *    outline de foco sobrevive a system colors (geometria preservada);
 * 3. re-tentativa pelo mesmo controle com o mesmo rótulo (§4.1 "verificar de novo").
 *
 * Nota de harness: a emulação usa browser.newContext({ forcedColors: "active" })
 * explícito — o parâmetro via test.use não se propaga neste runner (verificado:
 * matchMedia("(forced-colors: active)") false no fixture padrão).
 *
 * Mutation-guard: remover os data-testid de src/main.ts quebra w3-1; remover o
 * bloco @media (forced-colors: active) de src/styles.css quebra w3-2.
 */
const APP = "http://127.0.0.1:5180";

async function forcedColorsPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ forcedColors: "active" });
  return ctx.newPage();
}

test("w3-1: papéis canônicos do loop — feedback-panel e submit-attempt", async ({ browser }) => {
  const page = await forcedColorsPage(browser);
  await page.goto(APP);
  await expect(page.locator("#soc-reply")).toHaveAttribute("data-testid", "feedback-panel");
  await expect(page.locator("#soc-reply")).toHaveAttribute("role", "status");
  await expect(page.locator("#soc-reply")).toHaveAttribute("aria-live", "polite");
  await expect(page.locator("#soc-reply")).toHaveAttribute("aria-atomic", "true");
  await expect(page.locator("#soc-send")).toHaveAttribute("data-testid", "submit-attempt");
  await page.context().close();
});

test("w3-2: forced-colors — erro distinguível sem cor (borda dashed) e foco sobrevive", async ({
  browser,
}) => {
  const page = await forcedColorsPage(browser);
  await page.goto(APP);
  expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
  await page.evaluate(() => {
    localStorage.setItem(
      "dojoToday:aiConfig",
      JSON.stringify({
        baseUrl: "http://127.0.0.1:5180/fake-ai",
        apiKey: "test-key",
        model: "test-model",
      }),
    );
  });
  await page.route("**/fake-ai/chat/completions", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
  );

  const reply = page.locator("#soc-reply");

  // geometria do outline de foco preservada sob system colors — avaliada antes
  // de qualquer interação de ponteiro: o focus() programático só casa com
  // :focus-visible enquanto a última interação não foi mouse (heurística UA).
  const send = page.locator("#soc-send");
  await send.focus();
  const focusState = await send.evaluate((node) => {
    const cs = getComputedStyle(node);
    return { width: cs.outlineWidth, style: cs.outlineStyle, offset: cs.outlineOffset };
  });
  expect(focusState.style).not.toBe("none");
  expect(Number.parseFloat(focusState.width)).toBeGreaterThanOrEqual(3);
  expect(Number.parseFloat(focusState.offset)).toBeGreaterThanOrEqual(2);

  await page.fill("#soc-q", "pergunta que vai falhar");
  await page.click("#soc-send");
  await expect(reply).toContainText("HTTP 500");

  const errorState = await reply.evaluate((node) => {
    const cs = getComputedStyle(node);
    return { style: cs.borderTopStyle, width: cs.borderTopWidth };
  });
  // distinção sem cor: estilo de borda dashed com largura reforçada (B7 wave 1)
  expect(errorState.style, "is-error dashed sob forced-colors").toBe("dashed");
  expect(Number.parseFloat(errorState.width), "is-error border >= 2px").toBeGreaterThanOrEqual(2);
  await page.context().close();
});

test("w3-3: re-tentativa pelo mesmo controle com o mesmo rótulo (verificar de novo)", async ({
  browser,
}) => {
  const page = await forcedColorsPage(browser);
  await page.goto(APP);
  await page.evaluate(() => {
    localStorage.setItem(
      "dojoToday:aiConfig",
      JSON.stringify({
        baseUrl: "http://127.0.0.1:5180/fake-ai",
        apiKey: "test-key",
        model: "test-model",
      }),
    );
  });
  let fail = true;
  await page.route("**/fake-ai/chat/completions", (route) => {
    if (fail) {
      return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ choices: [{ message: { content: "Resposta socrática de teste." } }] }),
    });
  });

  const reply = page.locator("#soc-reply");
  const send = page.locator("#soc-send");
  await page.fill("#soc-q", "pergunta");
  await page.click("#soc-send");
  await expect(reply).toContainText("HTTP 500");
  // mesmo rótulo, mesmo controle — recuperação sem trocar de superfície
  await expect(send).toHaveText("Perguntar");
  fail = false;
  await page.click("#soc-send");
  await expect(reply).toContainText("Resposta socrática de teste.");
  await expect(reply).not.toContainText("HTTP 500");
  await page.context().close();
});
