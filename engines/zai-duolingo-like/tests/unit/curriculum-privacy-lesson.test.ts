// Regression guard for the closing privacy lesson (AID-2697).
// Appending to the LAST module must never relock existing progress.

import { describe, expect, it } from "vitest";
import { CURRICULUM } from "@/lib/curriculum-data";
import { gradeExercise } from "@/lib/grader";
import { isLessonUnlocked, isModuleUnlocked } from "@/lib/lesson-unlock";
import { correctAnswers } from "../helpers";

const LAST = CURRICULUM.length - 1;
const LESSON_SLUG = "privacidade-dados";

function lastLesson() {
  const mod = CURRICULUM[LAST];
  return mod.lessons[mod.lessons.length - 1];
}

describe("privacy lesson (AID-2697)", () => {
  it("closes the last module as its final lesson", () => {
    const mod = CURRICULUM[LAST];
    expect(mod.slug).toBe("o-protocolo-final");
    const lesson = lastLesson();
    expect(lesson.slug).toBe(LESSON_SLUG);
    expect(lesson.order).toBe(mod.lessons.length - 1);
    expect(lesson.xpReward).toBeGreaterThan(0);
    expect(lesson.narrative.length).toBeGreaterThan(0);
    expect(lesson.tip.length).toBeGreaterThan(0);
  });

  it("has 5 exercises with unique m9l3eN ids covering 5 grader types", () => {
    const lesson = lastLesson();
    expect(lesson.exercises.length).toBe(5);
    const ids = lesson.exercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(5);
    for (const id of ids) expect(id).toMatch(/^m9l3e\d$/);
    const types = new Set(lesson.exercises.map((e) => e.type));
    expect(types.size).toBe(5);
  });

  it("every exercise is solvable by the shared grader", () => {
    const lesson = lastLesson();
    const answers = correctAnswers(lesson.exercises);
    lesson.exercises.forEach((ex, i) => {
      expect(gradeExercise(ex, answers[i]), `${lesson.slug}/${ex.id}`).toBe(true);
    });
  });

  it("does not relock existing progress (appended to the last module)", () => {
    // A learner who completed everything except the new lesson.
    const completed = new Set<string>();
    CURRICULUM.forEach((mod, mi) => {
      mod.lessons.forEach((lesson, li) => {
        if (mi === LAST && lesson.slug === LESSON_SLUG) return;
        completed.add(`${mi}:${li}`);
      });
    });
    const shape = CURRICULUM.map((mod, mi) => ({
      lessons: mod.lessons.map((_, li) => ({ id: `${mi}:${li}` })),
    }));
    // every module stays unlocked with the new lesson still pending…
    for (let mi = 0; mi < CURRICULUM.length; mi++) {
      expect(isModuleUnlocked(shape, completed, mi), `module ${mi}`).toBe(true);
    }
    // …the new lesson itself is playable right away…
    expect(
      isLessonUnlocked(shape, completed, LAST, CURRICULUM[LAST].lessons.length - 1)
    ).toBe(true);
    // …and a fresh learner still starts at module 0, lesson 0.
    expect(isLessonUnlocked(shape, new Set(), 0, 0)).toBe(true);
  });
});
