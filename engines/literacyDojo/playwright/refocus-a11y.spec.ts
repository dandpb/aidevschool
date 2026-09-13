import { type Page, expect, test } from "@playwright/test";
import { type ActivityDefinition, lessons } from "../src/data/generated/lessons";
import { CHECKPOINT_SELECTION, type CheckpointDefinition } from "../src/domain/checkpoints";
import { answerCheckpointActivityRight, seedCorridorProgress } from "./support";

/**
 * AID-1755/T3 (padrão AID-1150) — anúncio/refocus estendido ao Desafio de
 * Módulo e ao Progresso, evidência executável no browser:
 *
 * - Checkpoint (fase playing): em cada transição de atividade o foco cai no
 *   h1 da nova instrução (id activity-heading, tabIndex=-1) e o contador
 *   "Atividade N de M" vive num role="status" sr-only (aria-live polite) —
 *   o conteúdo que o leitor de tela anuncia na transição.
 * - Progresso: ao entrar na tela (troca de rota SPA), o foco cai no h1
 *   "Seu progresso" (id progress-title, tabIndex=-1).
 *
 * ErrorRecovery fica coberto no nível unitário (tests/app/
 * screenRefocusAnnounce.test.tsx): o caminho de boot quebrado não é
 * reproduzível no browser de teste sem corromper o storage do harness.
 *
 * Mutation-guard: remover o refocus (efeito [phase, current] do
 * CheckpointScreen, refocus de montagem do ProgressScreen) ou o
 * role="status" do contador quebra os asserts de activeElement/status abaixo.
 */

function checkpointActivities(checkpointId: string): ActivityDefinition[] {
  const checkpoint: CheckpointDefinition | undefined = CHECKPOINT_SELECTION.find(
    (entry) => entry.id === checkpointId,
  );
  if (!checkpoint) throw new Error(`checkpoint ausente: ${checkpointId}`);
  return checkpoint.activityRefs.flatMap((ref) => {
    const lesson = lessons.find((entry) => entry.id === ref.lessonId);
    const activity = lesson?.activities.find((item) => item.id === ref.activityId);
    return activity ? [activity] : [];
  });
}

async function expectFocusedHeading(page: Page, headingId: string) {
  expect(await page.evaluate(() => document.activeElement?.id)).toBe(headingId);
  const h1 = page.locator(`#${headingId}`);
  expect(await h1.getAttribute("tabindex")).toBe("-1");
  // o outline de foco do h1 é visível (.app-stage h1:focus, AID-1089/W2)
  // para usuários de teclado.
  expect(
    await h1.evaluate((el) => {
      if (!(el instanceof HTMLElement)) return "";
      return getComputedStyle(el).outlineStyle;
    }),
  ).toBe("solid");
}

/** Semeia o estado e recarrega esperando a home (mesmo harness do corridor.spec.ts). */
async function seedAndReloadHome(page: Page, options: Parameters<typeof seedCorridorProgress>[1]) {
  await page.goto("/");
  await expect(page.locator(".product-bar")).toBeVisible();
  await seedCorridorProgress(page, options);
  await page.reload();
  await expect(page.getByTestId("home-screen")).toBeVisible();
}

test.describe("AID-1755/T3: refocus/anúncio em Checkpoint e Progresso", () => {
  test("Desafio: transição de atividade foca o h1 e anuncia 'Atividade N de M' em role=status", async ({
    page,
  }) => {
    const activities = checkpointActivities("cp-01");
    await seedAndReloadHome(page, { completedLessonIds: ["l01", "l02", "l03"], route: "guided" });

    await page.getByTestId("continue-button").click();
    await expect(page.getByTestId("checkpoint-intro")).toBeVisible();
    await page.getByTestId("start-checkpoint").click();
    await expect(page.getByTestId("checkpoint-player")).toBeVisible();

    // Atividade 1: foco no h1 da instrução + contador em live region.
    await expectFocusedHeading(page, "activity-heading");
    await expect(page.getByRole("status")).toHaveText("Atividade 1 de 3");

    // Acerta a 1ª (sort) e avança para a 2ª (output_comparison).
    await answerCheckpointActivityRight(page, activities[0]);
    await page.getByTestId("submit-attempt").click();
    await expect(page.getByTestId("feedback-panel")).toHaveClass(/feedback-pass/);
    await page.getByTestId("next-activity").click();

    await expectFocusedHeading(page, "activity-heading");
    await expect(page.getByRole("status")).toHaveText("Atividade 2 de 3");
  });

  test("Progresso: foco no h1 da tela ao entrar pela home", async ({ page }) => {
    await seedAndReloadHome(page, { completedLessonIds: ["l01"], route: "guided" });

    await page.getByTestId("open-progress").click();
    await expect(page.getByTestId("progress-screen")).toBeVisible();
    await expectFocusedHeading(page, "progress-title");
  });
});
