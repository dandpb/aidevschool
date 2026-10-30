import { expect, it } from "vitest";
import { lessons, modules } from "../../src/data/generated/lessons";
import { completeLesson, createInitialProgress, startLesson } from "../../src/domain/progress";
import { emptyXpLedger } from "../../src/domain/xpLedger";

it("abrir e concluir replay preserva cursor já em andamento", () => {
  const lesson = lessons.find((item) => item.id === "l02");
  if (!lesson) throw new Error("lição ausente");
  const progress = createInitialProgress(modules, "test");
  progress.onboarding = { completed: true, route: "intermediate" };
  progress.lessonStatus.l02 = "completed";
  progress.lessonStatus.l03 = "completed";
  progress.lessonStatus.l04 = "in_progress";
  progress.currentLessonId = "l04";
  const opened = startLesson(progress, "l02");
  expect(opened.currentLessonId).toBe("l04");
  const scores = Object.fromEntries(lesson.completion.requiredActivityIds.map((id) => [id, 1]));
  const result = completeLesson(
    opened,
    emptyXpLedger(),
    lesson,
    scores,
    modules,
    new Date("2026-07-19T12:00:00Z"),
  );
  expect(result.progress.currentLessonId).toBe("l04");
  expect(result.progress.lessonStatus.l04).toBe("in_progress");
  expect(result.firstCompletion).toBe(false);
  expect(result.nextLessonId).toBe("l03");
});

it("conclusão inédita preserva avanço mesmo com marcador XP legado", async () => {
  const { lessonLedgerKey, markFirstCompletionAwarded } = await import("../../src/domain/xpLedger");
  const lesson = lessons.find((item) => item.id === "l02");
  if (!lesson) throw new Error("lição ausente");
  const progress = createInitialProgress(modules, "test");
  progress.onboarding = {
    completed: true,
    route: "intermediate",
    mapInitial: { attempts: 1, firstAttemptPassed: true, hintRequested: false, retried: false },
  };
  progress.lessonStatus.l02 = "in_progress";
  progress.lessonStatus.l03 = "locked";
  progress.currentLessonId = "l02";
  const scores = Object.fromEntries(lesson.completion.requiredActivityIds.map((id) => [id, 1]));
  const ledger = markFirstCompletionAwarded(emptyXpLedger(), lessonLedgerKey("l02"), "2026-07-18");
  const result = completeLesson(
    progress,
    ledger,
    lesson,
    scores,
    modules,
    new Date("2026-07-19T12:00:00Z"),
  );
  expect(result.firstCompletion).toBe(false);
  expect(result.progress.currentLessonId).toBe("l03");
  expect(result.progress.lessonStatus.l03).toBe("available");
});
