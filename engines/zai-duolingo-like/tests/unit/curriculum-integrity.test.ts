// Content-integrity guard for the seeded curriculum: every exercise must be
// solvable and every slug unique, so the complete/practice routes always have
// gradeable data.

import { describe, expect, it } from "vitest";
import { CURRICULUM } from "@/lib/curriculum-data";
import { gradeExercise } from "@/lib/grader";
import { correctAnswers } from "../helpers";

describe("CURRICULUM integrity", () => {
  it("has unique module and lesson slugs", () => {
    const moduleSlugs = CURRICULUM.map((m) => m.slug);
    expect(new Set(moduleSlugs).size).toBe(moduleSlugs.length);
    const lessonSlugs = CURRICULUM.flatMap((m) => m.lessons.map((l) => l.slug));
    expect(new Set(lessonSlugs).size).toBe(lessonSlugs.length);
  });

  it("every lesson has at least one exercise with prompt and explanation", () => {
    for (const mod of CURRICULUM) {
      for (const lesson of mod.lessons) {
        expect(lesson.exercises.length, lesson.slug).toBeGreaterThan(0);
        for (const ex of lesson.exercises) {
          expect(ex.prompt.length, `${lesson.slug}/${ex.id}`).toBeGreaterThan(0);
          expect(ex.explanation.length, `${lesson.slug}/${ex.id}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("exercise ids are unique across the curriculum", () => {
    const ids = CURRICULUM.flatMap((m) =>
      m.lessons.flatMap((l) => l.exercises.map((e) => e.id))
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("multiple-choice correctIndex is within options range", () => {
    for (const mod of CURRICULUM) {
      for (const lesson of mod.lessons) {
        for (const ex of lesson.exercises) {
          if (ex.type !== "multiple-choice") continue;
          expect(ex.options.length).toBeGreaterThan(1);
          expect(ex.correctIndex).toBeGreaterThanOrEqual(0);
          expect(ex.correctIndex).toBeLessThan(ex.options.length);
        }
      }
    }
  });

  it("fill-blank banks cover each slot exactly once", () => {
    for (const mod of CURRICULUM) {
      for (const lesson of mod.lessons) {
        for (const ex of lesson.exercises) {
          if (ex.type !== "fill-blank") continue;
          const slots = ex.banks
            .map((b) => b.correctSlot)
            .filter((s): s is number => s !== null)
            .sort((a, b) => a - b);
          expect(slots, ex.id).toEqual(
            Array.from({ length: ex.blanks }, (_, i) => i)
          );
        }
      }
    }
  });

  it("order correctOrder is a permutation of item indices", () => {
    for (const mod of CURRICULUM) {
      for (const lesson of mod.lessons) {
        for (const ex of lesson.exercises) {
          if (ex.type !== "order") continue;
          expect([...ex.correctOrder].sort((a, b) => a - b), ex.id).toEqual(
            ex.items.map((_, i) => i)
          );
        }
      }
    }
  });

  it("every exercise grades correct answers as correct", () => {
    for (const mod of CURRICULUM) {
      for (const lesson of mod.lessons) {
        const answers = correctAnswers(lesson.exercises);
        lesson.exercises.forEach((ex, i) => {
          expect(gradeExercise(ex, answers[i]), `${lesson.slug}/${ex.id}`).toBe(true);
        });
      }
    }
  });
});
