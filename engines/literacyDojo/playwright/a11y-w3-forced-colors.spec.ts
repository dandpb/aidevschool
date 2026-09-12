import { type Browser, type Page, expect, test } from "@playwright/test";
import { answerRemainingRight, completeOnboarding, mapInitial, wrongOutput } from "./support";

/**
 * AID-1096/W3 — forced-colors wave 1 (B7 da baseline AID-914 §3; contrato
 * docs/design/design-foundations.md §4): sob emulação forced-colors, a distinção
 * pass/fail exista sem cor (largura/estilo de borda) e o outline de foco dos
 * controles do loop sobreviva a system colors (geometria preservada).
 *
 * Nota de harness: a emulação usa browser.newContext({ forcedColors: "active" })
 * explícito — o parâmetro via test.use não se propaga neste runner (verificado:
 * matchMedia("(forced-colors: active)") false no fixture padrão).
 *
 * Mutation-guard: remover as regras @media (forced-colors: active) de
 * src/styles.css quebra os asserts de border-style/width e outline-width abaixo.
 */
async function forcedColorsPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({
    forcedColors: "active",
    viewport: { width: 360, height: 740 },
  });
  return ctx.newPage();
}

test.describe("AID-1096/W3: forced-colors wave 1 no loop de lição", () => {
  test("feedback de falha distinguível sem cor: borda dashed reforçada", async ({ browser }) => {
    const page = await forcedColorsPage(browser);
    await completeOnboarding(page);
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    await page.getByTestId(`output-${wrongOutput.id}`).check();
    await page.getByTestId("submit-attempt").click();

    const panel = page.getByTestId("feedback-panel");
    await expect(panel).toBeVisible();
    // O texto do sumário é o affordance primário (B3); a borda dashed de 3px é
    // o reforço não-color do B7 wave 1.
    await expect(panel).toHaveCSS("border-style", "dashed");
    await expect(panel).toHaveCSS("border-width", "3px");
    await page.context().close();
  });

  test("feedback de acerto distinguível sem cor: borda solid reforçada", async ({ browser }) => {
    const page = await forcedColorsPage(browser);
    await completeOnboarding(page);
    // responde certo sem concluir a lição: o feedback de acerto da última
    // atividade fica visível antes do finish-lesson
    await answerRemainingRight(page, mapInitial.activities);

    const panel = page.getByTestId("feedback-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveCSS("border-style", "solid");
    await expect(panel).toHaveCSS("border-width", "3px");
    await page.context().close();
  });

  test("outline de foco dos controles do loop sobrevive a system colors", async ({ browser }) => {
    const page = await forcedColorsPage(browser);
    await completeOnboarding(page);
    // resposta completa (errada) habilita o submit para o foco por teclado
    await page.getByTestId(`output-${wrongOutput.id}`).check();
    const submit = page.getByTestId("submit-attempt");
    await expect(submit).toBeEnabled();
    // navegação por teclado até o controle primário do loop
    await page.keyboard.press("Tab");
    for (let i = 0; i < 12 && !(await submit.evaluate((el) => el.matches(":focus-visible"))); i++) {
      await page.keyboard.press("Tab");
    }
    expect(await submit.evaluate((el) => el.matches(":focus-visible"))).toBe(true);
    const outline = await submit.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { width: cs.outlineWidth, style: cs.outlineStyle };
    });
    // geometria preservada: largura 3px + estilo sólido (a cor é system color)
    expect(outline.width).toBe("3px");
    expect(outline.style).toBe("solid");
    await page.context().close();
  });
});
