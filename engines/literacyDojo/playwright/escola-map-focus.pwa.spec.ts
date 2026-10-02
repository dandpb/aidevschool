import { expect, test } from "@playwright/test";

/**
 * AID-3532 — regressão de acessibilidade da entrada /escola/ (P3).
 *
 * O handler dos links da alternativa textual do mapa fazia
 * setAttribute("tabindex","-1") → focus() → removeAttribute("tabindex"):
 * o Chromium dropa o foco para BODY quando o atributo tabindex é removido
 * do elemento focalizado (repro QA AID-3517 caso B9 no lineage e95611da,
 * build+preview). Contrato corrigido: tabindex="-1" PERMANECE no cartão
 * (mesmo padrão do alvo do skip link #etapa-atual, estático no index.html)
 * e o foco persiste após a ativação — teclado e mouse, inclusive repetida.
 *
 * Mutation-guard: além do foco imediato, o foco é re-checado um frame depois
 * para pegar variantes que adiarem a remoção do atributo (ex.: setTimeout),
 * e o tabindex="-1" do alvo é afirmado junto com o foco.
 *
 * Roda só no projeto "pwa" (build real + preview), o mesmo ambiente da repro
 * — ver playwright.config.ts.
 */
const JOURNEYS = [
  { selector: "#jornada-cotidiano", id: "jornada-cotidiano" },
  { selector: "#jornada-dev", id: "jornada-dev" },
] as const;

async function openMapAlt(page: import("@playwright/test").Page) {
  await page.goto("/escola/");
  await expect(page.getByRole("heading", { name: "Fundamentos de IA" })).toBeVisible();
  await page.locator("#map-alt summary").click();
  await expect(page.locator("#map-alt[open]")).toBeVisible();
}

async function expectFocusPersisted(page: import("@playwright/test").Page, id: string) {
  await expect(page.locator(`#${id}`)).toBeFocused();
  await expect(page.locator(`#${id}`)).toHaveAttribute("tabindex", "-1");
  // Um frame depois o foco continua no cartão: a perda do bug original era
  // síncrona no handler, e uma limpeza adiada do atributo a reintroduziria.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));
  expect(await page.evaluate(() => document.activeElement?.id)).toBe(id);
}

for (const journey of JOURNEYS) {
  test(`AID-3532 mapa em texto: Enter no link foca ${journey.selector} e o foco persiste`, async ({
    page,
  }) => {
    await openMapAlt(page);
    const link = page.locator(`.map-alt a[href="${journey.selector}"]`);
    await link.focus();
    await page.keyboard.press("Enter");
    await expectFocusPersisted(page, journey.id);
  });
}

test("AID-3532 mapa em texto: click no link foca #jornada-dev e o foco persiste", async ({
  page,
}) => {
  await openMapAlt(page);
  await page.locator('.map-alt a[href="#jornada-dev"]').click();
  await expectFocusPersisted(page, "jornada-dev");
});

test("AID-3532 mapa em texto: ativações repetidas continuam focando o cartão", async ({ page }) => {
  await openMapAlt(page);
  const link = page.locator('.map-alt a[href="#jornada-dev"]');
  await link.click();
  await expectFocusPersisted(page, "jornada-dev");
  await link.click();
  await expectFocusPersisted(page, "jornada-dev");
  await link.focus();
  await page.keyboard.press("Enter");
  await expectFocusPersisted(page, "jornada-dev");
});
