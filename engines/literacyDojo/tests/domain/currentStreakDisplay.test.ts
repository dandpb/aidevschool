import { expect, it, vi } from "vitest";
import { currentStreakForDate } from "../../src/domain/progress";

it("deriva a sequência por data local sem alterar o registro", () => {
  vi.stubEnv("TZ", "America/New_York");
  try {
    const now = new Date("2026-03-09T04:30:00Z");
    const streak = { current: 5, longest: 9, lastActivityDate: "2026-03-08" };
    expect(currentStreakForDate(streak, now)).toBe(5);
    expect(currentStreakForDate({ ...streak, lastActivityDate: "2026-03-09" }, now)).toBe(5);
    expect(currentStreakForDate({ ...streak, lastActivityDate: "2026-03-07" }, now)).toBe(0);
    expect(streak).toEqual({ current: 5, longest: 9, lastActivityDate: "2026-03-08" });
    expect(currentStreakForDate({ ...streak, lastActivityDate: "2026-03-10" }, now)).toBeNull();
    expect(currentStreakForDate({ ...streak, lastActivityDate: "2026-02-31" }, now)).toBeNull();
    expect(currentStreakForDate({ current: 5, longest: 9 }, now)).toBeNull();
    expect(currentStreakForDate({ current: 0, longest: 9 }, now)).toBe(0);
    expect(currentStreakForDate({ current: -1, longest: 9 }, now)).toBeNull();
    expect(currentStreakForDate({ longest: 9 } as never, now)).toBeNull();
    expect(
      currentStreakForDate(
        { current: 5, longest: 9, lastActivityDate: ["2026-03-08"] } as never,
        now,
      ),
    ).toBeNull();
  } finally {
    vi.unstubAllEnvs();
  }
});
