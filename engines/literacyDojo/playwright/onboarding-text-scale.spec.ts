import { expect, test } from "@playwright/test";

test("perguntas cabem com texto ampliado e mantêm seleção por teclado", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await page.getByTestId("onboarding-next").click();
  for (const option of ["protect_data", "studies", "low", "news_research"]) {
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
    const radio = page.getByTestId(`onboarding-option-${option}`);
    await radio.focus();
    await page.keyboard.press("Space");
    await expect(radio).toBeChecked();
    await page.getByTestId("onboarding-next").focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("map-screen")).toBeVisible();
});
