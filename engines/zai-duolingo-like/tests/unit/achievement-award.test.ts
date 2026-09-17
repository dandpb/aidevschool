// awardAchievements — the impure half of the achievement seam, tested
// directly: exactly what changed is visible in the return value, and
// re-awarding the same slug is a no-op (no double gem/XP increments).

import { describe, it, beforeEach, expect } from "vitest";
import { awardAchievements, syncAchievements } from "@/lib/achievement-sync";
import { ACHIEVEMENT_MAP } from "@/lib/achievements";
import { db } from "@/lib/db";
import { resetDatabase, seedBaseline, currentLearner } from "../helpers";

describe("awardAchievements", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("awards rows + rewards and reports exactly what changed", async () => {
    const learner = await seedBaseline();
    const before = await currentLearner();

    const result = await awardAchievements(learner.id, ["primeiro-passo", "ofensiva-3"]);

    expect(result.newlyUnlocked).toEqual(["primeiro-passo", "ofensiva-3"]);
    expect(result.gemsGained).toBe(
      ACHIEVEMENT_MAP["primeiro-passo"].gemReward + ACHIEVEMENT_MAP["ofensiva-3"].gemReward
    );
    expect(result.xpGained).toBe(
      ACHIEVEMENT_MAP["primeiro-passo"].xpReward + ACHIEVEMENT_MAP["ofensiva-3"].xpReward
    );

    const after = await currentLearner();
    expect(after.gems).toBe(before.gems + result.gemsGained);
    expect(after.xp).toBe(before.xp + result.xpGained);

    const rows = await db.achievement.findMany({ where: { learnerId: learner.id } });
    expect(rows.map((r) => r.slug).sort()).toEqual(["ofensiva-3", "primeiro-passo"]);
  });

  it("re-awarding the same slug is a no-op — no double rewards", async () => {
    const learner = await seedBaseline();
    await awardAchievements(learner.id, ["primeiro-passo"]);
    const mid = await currentLearner();

    const again = await awardAchievements(learner.id, ["primeiro-passo"]);
    expect(again.newlyUnlocked).toEqual([]);
    expect(again.gemsGained).toBe(0);
    expect(again.xpGained).toBe(0);

    const after = await currentLearner();
    expect(after.gems).toBe(mid.gems);
    expect(after.xp).toBe(mid.xp);

    const rows = await db.achievement.findMany({ where: { learnerId: learner.id } });
    expect(rows).toHaveLength(1);
  });

  it("unknown slugs are ignored", async () => {
    const learner = await seedBaseline();
    const result = await awardAchievements(learner.id, ["nao-existe"]);
    expect(result.newlyUnlocked).toEqual([]);
    expect(result.gemsGained).toBe(0);
  });
});

describe("syncAchievements", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("fresh baseline earns nothing; allEarned is empty", async () => {
    await seedBaseline();
    const result = await syncAchievements();
    expect(result.newlyUnlocked).toEqual([]);
    expect(result.allEarned).toEqual([]);
  });
});
