import { describe, expect, it } from "vitest";
import { lessons } from "../../src/data/generated/lessons";
import { MAP_INITIAL_LESSON_ID } from "../../src/domain/progress";
import { makeServices } from "../helpers";

// AID-3731 (L07-F2): asserções da guarda once-per-first-completion no nível de
// use case vivem em arquivo NOVO (política protect-tests — criação é o fluxo
// failing-test-first; o arquivo histórico `useCases.test.ts` permanece
// byte-idêntico à base).
const lesson = lessons.find((item) => item.id === MAP_INITIAL_LESSON_ID);
if (!lesson) throw new Error("Mapa Inicial ausente do read model");

/** Padrão pós-retrofit O3-C1: o Mapa Inicial (l02) tem 3 atividades obrigatórias. */
const ALL_BEST_SCORES = Object.fromEntries(
  lesson.completion.requiredActivityIds.map((id) => [id, 1]),
);

async function completeMvpOnboarding(services: ReturnType<typeof makeServices>["services"]) {
  await services.useCases.completeOnboarding({
    goal: "save_time",
    context: "work",
    confidence: "medium",
    taskCategory: "scheduling",
    audience: "ia_pratica",
  });
}

describe("completeLesson — guarda once-per-first-completion (AID-3731)", () => {
  it("replay de lição concluída: firstCompletion false, sem 2º +25 e status intacto (AID-3731)", async () => {
    const { services } = makeServices();
    await completeMvpOnboarding(services);
    await services.useCases.startLesson(lesson.id);
    const first = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: ALL_BEST_SCORES,
    });
    expect(first.outcome.completed).toBe(true);
    expect(first.firstCompletion).toBe(true);

    // Replay permitido (prática): re-concluir não re-premia nem re-conta.
    const replay = await services.useCases.completeLesson({
      lessonId: lesson.id,
      bestScores: ALL_BEST_SCORES,
    });
    expect(replay.outcome.completed).toBe(true);
    expect(replay.firstCompletion).toBe(false);
    expect(replay.progress.xp).toBe(first.progress.xp);
    expect(replay.progress.lessonStatus[lesson.id]).toBe("completed");
  });
});
