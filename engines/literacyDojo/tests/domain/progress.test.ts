import { describe, expect, it } from "vitest";
import { modules } from "../../src/data/generated/lessons";
import { lessons } from "../../src/data/generated/lessons";
import {
  XP_PER_LESSON_COMPLETE,
  applyAttemptToSkills,
  applyStreak,
  awardXp,
  createInitialProgress,
  evaluateLessonCompletion,
  isLessonUnlocked,
  reviewsDue,
  unlockNextReadyLesson,
} from "../../src/domain/progress";
import { readyLessonEntries } from "../../src/domain/track";

const DAY_MS = 86_400_000;
const NOW = new Date("2026-07-19T12:00:00.000Z");

const ready = readyLessonEntries(modules);
const [firstReady, secondReady, thirdReady] = ready;

describe("createInitialProgress", () => {
  it("primeira lição pronta nasce available; demais locked; planned não recebe status", () => {
    const progress = createInitialProgress(modules, "v1");
    expect(progress.lessonStatus[firstReady.id]).toBe("available");
    expect(progress.lessonStatus[secondReady.id]).toBe("locked");
    expect(progress.currentLessonId).toBe(firstReady.id);
    const plannedIds = modules
      .flatMap((module) => module.lessons)
      .filter((entry) => !entry.hasContent)
      .map((entry) => entry.id);
    expect(plannedIds.length).toBe(11);
    for (const id of plannedIds) {
      expect(progress.lessonStatus[id]).toBeUndefined();
    }
  });

  it("nunca contém o status 'mastered' em lugar nenhum", () => {
    const progress = createInitialProgress(modules, "v1");
    expect(JSON.stringify(progress)).not.toContain("mastered");
  });
});

describe("desbloqueio", () => {
  it("concluir a lição libera a próxima pronta; a última não tem próxima", () => {
    const progress = createInitialProgress(modules, "v1");
    const first = unlockNextReadyLesson(progress, modules, firstReady.id);
    expect(first.unlockedLessonId).toBe(secondReady.id);
    expect(first.progress.lessonStatus[secondReady.id]).toBe("available");

    const last = unlockNextReadyLesson(progress, modules, thirdReady.id);
    expect(last.unlockedLessonId).toBeUndefined();
  });

  it("isLessonUnlocked reflete available/in_progress/completed", () => {
    const progress = createInitialProgress(modules, "v1");
    expect(isLessonUnlocked(progress, firstReady.id)).toBe(true);
    expect(isLessonUnlocked(progress, secondReady.id)).toBe(false);
  });
});

describe("streak por data local", () => {
  it("mesmo dia não repete; dia seguinte incrementa; lacuna recomeça", () => {
    let progress = createInitialProgress(modules, "v1");
    progress = applyStreak(progress, NOW);
    expect(progress.streak.current).toBe(1);
    progress = applyStreak(progress, NOW);
    expect(progress.streak.current).toBe(1);
    progress = applyStreak(progress, new Date(NOW.getTime() + DAY_MS));
    expect(progress.streak.current).toBe(2);
    expect(progress.streak.longest).toBe(2);
    progress = applyStreak(progress, new Date(NOW.getTime() + 3 * DAY_MS));
    expect(progress.streak.current).toBe(1);
    expect(progress.streak.longest).toBe(2);
  });
});

describe("skills e revisão espaçada", () => {
  it("falha não agenda revisão; aprovações avançam o estágio com clamp", () => {
    const intervals = [1, 7, 21];
    let progress = createInitialProgress(modules, "v1");
    progress = applyAttemptToSkills(progress, ["avaliar"], 0.3, false, NOW, intervals);
    expect(progress.skills.avaliar.attempts).toBe(1);
    expect(progress.skills.avaliar.passes).toBe(0);
    expect(progress.skills.avaliar.nextReviewAt).toBeUndefined();

    progress = applyAttemptToSkills(progress, ["avaliar"], 1, true, NOW, intervals);
    expect(progress.skills.avaliar.passes).toBe(1);
    expect(progress.skills.avaliar.nextReviewAt).toBe(
      new Date(NOW.getTime() + DAY_MS).toISOString(),
    );

    progress = applyAttemptToSkills(progress, ["avaliar"], 1, true, NOW, intervals);
    expect(progress.skills.avaliar.nextReviewAt).toBe(
      new Date(NOW.getTime() + 7 * DAY_MS).toISOString(),
    );

    progress = applyAttemptToSkills(progress, ["avaliar"], 1, true, NOW, intervals);
    progress = applyAttemptToSkills(progress, ["avaliar"], 1, true, NOW, intervals);
    expect(progress.skills.avaliar.nextReviewAt).toBe(
      new Date(NOW.getTime() + 21 * DAY_MS).toISOString(),
    );
  });

  it("reviewsDue só retorna revisões vencidas", () => {
    let progress = createInitialProgress(modules, "v1");
    progress = applyAttemptToSkills(progress, ["avaliar"], 1, true, NOW, [1]);
    expect(reviewsDue(progress, NOW)).toHaveLength(0);
    expect(reviewsDue(progress, new Date(NOW.getTime() + 2 * DAY_MS))).toHaveLength(1);
  });
});

describe("conclusão de lição", () => {
  const lesson = lessons.find((item) => item.id === firstReady.id);
  if (!lesson) throw new Error("lição ausente");
  const [requiredActivity] = lesson.completion.requiredActivityIds;

  it("exige todas as atividades obrigatórias e a média mínima do conteúdo", () => {
    expect(evaluateLessonCompletion(lesson, {}).completed).toBe(false);
    expect(evaluateLessonCompletion(lesson, { [requiredActivity]: 0.5 }).completed).toBe(false);
    expect(evaluateLessonCompletion(lesson, { [requiredActivity]: 1 }).completed).toBe(true);
    expect(evaluateLessonCompletion(lesson, { [requiredActivity]: 1 }).lessonScore).toBe(1);
  });
});

describe("xp", () => {
  it("awardXp acumula", () => {
    const progress = awardXp(createInitialProgress(modules, "v1"), XP_PER_LESSON_COMPLETE);
    expect(progress.xp).toBe(XP_PER_LESSON_COMPLETE);
  });
});
