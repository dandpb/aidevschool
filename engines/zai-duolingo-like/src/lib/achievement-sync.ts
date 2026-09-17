// Vertical Protocol — achievement awarding (server-side)
//
// evaluateAchievements (pure, in ./achievements) says WHICH slugs the learner
// deserves; this module gathers the context for it and persists the awards.
// Split by design: evaluation is pure and unit-tested; awarding is impure and
// returns exactly what changed. Callers pass a transaction client to join
// their pipeline's transaction; standalone calls run in their own.

import { db, type DbClient } from "@/lib/db";
import { getCurrentLearner } from "@/lib/game";
import {
  ACHIEVEMENT_MAP,
  evaluateAchievements,
  type AchievementEvalContext,
} from "@/lib/achievements";

export interface AwardResult {
  newlyUnlocked: string[]; // slugs unlocked by this call
  allEarned: string[]; // every slug the learner deserves now
  gemsGained: number;
  xpGained: number;
}

// Gather the evaluation context for the current learner. Reads only.
async function gatherContext(
  client: DbClient
): Promise<{ learnerId: string; ctx: AchievementEvalContext }> {
  const learner = await getCurrentLearner(client);

  const allModules = await client.module.findMany({
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  const progress = await client.lessonProgress.findMany({
    where: { learnerId: learner.id, completed: true },
  });
  const completedLessonIds = new Set(progress.map((p) => p.lessonId));

  const completedModuleSlugs: string[] = [];
  for (const mod of allModules) {
    if (mod.lessons.length > 0 && mod.lessons.every((l) => completedLessonIds.has(l.id))) {
      completedModuleSlugs.push(mod.slug);
    }
  }

  const playgroundCount = await client.chatThread.count({
    where: { learnerId: learner.id },
  });

  return {
    learnerId: learner.id,
    ctx: {
      completedLessons: progress.length,
      totalLessons: allModules.reduce((acc, m) => acc + m.lessons.length, 0),
      completedModuleSlugs,
      streakCurrent: learner.streak?.current ?? 0,
      hasThreeStars: progress.some((p) => p.stars >= 3),
      league: learner.league,
      hasUsedPlayground: playgroundCount > 0,
      hasOnboarded: learner.name !== "Recruta" || learner.xp > 0,
    },
  };
}

// Persist awards for the given slugs the learner doesn't have yet: achievement
// rows, gem/XP rewards, and activity log entries. The return value states
// exactly what changed.
export async function awardAchievements(
  learnerId: string,
  slugs: string[],
  client: DbClient = db
): Promise<{ newlyUnlocked: string[]; gemsGained: number; xpGained: number }> {
  const existing = await client.achievement.findMany({
    where: { learnerId },
    select: { slug: true },
  });
  const existingSet = new Set(existing.map((a) => a.slug));

  const newlyUnlocked: string[] = [];
  let gemsGained = 0;
  let xpGained = 0;
  for (const slug of slugs) {
    if (existingSet.has(slug)) continue;
    const def = ACHIEVEMENT_MAP[slug];
    if (!def) continue;
    await client.achievement.create({ data: { learnerId, slug } });
    await client.learner.update({
      where: { id: learnerId },
      data: {
        gems: { increment: def.gemReward },
        xp: { increment: def.xpReward },
        leagueXp: { increment: def.xpReward },
      },
    });
    await client.activityLog.create({
      data: {
        learnerId,
        type: "achievement",
        detail: def.title,
        xpDelta: def.xpReward,
      },
    });
    newlyUnlocked.push(slug);
    gemsGained += def.gemReward;
    xpGained += def.xpReward;
  }
  return { newlyUnlocked, gemsGained, xpGained };
}

async function syncOn(client: DbClient): Promise<AwardResult> {
  const { learnerId, ctx } = await gatherContext(client);
  const shouldHave = evaluateAchievements(ctx);
  const award = await awardAchievements(learnerId, shouldHave, client);
  return { ...award, allEarned: shouldHave };
}

// Evaluate the learner's current state and persist any newly-earned
// achievements. Pass a transaction client to make the awards atomic with the
// caller's pipeline; standalone calls run in their own transaction.
export async function syncAchievements(client?: DbClient): Promise<AwardResult> {
  if (client) return syncOn(client);
  return db.$transaction((tx) => syncOn(tx));
}
