// GET /api/curriculum — modules and lessons ordered, unlock logic reflects
// the learner's progress (no currentLessonIdx on module).

import { describe, it, beforeEach, expect } from "vitest";
import { GET } from "@/app/api/curriculum/route";
import { db } from "@/lib/db";
import { resetDatabase, seedBaseline } from "../helpers";

describe("GET /api/curriculum", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns modules ordered by `order`, lessons within each ordered by `order`", async () => {
    await seedBaseline();
    const res = await GET();
    const data = await res.json();

    const orders = data.modules.map((m: { order: number }) => m.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));

    for (const mod of data.modules) {
      const lessonOrders = mod.lessons.map((l: { order: number }) => l.order);
      expect(lessonOrders).toEqual([...lessonOrders].sort((a, b) => a - b));
    }
  });

  it("the first module is unlocked and its first lesson is unlocked", async () => {
    await seedBaseline();
    const data = await (await GET()).json();
    expect(data.modules[0].unlocked).toBe(true);
    expect(data.modules[0].lessons[0].unlocked).toBe(true);
  });

  it("the second lesson of the first module is locked until the first is completed", async () => {
    await seedBaseline();
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    const firstLesson = await db.lesson.findFirstOrThrow({
      where: { module: { order: 0 }, order: 0 },
    });
    const secondLesson = await db.lesson.findFirstOrThrow({
      where: { module: { order: 0 }, order: 1 },
    });

    // Before completion: locked
    let data = await (await GET()).json();
    const firstMod = data.modules[0];
    expect(firstMod.lessons[0].id).toBe(firstLesson.id);
    expect(firstMod.lessons[0].unlocked).toBe(true);
    expect(firstMod.lessons[1].id).toBe(secondLesson.id);
    expect(firstMod.lessons[1].unlocked).toBe(false);

    // After completion: unlocked
    await db.lessonProgress.create({
      data: {
        learnerId: learner.id,
        lessonId: firstLesson.id,
        completed: true,
        stars: 3,
        bestScore: 4,
        attempts: 1,
        completedAt: new Date(),
        lastPlayed: new Date(),
      },
    });

    data = await (await GET()).json();
    const mod = data.modules[0];
    expect(mod.lessons[1].unlocked).toBe(true);
    expect(mod.lessons[1].completed).toBe(false);
  });

  it("each lesson has `exercises` as a JSON string", async () => {
    await seedBaseline();
    const data = await (await GET()).json();
    const lesson = data.modules[0].lessons[0];
    expect(typeof lesson.exercises).toBe("string");
    const parsed = JSON.parse(lesson.exercises);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });

  it("module response does not contain `currentLessonIdx`", async () => {
    await seedBaseline();
    const data = await (await GET()).json();
    expect(
      (data.modules[0] as Record<string, unknown>).currentLessonIdx,
    ).toBeUndefined();
  });

  it("later modules are locked until the prior module's lessons are all completed", async () => {
    await seedBaseline();
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    // Complete only the first lesson of module 0
    const firstLesson = await db.lesson.findFirstOrThrow({
      where: { module: { order: 0 }, order: 0 },
    });
    await db.lessonProgress.create({
      data: {
        learnerId: learner.id,
        lessonId: firstLesson.id,
        completed: true,
        stars: 3,
        bestScore: 4,
        attempts: 1,
        completedAt: new Date(),
        lastPlayed: new Date(),
      },
    });

    const data = await (await GET()).json();
    expect(data.modules[1].unlocked).toBe(false);
  });
});