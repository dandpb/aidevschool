// POST /api/lesson/[id]/complete — the core flow:
//  - all-correct: passed:true, stars:3, gemsGained:2, streakTouched, newStreak:1
//  - all-wrong: passed:false, heartsLost:1, stars:0, streakTouched:false
//  - 0 hearts: 400 "no-hearts"
//  - unknown lesson id: 404
// Side effects on db: lessonProgress, learner, activityLog.

import { describe, it, beforeEach, expect } from "vitest";
import { POST } from "@/app/api/lesson/[id]/complete/route";
import { db } from "@/lib/db";
import {
  resetDatabase,
  seedBaseline,
  firstLesson,
  correctAnswers,
  wrongAnswers,
  postJson,
  routeParams,
} from "../helpers";

describe("POST /api/lesson/[id]/complete", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("all-correct answers: passed:true, stars:3, gemsGained:2, streakTouched:true, newStreak:1", async () => {
    await seedBaseline();
    const { lesson, exercises } = await firstLesson();
    const answers = correctAnswers(exercises);

    const res = await POST(postJson({ answers }), routeParams(lesson.id));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.passed).toBe(true);
    expect(data.correctCount).toBe(exercises.length);
    expect(data.total).toBe(exercises.length);
    expect(data.stars).toBe(3);
    expect(data.xpGained).toBeGreaterThan(0);
    expect(data.gemsGained).toBe(2);
    expect(data.streakTouched).toBe(true);
    expect(data.streakBroke).toBe(false);
    expect(data.newStreak).toBe(1);
    // trimmed contract — no `results` and no `hearts`
    expect((data as Record<string, unknown>).results).toBeUndefined();
    expect((data as Record<string, unknown>).hearts).toBeUndefined();
  });

  it("all-correct creates lessonProgress row, bumps learner xp, logs activity", async () => {
    await seedBaseline();
    const { lesson, exercises } = await firstLesson();
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    const xpBefore = learner.xp;

    await POST(postJson({ answers: correctAnswers(exercises) }), routeParams(lesson.id));

    const progress = await db.lessonProgress.findUnique({
      where: { learnerId_lessonId: { learnerId: learner.id, lessonId: lesson.id } },
    });
    expect(progress).not.toBeNull();
    expect(progress?.completed).toBe(true);
    expect(progress?.stars).toBe(3);
    expect(progress?.completedAt).not.toBeNull();
    expect(progress?.attempts).toBe(1);

    const updated = await db.learner.findUniqueOrThrow({ where: { id: learner.id } });
    expect(updated.xp).toBeGreaterThan(xpBefore);
    // baseline 20 + lesson gemsGained 2 + (possibly) the "primeiro-passo"
    // achievement reward (5 gems). Allow any total >= 22.
    expect(updated.gems).toBeGreaterThanOrEqual(20 + 2);

    const logs = await db.activityLog.findMany({
      where: { learnerId: learner.id, type: "lesson_complete" },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
  });

  it("all-wrong answers: passed:false, heartsLost:1, stars:0, streakTouched:false", async () => {
    await seedBaseline();
    const { lesson, exercises } = await firstLesson();
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    const heartsBefore = learner.hearts;

    const res = await POST(postJson({ answers: wrongAnswers(exercises) }), routeParams(lesson.id));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.passed).toBe(false);
    expect(data.stars).toBe(0);
    expect(data.heartsLost).toBe(1);
    expect(data.streakTouched).toBe(false);
    expect(data.gemsGained).toBe(0);

    const updated = await db.learner.findUniqueOrThrow({ where: { id: learner.id } });
    expect(updated.hearts).toBe(heartsBefore - 1);

    const progress = await db.lessonProgress.findUnique({
      where: { learnerId_lessonId: { learnerId: learner.id, lessonId: lesson.id } },
    });
    expect(progress?.completed).toBe(false);
  });

  it("0 hearts returns 400 no-hearts", async () => {
    await seedBaseline();
    const { lesson, exercises } = await firstLesson();
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    // Set hearts to 0 with a fresh regen baseline so regen doesn't refill
    await db.learner.update({
      where: { id: learner.id },
      data: { hearts: 0, heartsUpdatedAt: new Date() },
    });

    const res = await POST(postJson({ answers: correctAnswers(exercises) }), routeParams(lesson.id));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("no-hearts");
  });

  it("unknown lesson id returns 404", async () => {
    await seedBaseline();
    const res = await POST(postJson({ answers: [] }), routeParams("does-not-exist"));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("not-found");
  });
});