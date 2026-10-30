import { expect, test } from "@playwright/test";

test("o mapa leva ao primeiro pedido sem iniciar a missão", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByTestId("onboarding-next").click();
  for (const option of ["save_time", "work", "low", "scheduling"]) {
    await page.getByTestId(`onboarding-option-${option}`).check();
    await page.getByTestId("onboarding-next").click();
  }
  const wayfinding = page.getByRole("button", {
    name: /Ir ao pedido: IA não é uma fonte de verdade/,
  });
  await wayfinding.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("map-lesson-l02")).toBeFocused();
  expect(
    await page.getByTestId("map-lesson-l02").evaluate((row) => ({
      style: getComputedStyle(row).outlineStyle,
      width: getComputedStyle(row).outlineWidth,
    })),
  ).toEqual({ style: "solid", width: "3px" });
  await wayfinding.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("map-lesson-l02")).toBeFocused();
  expect(new URL(page.url()).hash).toBe("");
  await expect(page.getByTestId("map-screen")).toBeVisible();
  await expect(page.getByTestId("map-lesson-l02")).toContainText("Disponível");
  await expect(page.getByTestId("map-lesson-l01")).toContainText("Bloqueada");
  await page.getByTestId("map-start-l02").click();
  await expect(page.getByTestId("lesson-intro")).toBeVisible();
  await page.getByRole("button", { name: "Sair da lição" }).click();
  await page.getByRole("button", { name: /Ir ao pedido: IA não é uma fonte de verdade/ }).click();
  await expect(page.getByTestId("map-lesson-l02")).toBeFocused();
  await expect(page.getByTestId("map-lesson-l02")).toContainText("Em andamento");
});

test("o direcionamento respeita a jornada Dev escolhida", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("onboarding-next").click();
  for (const option of ["save_time", "work", "low", "scheduling"]) {
    await page.getByTestId(`onboarding-option-${option}`).check();
    await page.getByTestId("onboarding-next").click();
  }
  await page.getByTestId("map-back").click();
  await page.getByTestId("journey-switch-dev").click();
  await page
    .getByRole("button", { name: /Ir ao pedido: Quando usar IA e quando não usar/ })
    .click();
  await expect(page.getByTestId("map-lesson-l15")).toBeFocused();
  await expect(page.getByTestId("map-lesson-l15")).toContainText("Disponível");
  await expect(page.getByTestId("map-screen")).toBeVisible();
});
