import { type Page, expect, test } from "@playwright/test";
import { lessons } from "../src/data/generated/lessons";
import { CHECKPOINT_SELECTION } from "../src/domain/checkpoints";
import {
  answerCheckpointActivityRight,
  answerCheckpointActivityWrong,
  readProgress,
  seedCorridorProgress,
} from "./support";

async function openCheckpoint(page: Page) {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, { completedLessonIds: ["l01", "l02", "l03"], route: "guided" });
  await page.reload();
  await page.getByTestId("continue-button").click();
}
async function failNextWrite(page: Page) {
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = () => {
      IDBObjectStore.prototype.put = original;
      throw new DOMException("simulated", "QuotaExceededError");
    };
  });
}
function activities() {
  const checkpoint = CHECKPOINT_SELECTION.find((entry) => entry.id === "cp-01");
  if (!checkpoint) throw new Error("desafio ausente");
  return checkpoint.activityRefs.map((ref) => {
    const activity = lessons
      .find((lesson) => lesson.id === ref.lessonId)
      ?.activities.find((item) => item.id === ref.activityId);
    if (!activity) throw new Error("atividade ausente");
    return activity;
  });
}

test("falhas ao iniciar e verificar o desafio são explicadas e permitem recuperação", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openCheckpoint(page);
  await failNextWrite(page);
  await page.getByTestId("start-checkpoint").click();
  await expect(page.getByRole("alert")).toContainText(/não foi possível confirmar/i);
  await expect(page.getByTestId("checkpoint-intro")).toBeVisible();
  await page.getByTestId("start-checkpoint").click();
  await expect(page.getByTestId("checkpoint-player")).toBeVisible();
  await answerCheckpointActivityWrong(page, activities()[0]);
  await failNextWrite(page);
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByRole("alert")).toContainText("pode já ter sido registrada");
  await expect(page.getByTestId("submit-attempt")).toBeEnabled();
  await page.getByTestId("submit-attempt").click();
  await expect(page.getByTestId("feedback-panel")).toBeVisible();
  expect(errors).toEqual([]);
});

test("falha ao concluir mantém feedback para tentativa deliberada", async ({ page }) => {
  await openCheckpoint(page);
  await page.getByTestId("start-checkpoint").click();
  const list = activities();
  for (const [index, activity] of list.entries()) {
    if (index) await page.getByTestId("next-activity").click();
    await answerCheckpointActivityRight(page, activity);
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  }
  await failNextWrite(page);
  await page.getByTestId("finish-checkpoint").click();
  await expect(page.getByRole("alert")).toContainText("pode já ter sido registrada");
  await expect(page.getByTestId("feedback-panel")).toBeVisible();
  await page.getByTestId("finish-checkpoint").click();
  await expect(page.getByTestId("checkpoint-result")).toContainText("Desafio concluído");
});

test("falha após gravação explica que repetir pode contar outra tentativa", async ({ page }) => {
  await openCheckpoint(page);
  await page.getByTestId("start-checkpoint").click();
  await answerCheckpointActivityWrong(page, activities()[0]);
  const before = (await readProgress(page))?.counters.attempts ?? 0;
  await page.evaluate(() => {
    const original = console.info;
    console.info = (...args: unknown[]) => {
      if (args[0] === "[literacy-evidence]") {
        console.info = original;
        throw new Error("simulated post-save failure");
      }
      original(...args);
    };
  });
  const submit = page.getByTestId("submit-attempt");
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toContainText("pode já ter sido registrada");
  expect((await readProgress(page))?.counters.attempts).toBe(before + 1);
  await expect(submit).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("feedback-panel")).toBeVisible();
  expect((await readProgress(page))?.counters.attempts).toBe(before + 2);
});

test("falha notificada após conclusão gravada preserva aviso e permite conferir após reload", async ({
  page,
}) => {
  await openCheckpoint(page);
  await page.getByTestId("start-checkpoint").click();
  for (const [index, activity] of activities().entries()) {
    if (index) await page.getByTestId("next-activity").click();
    await answerCheckpointActivityRight(page, activity);
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
  }
  await page.evaluate(() => {
    const original = IDBTransaction.prototype.addEventListener;
    IDBTransaction.prototype.addEventListener = function (type, listener, options) {
      if (this.mode === "readwrite" && type === "complete") {
        IDBTransaction.prototype.addEventListener = original;
        return original.call(this, type, () => this.dispatchEvent(new Event("error")), options);
      }
      return original.call(this, type, listener, options);
    };
  });
  const finish = page.getByTestId("finish-checkpoint");
  await finish.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toContainText("pode já ter sido registrada");
  await expect(finish).toBeFocused();
  const progress = await readProgress(page);
  expect(progress?.moduleCheckpoints?.["mod-01"]?.status).toBe("completed");
  expect(progress?.lessonStatus?.l04).toBe("available");
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
});
