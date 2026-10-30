import { expect, test } from "@playwright/test";
import { answerRight, completeOnboarding, readProgress } from "./support";

test("resultado orienta revisão no app sem prometer notificação", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(Notification, "permission", { configurable: true, value: "denied" }),
  );
  await completeOnboarding(page);
  expect(await page.evaluate(() => Notification.permission)).toBe("denied");
  await answerRight(page);
  const result = page.getByTestId("result-screen");
  await expect(result).toBeVisible();
  await expect(result).toContainText("revisões disponíveis");
  await expect(result).not.toContainText("Vamos lembrar você");
  const progress = await readProgress(page);
  const next = Object.values(progress?.skills ?? {})
    .map((skill) => skill.nextReviewAt)
    .find(Boolean);
  if (!next) throw new Error("revisão não agendada na fixture");
  await page.clock.setFixedTime(new Date(new Date(next).getTime() + 1000));
  await page.reload();
  await page.getByTestId("open-progress").click();
  await expect(page.getByTestId("reviews-due")).toBeVisible();
});
