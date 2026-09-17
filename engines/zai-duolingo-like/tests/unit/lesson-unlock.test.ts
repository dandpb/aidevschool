// lesson-unlock — the single pure source of the unlock rules, extracted
// test-first from the two copies that lived in /api/curriculum and
// daily-challenge.ts. Rules:
//  - module 0 is always unlocked;
//  - module i>0 unlocks when EVERY lesson of module i-1 is completed;
//  - lesson 0 of an unlocked module is unlocked;
//  - lesson j>0 unlocks when its module is unlocked and lesson j-1 is completed.

import { describe, it, expect } from "vitest";
import { isModuleUnlocked, isLessonUnlocked } from "@/lib/lesson-unlock";

// 3 modules × 2 lessons: m0[l0,l1], m1[l2,l3], m2[l4,l5]
const MODULES = [
  { lessons: [{ id: "l0" }, { id: "l1" }] },
  { lessons: [{ id: "l2" }, { id: "l3" }] },
  { lessons: [{ id: "l4" }, { id: "l5" }] },
];
const none = new Set<string>();
const set = (...ids: string[]) => new Set(ids);

describe("isModuleUnlocked", () => {
  it("module 0 is always unlocked, even with nothing completed", () => {
    expect(isModuleUnlocked(MODULES, none, 0)).toBe(true);
  });

  it("module 1 stays locked while module 0 is only partially complete", () => {
    expect(isModuleUnlocked(MODULES, set("l0"), 1)).toBe(false);
  });

  it("module 1 unlocks when every lesson of module 0 is completed", () => {
    expect(isModuleUnlocked(MODULES, set("l0", "l1"), 1)).toBe(true);
  });

  it("module 2 needs the WHOLE module 1, not just its first lesson", () => {
    expect(isModuleUnlocked(MODULES, set("l0", "l1", "l2"), 2)).toBe(false);
    expect(isModuleUnlocked(MODULES, set("l0", "l1", "l2", "l3"), 2)).toBe(true);
  });

  it("out-of-range module index is never unlocked", () => {
    expect(isModuleUnlocked(MODULES, set("l0", "l1"), 99)).toBe(false);
    expect(isModuleUnlocked(MODULES, none, -1)).toBe(false);
  });
});

describe("isLessonUnlocked", () => {
  it("first lesson of module 0 is unlocked from the start", () => {
    expect(isLessonUnlocked(MODULES, none, 0, 0)).toBe(true);
  });

  it("second lesson needs the first completed", () => {
    expect(isLessonUnlocked(MODULES, none, 0, 1)).toBe(false);
    expect(isLessonUnlocked(MODULES, set("l0"), 0, 1)).toBe(true);
  });

  it("lessons of a locked module stay locked", () => {
    expect(isLessonUnlocked(MODULES, none, 1, 0)).toBe(false);
  });

  it("first lesson of module 1 unlocks with module 0 complete", () => {
    expect(isLessonUnlocked(MODULES, set("l0", "l1"), 1, 0)).toBe(true);
    expect(isLessonUnlocked(MODULES, set("l0", "l1"), 1, 1)).toBe(false);
    expect(isLessonUnlocked(MODULES, set("l0", "l1", "l2"), 1, 1)).toBe(true);
  });

  it("out-of-range indices are never unlocked", () => {
    expect(isLessonUnlocked(MODULES, none, 0, 99)).toBe(false);
    expect(isLessonUnlocked(MODULES, none, 99, 0)).toBe(false);
    expect(isLessonUnlocked(MODULES, none, 0, -1)).toBe(false);
  });

  it("an empty curriculum unlocks nothing", () => {
    expect(isModuleUnlocked([], none, 0)).toBe(false);
    expect(isLessonUnlocked([], none, 0, 0)).toBe(false);
  });
});
