// GET /api/state — thin adapter over the game-state module's snapshot().
// First call creates the default learner; hearts live in their own slice with
// an absolute regen timestamp; side effects surface via notices[].

import { describe, it, beforeEach, expect } from "vitest";
import { GET } from "@/app/api/state/route";
import { db } from "@/lib/db";
import { resetDatabase, seedBaseline } from "../helpers";

describe("GET /api/state", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates the default learner on first call", async () => {
    await seedBaseline();

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.learner).toMatchObject({
      name: "Recruta",
      gems: 20,
      league: "bronze",
      leagueXp: 0,
      xp: 0,
    });
    expect(typeof data.learner.id).toBe("string");
    expect(data.learner.path).toBe("neon-syntax");
    // NO leagueMeta, no hearts on the learner slice
    expect((data.learner as Record<string, unknown>).leagueMeta).toBeUndefined();
    expect((data.learner as Record<string, unknown>).hearts).toBeUndefined();
    expect(typeof data.at).toBe("number");
  });

  it("returns hearts as their own slice (full: nextRegenAt null)", async () => {
    await seedBaseline();
    const data = await (await GET()).json();
    expect(data.hearts).toEqual({ current: 5, max: 5, nextRegenAt: null });
  });

  it("returns streak defaults (longest 0, freezes 0, touchedToday/missedDay false)", async () => {
    await seedBaseline();
    const data = await (await GET()).json();

    // A fresh learner has never touched the streak: current must report the
    // stored value (0), not an optimistic preview of a first touch.
    expect(data.streak).toMatchObject({
      current: 0,
      longest: 0,
      touchedToday: false,
      missedDay: false,
      weeklyXp: 0,
      weeklyGoal: 50,
      freezes: 0,
    });
  });

  it("returns settings defaults", async () => {
    await seedBaseline();
    const data = await (await GET()).json();

    expect(data.settings).toMatchObject({
      sound: true,
      rain: true,
      reducedMotion: false,
      language: "pt-BR",
    });
  });

  it("progress reflects the seeded curriculum (totalLessons > 0, completedLessons 0)", async () => {
    await seedBaseline();
    const data = await (await GET()).json();

    expect(data.progress.completedLessons).toBe(0);
    expect(data.progress.totalLessons).toBeGreaterThan(0);
  });

  it("anchors the league-reset cadence silently on first call (no phantom notice)", async () => {
    await seedBaseline();
    const data = await (await GET()).json();

    // First observation ever: there is no previous week to judge standings
    // against, so no league-reset notice may be emitted (the UI shows a
    // promote/demote toast for it). The cadence is anchored by writing
    // streak.lastLeagueReset, and no activity noise is logged.
    expect(data.notices).toEqual([]);

    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    const streak = await db.streak.findUnique({
      where: { learnerId: learner.id },
    });
    expect(streak?.lastLeagueReset).not.toBeNull();
    const resetLogs = await db.activityLog.count({
      where: { learnerId: learner.id, type: "league_reset" },
    });
    expect(resetLogs).toBe(0);

    // second call: still quiet
    const data2 = await (await GET()).json();
    expect(data2.notices).toEqual([]);
  });

  it("only one non-rival learner is created across multiple calls", async () => {
    await seedBaseline();
    await GET();
    await GET();
    const learners = await db.learner.findMany({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    expect(learners).toHaveLength(1);
  });
});
