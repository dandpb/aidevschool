// GET /api/stats — aggregate dashboard numbers after one correct lesson.

import { describe, it, beforeEach, expect } from "vitest";
import { GET } from "@/app/api/stats/route";
import { POST as completeLesson } from "@/app/api/lesson/[id]/complete/route";
import { db } from "@/lib/db";
import {
  resetDatabase,
  seedBaseline,
  firstLesson,
  correctAnswers,
  postJson,
  routeParams,
} from "../helpers";

describe("GET /api/stats", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("after completing one lesson correctly: completedLessons:1, totalXp>0, currentStreak:1, achievementsUnlocked>=1, gems matches learner", async () => {
    await seedBaseline();
    const { lesson, exercises } = await firstLesson();

    const completeRes = await completeLesson(
      postJson({ answers: correctAnswers(exercises) }),
      routeParams(lesson.id),
    );
    expect(completeRes.status).toBe(200);

    const data = await (await GET()).json();
    expect(data.completedLessons).toBe(1);
    expect(data.totalXp).toBeGreaterThan(0);
    expect(data.currentStreak).toBe(1);
    expect(data.achievementsUnlocked).toBeGreaterThanOrEqual(1);

    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    expect(data.gems).toBe(learner.gems);

    // shape sanity
    expect(typeof data.totalLessons).toBe("number");
    expect(typeof data.avgAccuracy).toBe("number");
    expect(typeof data.totalStars).toBe("number");
    expect(typeof data.maxStars).toBe("number");
    expect(typeof data.bestStreak).toBe("number");
    expect(typeof data.practiceCount).toBe("number");
    expect(typeof data.playgroundCount).toBe("number");
    expect(typeof data.league).toBe("string");
  });
});