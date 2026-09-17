// Vertical Protocol — game/learner helpers (server-side only)

import { db, type DbClient } from "@/lib/db";

// In this single-device cozy app, the "current" learner is the first non-rival
// learner record. Rivals are seeded with ids starting with "rival-".
export async function getCurrentLearner(client: DbClient = db) {
  let learner = await client.learner.findFirst({
    where: { NOT: { id: { startsWith: "rival-" } } },
    include: { streak: true, settings: true },
  });
  if (!learner) {
    learner = await client.learner.create({
      data: {
        name: "Recruta",
        path: "neon-syntax",
        hearts: 5,
        maxHearts: 5,
        gems: 20,
        streak: { create: {} },
        settings: { create: {} },
      },
      include: { streak: true, settings: true },
    });
  }
  return learner;
}

export type CurrentLearner = Awaited<ReturnType<typeof getCurrentLearner>>;

// Heart regen: 1 heart per HEART_REGEN_MINUTES since heartsUpdatedAt
// (the dedicated baseline — NOT updatedAt, which any write would bump).
export const HEART_REGEN_MINUTES = 20;

export function recomputeHearts(
  learner: CurrentLearner,
  nowMs: number = Date.now()
): {
  hearts: number;
  regenMs: number;
} {
  const now = nowMs;
  const last = learner.heartsUpdatedAt.getTime();
  const elapsed = now - last;
  const missing = learner.maxHearts - learner.hearts;
  if (missing <= 0) return { hearts: learner.maxHearts, regenMs: 0 };
  const regenMs = HEART_REGEN_MINUTES * 60 * 1000;
  const gained = Math.floor(elapsed / regenMs);
  if (gained <= 0) {
    return { hearts: learner.hearts, regenMs: regenMs - (elapsed % regenMs) };
  }
  const newHearts = Math.min(learner.maxHearts, learner.hearts + gained);
  return { hearts: newHearts, regenMs: newHearts >= learner.maxHearts ? 0 : regenMs };
}

// Streak logic: touching on a new calendar day (UTC) extends streak.
// If a day was missed and the learner owns a freeze, it's consumed to protect
// the streak (newStreak continues, missedDay stays false, freezeConsumed true).
export function computeStreakState(
  lastTouch: Date | null,
  current: number,
  freezes = 0,
  now: Date = new Date()
) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!lastTouch) {
    return {
      touchedToday: false,
      newStreak: 1,
      missedDay: false,
      freezeConsumed: false,
    };
  }
  const last = new Date(
    lastTouch.getFullYear(),
    lastTouch.getMonth(),
    lastTouch.getDate()
  );
  const diffDays = Math.round((today.getTime() - last.getTime()) / 86400000);
  if (diffDays === 0) {
    return {
      touchedToday: true,
      newStreak: current,
      missedDay: false,
      freezeConsumed: false,
    };
  }
  if (diffDays === 1) {
    return {
      touchedToday: false,
      newStreak: current + 1,
      missedDay: false,
      freezeConsumed: false,
    };
  }
  // missed a day(s) — streak would reset, but a freeze can protect it
  if (freezes > 0) {
    return {
      touchedToday: false,
      newStreak: current + 1,
      missedDay: false,
      freezeConsumed: true,
    };
  }
  return {
    touchedToday: false,
    newStreak: 1,
    missedDay: true,
    freezeConsumed: false,
  };
}

// League metadata lives in @/lib/league-meta (shared with the client bundle);
// re-exported here so existing server imports keep working.
export {
  LEAGUES,
  LEAGUE_META,
  leagueForXp,
  nextLeagueThreshold,
} from "@/lib/league-meta";
export type { League, LeagueMeta } from "@/lib/league-meta";
