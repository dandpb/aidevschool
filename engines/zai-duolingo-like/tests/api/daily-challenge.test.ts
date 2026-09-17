// GET /api/daily-challenge — deterministic per day; completing the assigned
// lesson marks the challenge completed and the lesson-complete response surfaces
// dailyChallengeAwarded/dailyChallengeGems.

import { describe, it, beforeEach, expect } from "vitest";
import { GET } from "@/app/api/daily-challenge/route";
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

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("GET /api/daily-challenge", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("first GET assigns a challenge; second GET returns the same lessonId", async () => {
    await seedBaseline();
    const first = await (await GET()).json();
    expect(first.challenge).toBeTruthy();
    expect(typeof first.challenge.lessonId).toBe("string");
    expect(first.challenge.dayKey).toBe(todayKey());
    expect(first.challenge.completed).toBe(false);
    expect(first.challenge.rewardGems).toBe(5);

    const second = await (await GET()).json();
    expect(second.challenge.lessonId).toBe(first.challenge.lessonId);
    expect(second.challenge.dayKey).toBe(first.challenge.dayKey);
  });

  it("completing the assigned lesson via /complete awards the daily challenge", async () => {
    await seedBaseline();
    const challenge = (await (await GET()).json()).challenge;

    // Pre-flight learner gems for the +5 delta.
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    const gemsBefore = learner.gems;

    // The challenge's lesson might not be the first lesson — find it (with
    // exercises) and complete it correctly.
    const target = await db.lesson.findUniqueOrThrow({
      where: { id: challenge.lessonId },
    });
    const exercises = JSON.parse(target.exercises);

    const res = await completeLesson(
      postJson({ answers: correctAnswers(exercises) }),
      routeParams(target.id),
    );
    const data = await res.json();

    // If the challenge lesson is not yet unlocked, completeDay returns
    // awarded:false. Walk previous lessons in its module first to make sure
    // it's unlocked, then re-attempt.
    if (!data.dailyChallengeAwarded) {
      // Unlock the target lesson by completing prior lessons in its module
      // and any prior modules' lessons.
      const all = await db.lesson.findMany({ orderBy: [{ moduleId: "asc" }, { order: "asc" }] });
      const idx = all.findIndex((l) => l.id === target.id);
      for (let i = 0; i < idx; i++) {
        const ex = JSON.parse(all[i].exercises);
        await completeLesson(
          postJson({ answers: correctAnswers(ex) }),
          routeParams(all[i].id),
        );
      }
      const res2 = await completeLesson(
        postJson({ answers: correctAnswers(exercises) }),
        routeParams(target.id),
      );
      const data2 = await res2.json();
      expect(data2.dailyChallengeAwarded).toBe(true);
      expect(data2.dailyChallengeGems).toBe(5);

      const learner2 = await db.learner.findFirstOrThrow({
        where: { NOT: { id: { startsWith: "rival-" } } },
      });
      expect(learner2.gems).toBeGreaterThanOrEqual(gemsBefore + 5);

      const dcAfter = await (await GET()).json();
      expect(dcAfter.challenge.completed).toBe(true);
      return;
    }

    // Happy path: target was already unlocked.
    expect(data.dailyChallengeAwarded).toBe(true);
    expect(data.dailyChallengeGems).toBe(5);

    const learnerAfter = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    expect(learnerAfter.gems).toBeGreaterThanOrEqual(gemsBefore + 5);

    const after = await (await GET()).json();
    expect(after.challenge.completed).toBe(true);
  });
});