// Unit tests for streak computation (calendar-day based, freeze-protected).

import { describe, expect, it } from "vitest";
import { computeStreakState } from "@/lib/game";

function daysAgo(n: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, 12, 0, 0);
}

describe("computeStreakState", () => {
  it("starts at 1 when the streak was never touched", () => {
    expect(computeStreakState(null, 0)).toEqual({
      touchedToday: false,
      newStreak: 1,
      missedDay: false,
      freezeConsumed: false,
    });
  });

  it("is idempotent within the same calendar day", () => {
    expect(computeStreakState(daysAgo(0), 5)).toEqual({
      touchedToday: true,
      newStreak: 5,
      missedDay: false,
      freezeConsumed: false,
    });
  });

  it("extends the streak when last touched yesterday", () => {
    expect(computeStreakState(daysAgo(1), 5)).toEqual({
      touchedToday: false,
      newStreak: 6,
      missedDay: false,
      freezeConsumed: false,
    });
  });

  it("consumes a freeze to protect the streak across missed days", () => {
    expect(computeStreakState(daysAgo(3), 5, 1)).toEqual({
      touchedToday: false,
      newStreak: 6,
      missedDay: false,
      freezeConsumed: true,
    });
  });

  it("resets to 1 and reports the break with no freeze available", () => {
    expect(computeStreakState(daysAgo(3), 5, 0)).toEqual({
      touchedToday: false,
      newStreak: 1,
      missedDay: true,
      freezeConsumed: false,
    });
  });
});
