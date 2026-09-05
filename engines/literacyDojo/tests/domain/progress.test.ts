import { describe, expect, it } from "vitest";
import { modules } from "../../src/data/generated/lessons";
import { lessons } from "../../src/data/generated/lessons";
import {
  MAP_INITIAL_LESSON_ID,
  XP_PER_LESSON_COMPLETE,
  applyAttemptToSkills,
  applyStreak,
  awardXp,
  createInitialProgress,
  evaluateLessonCompletion,
  isLessonUnlocked,
  localDateKey,
  reviewsDue,
  unlockNextReadyLesson,
} from "../../src/domain/progress";
import { readyLessonEntries } from "../../src/domain/track";
import { FIXED_NOW } from "../helpers";

const DAY_MS = 86_400_000;
const NOW = FIXED_NOW;

const ready = readyLessonEntries(modules);
const [firstReady, secondReady] = ready;
const lastReady = ready[ready.length - 1];

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

    const last = unlockNextReadyLesson(progress, modules, lastReady.id);
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
  const required = lesson.completion.requiredActivityIds;
  const allPassed = Object.fromEntries(required.map((id) => [id, 1]));

  it("exige todas as atividades obrigatórias e a média mínima do conteúdo", () => {
    expect(evaluateLessonCompletion(lesson, {}).completed).toBe(false);
    expect(evaluateLessonCompletion(lesson, { [required[0]]: 0.5 }).completed).toBe(false);
    expect(evaluateLessonCompletion(lesson, allPassed).completed).toBe(true);
    expect(evaluateLessonCompletion(lesson, allPassed).lessonScore).toBe(1);
  });
});

describe("conclusão de lição — retrofit O3-C1 (spec AID-644 rev 2 §4.3/A3)", () => {
  const retrofitted = ["l01", "l02", "l03", "l04", "l05", "l06", "l07"]
    .map((id) => lessons.find((lesson) => lesson.id === id))
    .filter((lesson): lesson is NonNullable<typeof lesson> => lesson !== undefined);

  it("A4: as 7 lições retrofitadas têm 3 atividades e requiredActivityIds = conjunto completo", () => {
    expect(retrofitted).toHaveLength(7);
    for (const lesson of retrofitted) {
      expect(lesson.activities, `${lesson.id} atividades`).toHaveLength(3);
      expect(
        [...lesson.completion.requiredActivityIds].sort(),
        `${lesson.id} requiredActivityIds`,
      ).toEqual(lesson.activities.map((activity) => activity.id).sort());
      expect(lesson.completion.minimumScore).toBe(0.75);
    }
  });

  it("A3: predicado version-blind — só a1 concluída NÃO completa (faltam as novas)", () => {
    const l01 = lessons.find((lesson) => lesson.id === "l01");
    if (!l01) throw new Error("l01 ausente do read model");
    const outcome = evaluateLessonCompletion(l01, { "l01-a1": 1 });
    expect(outcome.completed).toBe(false);
    expect(outcome.missingActivityIds).toEqual(["l01-a2", "l01-a3"]);
    expect(evaluateLessonCompletion(l01, { "l01-a1": 1, "l01-a2": 1, "l01-a3": 1 }).completed).toBe(
      true,
    );
  });

  it("A3: 3× média >= 0.75 completa; abaixo disso não completa", () => {
    const l04 = lessons.find((lesson) => lesson.id === "l04");
    if (!l04) throw new Error("l04 ausente do read model");
    const required = l04.completion.requiredActivityIds;
    const atCutoff = Object.fromEntries(required.map((id) => [id, 0.75]));
    expect(evaluateLessonCompletion(l04, atCutoff).completed).toBe(true);
    expect(evaluateLessonCompletion(l04, atCutoff).lessonScore).toBe(0.75);
    const below = Object.fromEntries(required.map((id) => [id, 0.7]));
    expect(evaluateLessonCompletion(l04, below).completed).toBe(false);
  });

  it("A6: o Mapa Inicial continua em l02 (pinagem explícita da lição de entrada)", () => {
    expect(MAP_INITIAL_LESSON_ID).toBe("l02");
    const l02 = lessons.find((lesson) => lesson.id === MAP_INITIAL_LESSON_ID);
    if (!l02) throw new Error("l02 ausente do read model");
    expect(l02.skillIds.length).toBeGreaterThan(0);
  });
});

describe("conclusão de lição — retrofit C1 (spec AID-807 §1.4.3/A1–A4, ordem AID-806/B)", () => {
  const retrofitted = ["l15", "l16", "l17"]
    .map((id) => lessons.find((lesson) => lesson.id === id))
    .filter((lesson): lesson is NonNullable<typeof lesson> => lesson !== undefined);

  it("A4: as 3 lições retrofitadas têm 3 atividades e requiredActivityIds = conjunto completo", () => {
    expect(retrofitted).toHaveLength(3);
    for (const lesson of retrofitted) {
      expect(lesson.version, `${lesson.id} version`).toBe(2);
      expect(lesson.activities, `${lesson.id} atividades`).toHaveLength(3);
      expect(
        [...lesson.completion.requiredActivityIds].sort(),
        `${lesson.id} requiredActivityIds`,
      ).toEqual(lesson.activities.map((activity) => activity.id).sort());
      expect(lesson.completion.minimumScore).toBe(0.75);
    }
  });

  it("A3: predicado version-blind — só a1+a2 concluídas NÃO completa (falta a nova)", () => {
    const l15 = lessons.find((lesson) => lesson.id === "l15");
    if (!l15) throw new Error("l15 ausente do read model");
    const outcome = evaluateLessonCompletion(l15, { "l15-a1": 1, "l15-a2": 1 });
    expect(outcome.completed).toBe(false);
    expect(outcome.missingActivityIds).toEqual(["l15-a3"]);
    expect(evaluateLessonCompletion(l15, { "l15-a1": 1, "l15-a2": 1, "l15-a3": 1 }).completed).toBe(
      true,
    );
  });

  it("A3: 3× média >= 0.75 completa; abaixo disso não completa", () => {
    const l17 = lessons.find((lesson) => lesson.id === "l17");
    if (!l17) throw new Error("l17 ausente do read model");
    const required = l17.completion.requiredActivityIds;
    const atCutoff = Object.fromEntries(required.map((id) => [id, 0.75]));
    expect(evaluateLessonCompletion(l17, atCutoff).completed).toBe(true);
    expect(evaluateLessonCompletion(l17, atCutoff).lessonScore).toBe(0.75);
    const below = Object.fromEntries(required.map((id) => [id, 0.7]));
    expect(evaluateLessonCompletion(l17, below).completed).toBe(false);
  });
});

describe("xp", () => {
  it("awardXp acumula e registra o XP do dia (meta diária)", () => {
    const progress = awardXp(createInitialProgress(modules, "v1"), XP_PER_LESSON_COMPLETE, NOW);
    expect(progress.xp).toBe(XP_PER_LESSON_COMPLETE);
    expect(progress.dailyGoal).toEqual({
      date: localDateKey(NOW),
      xpEarned: XP_PER_LESSON_COMPLETE,
    });
  });
});
