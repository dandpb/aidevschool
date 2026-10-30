import { expect, test } from "@playwright/test";
import { completeOnboarding, readProgress, writeProgressDoc } from "./support";

test("resumo do cabeçalho identifica a sequência na árvore acessível", async ({ page }) => {
  await completeOnboarding(page);
  async function names() {
    return page.locator(".product-stats").ariaSnapshot();
  }
  expect(await names()).toContain("Sequência atual: 0 dias");
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  expect(await names()).toContain("Sequência atual: 1 dia");
  await expect(page.locator(".product-stats")).toContainText("🔥 1");
  const progress = await readProgress(page);
  if (!progress) throw new Error("progresso ausente");
  progress.streak.lastActivityDate = "2099-01-01";
  await writeProgressDoc(page, progress);
  await page.reload();
  await expect.poll(names).toContain("Sequência atual indisponível");
  await expect(page.locator(".product-stats")).toContainText("🔥 —");
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.locator(".product-stats > span")).toHaveCount(2);
  await expect(page.locator(".product-stats .sr-only")).toHaveCSS("width", "1px");
});
