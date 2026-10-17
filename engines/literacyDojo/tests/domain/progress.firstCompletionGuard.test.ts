import { describe, expect, it } from "vitest";
import { lessons, modules } from "../../src/data/generated/lessons";
import {
  XP_PER_ACTIVITY_PASS,
  XP_PER_LESSON_COMPLETE,
  completeLesson,
  createInitialProgress,
  recordActivityAttempt,
} from "../../src/domain/progress";
import { readyLessonEntries } from "../../src/domain/track";
import { FIXED_NOW } from "../helpers";

// AID-3731 (L07-F2): asserções da guarda once-per-first-completion vivem em
// arquivo NOVO (política protect-tests — criação é o fluxo failing-test-first;
// o arquivo histórico `progress.test.ts` permanece byte-idêntico à base).
const NOW = FIXED_NOW;
const [firstReady] = readyLessonEntries(modules);

describe("conclusão — guarda once-per-first-completion (AID-3731)", () => {
  const guardLesson = lessons.find((lesson) => lesson.id === firstReady.id);
  if (!guardLesson) throw new Error("lição pronta ausente do read model");
  const bestScores = (lesson: (typeof lessons)[number]) =>
    Object.fromEntries(lesson.completion.requiredActivityIds.map((id) => [id, 1]));

  it("1ª conclusão (transição de status): firstCompletion true e +25; replay: false e sem novo +25", () => {
    const lesson = guardLesson;
    const initial = createInitialProgress(modules, "v1");
    expect(initial.lessonStatus[lesson.id]).toBe("available");

    const first = completeLesson(initial, lesson, bestScores(lesson), modules, NOW);
    expect(first.outcome.completed).toBe(true);
    expect(first.firstCompletion).toBe(true);
    expect(first.progress.xp).toBe(XP_PER_LESSON_COMPLETE);
    expect(first.progress.lessonStatus[lesson.id]).toBe("completed");

    // Replay permitido (prática): re-concluir NÃO é 1ª conclusão — o bônus
    // vive na transição de status, não na chamada.
    const replay = completeLesson(first.progress, lesson, bestScores(lesson), modules, NOW);
    expect(replay.outcome.completed).toBe(true);
    expect(replay.firstCompletion).toBe(false);
    expect(replay.progress.xp).toBe(XP_PER_LESSON_COMPLETE);
    expect(replay.progress.lessonStatus[lesson.id]).toBe("completed");

    // Determinismo: mesma entrada → mesma progressão (2 replays idênticos).
    const replay2 = completeLesson(replay.progress, lesson, bestScores(lesson), modules, NOW);
    expect(replay2.progress.xp).toBe(replay.progress.xp);
    expect(replay2.firstCompletion).toBe(false);
  });

  it("conclusão incompleta nunca marca firstCompletion nem concede XP", () => {
    const lesson = guardLesson;
    const partial = bestScores(lesson);
    delete partial[lesson.completion.requiredActivityIds[0]];
    const unfinished = completeLesson(
      createInitialProgress(modules, "v1"),
      lesson,
      partial,
      modules,
      NOW,
    );
    expect(unfinished.outcome.completed).toBe(false);
    expect(unfinished.firstCompletion).toBe(false);
    expect(unfinished.progress.xp).toBe(0);
    expect(unfinished.progress.lessonStatus[lesson.id]).toBe("available");
  });

  it("+10 por atividade acertada permanece no replay (prática sem bônus de conclusão)", () => {
    const lesson = guardLesson;
    const completed = completeLesson(
      createInitialProgress(modules, "v1"),
      lesson,
      bestScores(lesson),
      modules,
      NOW,
    );
    const practiced = recordActivityAttempt(completed.progress, {
      lessonId: lesson.id,
      evaluation: { pass: true, score: 1 },
      skillIds: lesson.skillIds,
      intervalsDays: lesson.review.intervalsDays,
      now: NOW,
    });
    expect(practiced.xp).toBe(XP_PER_LESSON_COMPLETE + XP_PER_ACTIVITY_PASS);
    const replay = completeLesson(practiced, lesson, bestScores(lesson), modules, NOW);
    expect(replay.firstCompletion).toBe(false);
    expect(replay.progress.xp).toBe(XP_PER_LESSON_COMPLETE + XP_PER_ACTIVITY_PASS);
  });
});
