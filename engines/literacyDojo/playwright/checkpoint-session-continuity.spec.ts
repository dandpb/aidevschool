import { expect, test } from "@playwright/test";
import { readProgress, seedCorridorProgress } from "./support";

test("desafio explica reinício e mantém tentativas registradas após sair e recarregar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"] });
  await page.reload();
  const action = page.getByTestId("continue-button");
  await expect(action).toContainText("Abrir desafio");
  await expect(page.getByTestId("checkpoint-continuity-home")).toContainText("primeira atividade");
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("checkpoint-continuity-intro")).toContainText(
    "ao sair ou recarregar",
  );
  await page.getByTestId("start-checkpoint").click();
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("next-activity").click();
  await expect(page.getByTestId("checkpoint-activity-status")).toHaveText("Atividade 2 de 3");
  await page.getByTestId("output-out-a").check();
  const before = await readProgress(page);
  await page.getByRole("button", { name: "Sair do desafio" }).click();
  await page.getByTestId("map-back").click();
  await page.getByTestId("continue-button").click();
  await page.getByTestId("start-checkpoint").click();
  await expect(page.getByTestId("checkpoint-activity-status")).toHaveText("Atividade 1 de 3");
  const after = await readProgress(page);
  expect(after?.counters.attempts).toBe(before?.counters.attempts);
  expect(after?.xp).toBe(before?.xp);
  await page.getByTestId("submit-attempt").click();
  await page.getByTestId("next-activity").click();
  await expect(page.getByTestId("output-out-a")).not.toBeChecked();
  await page.reload();
  await page.getByTestId("continue-button").click();
  await expect(page.getByTestId("checkpoint-continuity-intro")).toBeVisible();
  await page.getByTestId("start-checkpoint").click();
  await expect(page.getByTestId("checkpoint-activity-status")).toHaveText("Atividade 1 de 3");
});
