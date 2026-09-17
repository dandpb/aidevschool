// POST /api/lesson/[id]/practice — only after the lesson is marked completed.
// Gems only, no XP, no hearts lost.

import { describe, it, beforeEach, expect } from "vitest";
import { POST as completeLesson } from "@/app/api/lesson/[id]/complete/route";
import { POST as practiceLesson } from "@/app/api/lesson/[id]/practice/route";
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

describe("POST /api/lesson/[id]/practice", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns 400 not-completed before the lesson is completed", async () => {
    await seedBaseline();
    const { lesson, exercises } = await firstLesson();

    const res = await practiceLesson(
      postJson({ answers: correctAnswers(exercises) }),
      routeParams(lesson.id),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("not-completed");
  });

  it("all-correct after completion: gemsGained:3, no hearts lost, no XP change", async () => {
    await seedBaseline();
    const { lesson, exercises } = await firstLesson();
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });

    // Complete the lesson first (with correct answers) so practice is allowed.
    const completeRes = await completeLesson(
      postJson({ answers: correctAnswers(exercises) }),
      routeParams(lesson.id),
    );
    const completeData = await completeRes.json();
    expect(completeData.passed).toBe(true);

    const afterComplete = await db.learner.findUniqueOrThrow({ where: { id: learner.id } });
    const xpAfterComplete = afterComplete.xp;
    const gemsAfterComplete = afterComplete.gems;
    const heartsAfterComplete = afterComplete.hearts;
    const progressAfterComplete = await db.lessonProgress.findUniqueOrThrow({
      where: { learnerId_lessonId: { learnerId: learner.id, lessonId: lesson.id } },
    });
    const attemptsAfterComplete = progressAfterComplete.attempts;

    // Now practice with all-correct
    const res = await practiceLesson(
      postJson({ answers: correctAnswers(exercises) }),
      routeParams(lesson.id),
    );
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.passed).toBe(true);
    expect(data.gemsGained).toBe(3);
    // trimmed contract — no `heartsLost`, no `results`
    expect((data as Record<string, unknown>).heartsLost).toBeUndefined();
    expect((data as Record<string, unknown>).results).toBeUndefined();
    expect(Array.isArray(data.newAchievements)).toBe(true);

    const after = await db.learner.findUniqueOrThrow({ where: { id: learner.id } });
    expect(after.xp).toBe(xpAfterComplete); // XP unchanged
    expect(after.gems).toBe(gemsAfterComplete + 3);
    expect(after.hearts).toBe(heartsAfterComplete);

    const progress = await db.lessonProgress.findUniqueOrThrow({
      where: { learnerId_lessonId: { learnerId: learner.id, lessonId: lesson.id } },
    });
    expect(progress.attempts).toBe(attemptsAfterComplete + 1);
  });

  it("returns full achievement payloads when practice triggers an unlock", async () => {
    await seedBaseline();
    const { lesson, exercises } = await firstLesson();

    // complete the lesson first (unlocks first-lesson achievements)
    await completeLesson(
      postJson({ answers: correctAnswers(exercises) }),
      routeParams(lesson.id),
    );

    // simulate playground usage that no sync has seen yet
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    await db.chatThread.create({
      data: { learnerId: learner.id, messages: "[]" },
    });

    const res = await practiceLesson(
      postJson({ answers: correctAnswers(exercises) }),
      routeParams(lesson.id),
    );
    expect(res.status).toBe(200);
    const data = await res.json();

    // explorador-playground unlocks during practice — as a full toast payload
    const unlocked = data.newAchievements.find(
      (a: { slug: string }) => a.slug === "explorador-playground",
    );
    expect(unlocked).toMatchObject({
      slug: "explorador-playground",
      title: expect.any(String),
      emoji: expect.any(String),
      gemReward: expect.any(Number),
      xpReward: expect.any(Number),
    });
  });

  it("all-wrong after completion: gemsGained:0", async () => {
    await seedBaseline();
    const { lesson, exercises } = await firstLesson();

    // Complete with correct, then practice with wrong.
    await completeLesson(
      postJson({ answers: correctAnswers(exercises) }),
      routeParams(lesson.id),
    );

    const res = await practiceLesson(
      postJson({ answers: wrongAnswers(exercises) }),
      routeParams(lesson.id),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.gemsGained).toBe(0);
    expect(data.passed).toBe(false);
  });
});