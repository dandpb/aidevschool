// Clock-consistency invariant of the lesson-attempt pipeline: the module
// header says "the clock lives at the seam: one timestamp drives the whole
// pipeline" — every timestamp written during an attempt must equal opts.now.

import { describe, it, beforeEach, expect } from "vitest";
import { submitLessonAttempt } from "@/lib/lesson-completion";
import { db } from "@/lib/db";
import {
  resetDatabase,
  seedBaseline,
  firstLesson,
  correctAnswers,
} from "../helpers";

describe("submitLessonAttempt clock invariant", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("complete mode: streak.lastTouch and progress timestamps equal opts.now", async () => {
    const learner = await seedBaseline();
    const { lesson, exercises } = await firstLesson();
    const T = Date.now() - 7 * 60 * 1000; // fixed, distinctly in the past

    const result = await submitLessonAttempt(
      lesson.id,
      correctAnswers(exercises),
      "complete",
      { now: T }
    );
    expect(result.ok).toBe(true);

    const progress = await db.lessonProgress.findUniqueOrThrow({
      where: {
        learnerId_lessonId: { learnerId: learner.id, lessonId: lesson.id },
      },
    });
    expect(progress.lastPlayed?.getTime()).toBe(T);
    expect(progress.completedAt?.getTime()).toBe(T);

    const streak = await db.streak.findUniqueOrThrow({
      where: { learnerId: learner.id },
    });
    expect(streak.lastTouch?.getTime()).toBe(T);
  });

  it("practice mode: progress.lastPlayed equals opts.now", async () => {
    const learner = await seedBaseline();
    const { lesson, exercises } = await firstLesson();
    const answers = correctAnswers(exercises);
    const T1 = Date.now() - 60 * 60 * 1000;
    const T2 = Date.now() - 30 * 60 * 1000;

    const first = await submitLessonAttempt(lesson.id, answers, "complete", {
      now: T1,
    });
    expect(first.ok).toBe(true);

    const practice = await submitLessonAttempt(lesson.id, answers, "practice", {
      now: T2,
    });
    expect(practice.ok).toBe(true);

    const progress = await db.lessonProgress.findUniqueOrThrow({
      where: {
        learnerId_lessonId: { learnerId: learner.id, lessonId: lesson.id },
      },
    });
    expect(progress.lastPlayed?.getTime()).toBe(T2);
  });
});
