import { expect, it, vi } from "vitest";
import { modules } from "../../src/data/generated/lessons";
import { applyStreak, createInitialProgress } from "../../src/domain/progress";

it("preserva a sequência nas mudanças de horário de verão", () => {
  vi.stubEnv("TZ", "America/New_York");
  try {
    const progress = createInitialProgress(modules, "v1");
    progress.streak = { current: 5, longest: 5, lastActivityDate: "2026-03-08" };
    expect(applyStreak(progress, new Date("2026-03-09T04:30:00Z")).streak).toEqual({
      current: 6,
      longest: 6,
      lastActivityDate: "2026-03-09",
    });
    progress.streak = { current: 5, longest: 7, lastActivityDate: "2026-10-31" };
    expect(applyStreak(progress, new Date("2026-11-02T04:30:00Z")).streak).toEqual({
      current: 6,
      longest: 7,
      lastActivityDate: "2026-11-01",
    });
  } finally {
    vi.unstubAllEnvs();
  }
});

it("respeita mesmo dia, lacunas e viradas de ano e de mês bissexto", () => {
  vi.stubEnv("TZ", "Pacific/Auckland");
  try {
    const progress = createInitialProgress(modules, "v1");
    progress.streak = { current: 3, longest: 8, lastActivityDate: "2024-02-29" };
    expect(applyStreak(progress, new Date("2024-02-29T12:00:00Z")).streak.current).toBe(4);
    expect(applyStreak(progress, new Date("2024-02-28T12:00:00Z"))).toBe(progress);
    expect(applyStreak(progress, new Date("2024-03-01T12:00:00Z")).streak.current).toBe(1);
    progress.streak = { current: 3, longest: 8, lastActivityDate: "2025-12-31" };
    expect(applyStreak(progress, new Date("2025-12-31T12:00:00Z")).streak.current).toBe(4);
  } finally {
    vi.unstubAllEnvs();
  }
});
