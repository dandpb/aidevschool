// GET /api/leaderboard — standings + myRow flagged isMe, sorted desc, ranks 1..N.
// league-reset helper: promoted when learner is top of bronze and a week has passed.

import { describe, it, beforeEach, expect } from "vitest";
import { GET } from "@/app/api/leaderboard/route";
import { checkAndApplyLeagueReset } from "@/lib/league-reset";
import { db } from "@/lib/db";
import { resetDatabase, seedBaseline } from "../helpers";

describe("GET /api/leaderboard", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("after seedBaseline: 7 standings (6 rivals + me), sorted desc, ranks 1..7, bronze", async () => {
    await seedBaseline();
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.league).toBe("bronze");
    expect(data.total).toBe(7);
    expect(data.standings).toHaveLength(7);
    // No `myRank` in trimmed contract
    expect((data as Record<string, unknown>).myRank).toBeUndefined();

    // ranks 1..7
    expect(data.standings.map((s: { rank: number }) => s.rank)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);

    // sorted desc by leagueXp
    const xpSeq = data.standings.map((s: { leagueXp: number }) => s.leagueXp);
    for (let i = 1; i < xpSeq.length; i++) {
      expect(xpSeq[i]).toBeLessThanOrEqual(xpSeq[i - 1]);
    }

    // exactly one row is flagged isMe
    const meRows = data.standings.filter((s: { isMe: boolean }) => s.isMe);
    expect(meRows).toHaveLength(1);
    // the me row's name contains "(você)"
    expect((meRows[0] as { name: string }).name).toContain("(você)");
    expect((meRows[0] as { isRival: boolean }).isRival).toBe(false);
  });

  it("promote/demote zones are exposed as plain numbers", async () => {
    await seedBaseline();
    const data = await (await GET()).json();
    expect(data.promoteZone).toBe(3);
    expect(data.demoteZone).toBe(3);
  });

  it("leagueMeta is present and matches bronze", async () => {
    await seedBaseline();
    const data = await (await GET()).json();
    expect(data.leagueMeta.label).toBe("Bronze");
  });
});

describe("league-reset: checkAndApplyLeagueReset()", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("promotes the learner to silver when top of bronze and a week has passed", async () => {
    await seedBaseline();
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });

    // Boost the learner to the top of bronze (rival leagueXps top out at 142)
    await db.learner.update({
      where: { id: learner.id },
      data: { leagueXp: 200, league: "bronze" },
    });

    // Backdate lastLeagueReset to 8 days ago.
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await db.streak.update({
      where: { learnerId: learner.id },
      data: { lastLeagueReset: eightDaysAgo },
    });

    const result = await checkAndApplyLeagueReset();

    expect(result.resetOccurred).toBe(true);
    expect(result.promoted).toBe(true);
    expect(result.demoted).toBe(false);
    expect(result.oldLeague).toBe("bronze");
    expect(result.newLeague).toBe("silver");

    const updated = await db.learner.findUniqueOrThrow({ where: { id: learner.id } });
    expect(updated.league).toBe("silver");
    expect(updated.leagueXp).toBe(0);

    const streak = await db.streak.findUniqueOrThrow({ where: { learnerId: learner.id } });
    expect(streak.lastLeagueReset).not.toBeNull();
    expect(streak.weeklyXp).toBe(0);
  });

  it("running the reset twice in the same week: second call reports resetOccurred:false", async () => {
    await seedBaseline();
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    await db.learner.update({
      where: { id: learner.id },
      data: { leagueXp: 200, league: "bronze" },
    });
    await db.streak.update({
      where: { learnerId: learner.id },
      data: { lastLeagueReset: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    });

    const first = await checkAndApplyLeagueReset();
    expect(first.resetOccurred).toBe(true);

    const second = await checkAndApplyLeagueReset();
    expect(second.resetOccurred).toBe(false);
  });
});