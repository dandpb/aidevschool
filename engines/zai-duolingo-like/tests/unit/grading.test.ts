// Unit tests for the single shared exercise grader (used by both the
// lesson-complete and practice routes).

import { describe, expect, it } from "vitest";
import { gradeExercise } from "@/lib/grader";
import type {
  FillBlankExercise,
  MultipleChoiceExercise,
  OrderExercise,
  SwipeExercise,
  TrueFalseExercise,
} from "@/lib/grader";

const mc: MultipleChoiceExercise = {
  id: "mc1",
  type: "multiple-choice",
  prompt: "p",
  explanation: "e",
  options: ["a", "b", "c"],
  correctIndex: 1,
};

const tf: TrueFalseExercise = {
  id: "tf1",
  type: "true-false",
  prompt: "p",
  explanation: "e",
  statement: "s",
  isTrue: true,
};

const fb: FillBlankExercise = {
  id: "fb1",
  type: "fill-blank",
  prompt: "p",
  explanation: "e",
  template: "t",
  blanks: 2,
  banks: [
    { label: "x", correctSlot: 0 },
    { label: "y", correctSlot: 1 },
    { label: "z", correctSlot: null },
  ],
};

const swipeAi: SwipeExercise = {
  id: "sw1",
  type: "swipe",
  prompt: "p",
  explanation: "e",
  swipeRightIf: "ai",
  rightLabel: "IA",
  leftLabel: "Real",
  items: [
    { label: "i1", detail: "d", value: "ai" },
    { label: "i2", detail: "d", value: "real" },
  ],
};

const swipeReal: SwipeExercise = { ...swipeAi, id: "sw2", swipeRightIf: "real" };

const order: OrderExercise = {
  id: "or1",
  type: "order",
  prompt: "p",
  explanation: "e",
  items: ["a", "b", "c"],
  correctOrder: [2, 0, 1],
};

describe("gradeExercise", () => {
  it("grades multiple-choice by exact index", () => {
    expect(gradeExercise(mc, 1)).toBe(true);
    expect(gradeExercise(mc, 0)).toBe(false);
    expect(gradeExercise(mc, "1")).toBe(false);
    expect(gradeExercise(mc, null)).toBe(false);
  });

  it("grades true-false by boolean equality", () => {
    expect(gradeExercise(tf, true)).toBe(true);
    expect(gradeExercise(tf, false)).toBe(false);
    expect(gradeExercise(tf, "true")).toBe(false);
  });

  it("grades fill-blank slot by slot via bank correctSlot", () => {
    expect(gradeExercise(fb, [0, 1])).toBe(true);
    expect(gradeExercise(fb, [1, 0])).toBe(false);
    expect(gradeExercise(fb, [0, 2])).toBe(false); // z has correctSlot null
    expect(gradeExercise(fb, [0])).toBe(false); // wrong length
    expect(gradeExercise(fb, [0, 1, 2])).toBe(false); // wrong length
    expect(gradeExercise(fb, ["0", 1])).toBe(false); // non-numeric bank index
    expect(gradeExercise(fb, "not-an-array")).toBe(false);
  });

  it("grades swipe with swipeRightIf 'ai' as decision === item.value", () => {
    expect(gradeExercise(swipeAi, ["ai", "real"])).toBe(true);
    expect(gradeExercise(swipeAi, ["real", "ai"])).toBe(false);
    expect(gradeExercise(swipeAi, ["ai"])).toBe(false); // wrong length
  });

  it("honors swipeRightIf 'real' (the regression the shared grader fixed)", () => {
    // When swiping right means "real", a decision of "ai" is correct exactly
    // when the item is NOT ai — the correct answer flips.
    expect(gradeExercise(swipeReal, ["real", "ai"])).toBe(true);
    expect(gradeExercise(swipeReal, ["ai", "real"])).toBe(false);
  });

  it("grades order by exact correctOrder sequence", () => {
    expect(gradeExercise(order, [2, 0, 1])).toBe(true);
    expect(gradeExercise(order, [0, 1, 2])).toBe(false);
    expect(gradeExercise(order, [2, 0])).toBe(false); // wrong length
    expect(gradeExercise(order, null)).toBe(false);
  });

  it("returns false for unknown exercise types", () => {
    expect(gradeExercise({ id: "x", type: "nope" } as any, null)).toBe(false);
  });
});
