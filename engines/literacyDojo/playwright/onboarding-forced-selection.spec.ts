import { expect, test } from "@playwright/test";

test("cores forçadas mostram somente a opção selecionada em cada pergunta", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.goto("/");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await page.getByTestId("onboarding-next").click();
  for (const [chosen, other] of [
    ["save_time", "protect_data"],
    ["work", "studies"],
    ["low", "medium"],
    ["scheduling", "news_research"],
  ]) {
    const selected = page.getByTestId(`onboarding-option-${chosen}`);
    const unselected = page.getByTestId(`onboarding-option-${other}`);
    await expect(selected).toHaveCSS("opacity", "1");
    await expect(selected.locator("..").locator(".option-check")).toHaveCSS("display", "none");
    await selected.focus();
    await page.keyboard.press("Space");
    await unselected.focus();
    await expect(selected).toBeChecked();
    await expect(unselected).not.toBeChecked();
    await expect(unselected).toBeFocused();
    const width = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(width.content).toBeLessThanOrEqual(width.viewport);
    await page.getByTestId("onboarding-next").focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByTestId("map-screen")).toBeVisible();
});
