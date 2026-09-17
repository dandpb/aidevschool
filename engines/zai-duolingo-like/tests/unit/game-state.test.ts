// snapshot() — the game-state interface IS the test surface: fixed clock +
// the shared temp SQLite file, no HTTP involved.

import { describe, it, beforeEach, expect } from "vitest";
import { snapshot, createGameState, type Clock } from "@/lib/game-state";
import { db } from "@/lib/db";
import { resetDatabase, seedBaseline } from "../helpers";

const MIN = 60 * 1000;

describe("snapshot() with a fixed clock", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("createGameState is the construction seam: TestClock drives the snapshot", async () => {
    const learner = await seedBaseline();
    const T0 = Date.now() - 60 * MIN;
    await db.learner.update({
      where: { id: learner.id },
      data: { hearts: 1, heartsUpdatedAt: new Date(T0) },
    });
    const testClock: Clock = { now: () => T0 + 21 * MIN };
    const gs = createGameState({ clock: testClock });
    const snap = await gs.snapshot();
    expect(snap.hearts.current).toBe(2);
    expect(snap.at).toBe(T0 + 21 * MIN);
  });

  it("regenerates hearts against the clock and reports it via notices", async () => {
    const learner = await seedBaseline();
    const T0 = Date.now() - 60 * MIN;
    await db.learner.update({
      where: { id: learner.id },
      data: { hearts: 2, heartsUpdatedAt: new Date(T0) },
    });

    // 21 minutes later: one heart should have regenerated (1 per 20 min)
    const snap = await snapshot({ clock: { now: () => T0 + 21 * MIN } });

    expect(snap.hearts.current).toBe(3);
    expect(snap.hearts.max).toBe(5);
    expect(snap.hearts.nextRegenAt).toBe(T0 + 21 * MIN + 20 * MIN);
    expect(snap.notices).toContainEqual({
      kind: "hearts-regenerated",
      from: 2,
      to: 3,
    });
    expect(snap.at).toBe(T0 + 21 * MIN);

    // persisted: a second snapshot at the same clock sees the same state,
    // with no regen notice repeated
    const snap2 = await snapshot({ clock: { now: () => T0 + 21 * MIN } });
    expect(snap2.hearts.current).toBe(3);
    expect(snap2.notices).toEqual([]);
  });

  it("full hearts: no regen, no countdown, no notice", async () => {
    await seedBaseline();
    const snap = await snapshot({ clock: { now: () => Date.now() } });
    expect(snap.hearts).toEqual({ current: 5, max: 5, nextRegenAt: null });
    expect(snap.notices).toEqual([]);
  });

  it("surfaces a recent streak-freeze use as a freeze-used notice", async () => {
    const learner = await seedBaseline();
    await db.activityLog.create({
      data: {
        learnerId: learner.id,
        type: "streak_freeze_used",
        detail: "protected",
        xpDelta: 0,
      },
    });
    const snap = await snapshot();
    expect(snap.notices).toContainEqual({ kind: "freeze-used" });
  });

  it("applies a due league reset and reports it as a notice", async () => {
    const learner = await seedBaseline();
    await db.learner.update({
      where: { id: learner.id },
      data: { leagueXp: 200, league: "bronze" },
    });
    await db.streak.update({
      where: { learnerId: learner.id },
      data: { lastLeagueReset: new Date(Date.now() - 8 * 24 * 60 * MIN) },
    });

    const snap = await snapshot();
    expect(snap.notices).toContainEqual({
      kind: "league-reset",
      promoted: true,
      demoted: false,
      oldLeague: "bronze",
      newLeague: "silver",
    });

    // idempotent: the reset is settled, the next snapshot is quiet
    const snap2 = await snapshot();
    expect(snap2.notices).toEqual([]);
  });
});
