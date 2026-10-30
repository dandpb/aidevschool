import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 320, height: 740 },
  { width: 361, height: 740 },
  { width: 375, height: 812 },
  { width: 1280, height: 800 },
]) {
  test(`briefing de entrada e navegação em ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const briefing = page.locator(".welcome-briefing");
    const start = page.getByTestId("onboarding-next");
    await expect(briefing).toContainText("exercícios simulados, sem IA ao vivo");
    await expect(briefing).toContainText("Receba feedback e ajuste");
    await expect(briefing.getByRole("link", { name: "termos do piloto" })).toBeVisible();
    await expect(briefing.getByRole("link", { name: "aviso de privacidade" })).toBeVisible();
    await expect(page.getByTestId("dev-track-teaser")).toHaveAttribute(
      "href",
      "https://aidevschool-codexdojo-os.netlify.app/?track=dev",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    expect(await briefing.evaluate((node) => Boolean(node.nextElementSibling))).toBe(true);
    expect(
      await page
        .locator(".welcome-content")
        .evaluate((node) => Boolean(node.nextElementSibling?.classList.contains("voxel-world"))),
    ).toBe(true);
    if (viewport.width <= 375) {
      const box = await start.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
    if (viewport.width === 320) {
      await page.addStyleTag({ content: 'body { font-family: "DejaVu Sans", sans-serif; }' });
      const box = await start.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    }
    await start.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#onboarding-title")).toHaveText("O que você quer melhorar com IA?");
    await expect(page.locator("#onboarding-title")).toBeFocused();
    await expect(page.getByTestId("onboarding-next")).toBeDisabled();
    await page.getByTestId("onboarding-option-save_time").check();
    await page.getByTestId("onboarding-next").click();
    await page.getByRole("button", { name: "Voltar" }).click();
    await expect(page.getByTestId("onboarding-option-save_time")).toBeChecked();
  });
}
