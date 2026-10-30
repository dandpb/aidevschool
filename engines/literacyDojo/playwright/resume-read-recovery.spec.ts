import { expect, test } from "@playwright/test";
import { readLearnerState, seedCorridorProgress } from "./support";

test("erro na segunda leitura de boot oferece recarga e preserva progresso", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l02"], currentLessonId: "l03" });
  const before = await readLearnerState(page);
  if (!before) throw new Error("progresso ausente");
  await page.addInitScript(() => {
    if (sessionStorage.getItem("test-resume-read-failed")) return;
    let reads = 0;
    const original = IDBObjectStore.prototype.get;
    Object.assign(window, {
      restoreTestRead: () => {
        IDBObjectStore.prototype.get = original;
      },
    });
    IDBObjectStore.prototype.get = function (key) {
      if (key === "learner-state-v2" && ++reads >= 3) {
        sessionStorage.setItem("test-resume-read-failed", "yes");
        throw new DOMException("simulated read failure", "InvalidStateError");
      }
      return original.call(this, key);
    };
  });
  await page.reload();
  await expect(page.getByTestId("error-recovery-screen")).toContainText(
    "Não foi possível confirmar o progresso salvo",
  );
  await expect(page.getByRole("heading", { name: "Não foi possível continuar" })).toBeFocused();
  await expect(page.getByTestId("assistant-welcome")).toHaveCount(0);
  await page.evaluate(() =>
    (window as unknown as { restoreTestRead: () => void }).restoreTestRead(),
  );
  expect(await readLearnerState(page)).toEqual(before);
  await page.getByRole("button", { name: "Recarregar página" }).click();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  expect(await readLearnerState(page)).toEqual(before);
});
