import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./support";

test("guia do mapa Dev cabe com texto ampliado sem cortar orientação", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await completeOnboarding(page);
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(page.getByTestId("map-guide")).toContainText("Em andamento");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByTestId("map-back").click();
  await page.getByTestId("journey-switch-dev").click();
  await expect(page.getByTestId("map-guide")).toContainText("avance pelos módulos");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const guide = page.getByTestId("map-guide");
  const box = await guide.locator(".mentor-copy").boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
  expect(
    await guide.locator(".mentor-copy").evaluate((node) => node.scrollWidth),
  ).toBeLessThanOrEqual(Math.ceil(box?.width ?? 0));
  await page.getByRole("button", { name: /Ir ao pedido:/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("map-lesson-l15")).toBeFocused();
});
