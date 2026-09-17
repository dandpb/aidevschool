// GET /api/achievements — fresh baseline then after a correct lesson complete.
// "primeiro-passo" unlocks on first completed lesson.
// "compilador-iniciante" requires onboarding (name != "Recruta" or xp > 0) —
// on a fresh baseline the learner is still "Recruta" with xp 0 so it stays locked.

import { describe, it, beforeEach, expect } from "vitest";
import { GET } from "@/app/api/achievements/route";
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

describe("GET /api/achievements", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("fresh baseline: achievements array with unlocked flags, total === achievements.length", async () => {
    await seedBaseline();
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data.achievements)).toBe(true);
    expect(data.achievements.length).toBeGreaterThan(0);
    expect(data.total).toBe(data.achievements.length);
    expect(data.totalUnlocked).toBe(0);
    // read-only seam: no sync-on-GET, no newlyUnlocked channel
    expect((data as Record<string, unknown>).newlyUnlocked).toBeUndefined();

    // None should be unlocked yet on a fresh baseline (Recruta, xp 0, no lessons).
    for (const a of data.achievements) {
      expect(a.unlocked).toBe(false);
      expect(a.unlockedAt).toBeNull();
    }
  });

  it("after completing one lesson correctly: 'primeiro-passo' is unlocked with unlockedAt", async () => {
    await seedBaseline();
    const { lesson, exercises } = await firstLesson();

    const completeRes = await completeLesson(
      postJson({ answers: correctAnswers(exercises) }),
      routeParams(lesson.id),
    );
    expect(completeRes.status).toBe(200);

    const data = await (await GET()).json();
    const primeiroPasso = data.achievements.find(
      (a: { slug: string }) => a.slug === "primeiro-passo",
    );
    expect(primeiroPasso).toBeDefined();
    expect(primeiroPasso.unlocked).toBe(true);
    expect(typeof primeiroPasso.unlockedAt).toBe("string");

    // Also assert the db row exists.
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    const row = await db.achievement.findUnique({
      where: { learnerId_slug: { learnerId: learner.id, slug: "primeiro-passo" } },
    });
    expect(row).not.toBeNull();
  });
});
