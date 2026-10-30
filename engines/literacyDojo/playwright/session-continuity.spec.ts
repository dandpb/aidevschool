import { expect, test } from "@playwright/test";
import { readProgress } from "./support";

test("intro explica retomada e reload recomeça a sessão sem apagar o progresso registrado", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByTestId("onboarding-next").click();
  for (const option of ["save_time", "work", "low", "scheduling"]) {
    await page.getByTestId(`onboarding-option-${option}`).check();
    await page.getByTestId("onboarding-next").click();
  }
  await page.getByTestId("map-start-l02").click();
  await expect(page.getByTestId("session-continuity")).toContainText("não são recuperadas");
  await page.getByTestId("start-lesson").click();
  await page.getByTestId("output-out-b").check();
  await page.getByTestId("criterion-c-fontes").check();
  await page.getByTestId("criterion-c-limites").check();
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("next-activity").click();
  await page.getByTestId("option-opt-verifica-na-fonte").check();
  const before = await readProgress(page);
  expect((before?.counters as { attempts?: number } | undefined)?.attempts).toBe(1);
  await page.reload();
  await expect(page.getByTestId("lesson-intro")).toBeVisible();
  await expect(page.getByTestId("session-continuity")).toBeVisible();
  expect(
    ((await readProgress(page))?.counters as { attempts?: number } | undefined)?.attempts,
  ).toBe(1);
  await page.getByTestId("start-lesson").click();
  await expect(page.getByTestId("output-out-b")).not.toBeChecked();
  await expect(page.getByTestId("option-opt-verifica-na-fonte")).toHaveCount(0);
});
