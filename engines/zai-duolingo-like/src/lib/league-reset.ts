// Vertical Protocol — Weekly League Reset logic (server-side)
// Promotes/demotes learners based on their league standings at week end.
// Runs lazily on state/leaderboard fetches (no cron needed).

import { db, type DbClient } from "@/lib/db";
import { getCurrentLearner } from "@/lib/game";
import { LEAGUES, LEAGUE_META } from "@/lib/game";

// A week has passed if the last reset was >7 days ago (or never).
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PROMOTE_ZONE = 3; // top 3 promote
const DEMOTE_ZONE = 3; // bottom 3 demote

// Returns the ISO week key for grouping (e.g. "2026-W31")
function weekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // ISO week calculation
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - day + 3); // Thursday of this week
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 - 3 +
        ((firstThursday.getDay() + 6) % 7)) /
        7
    );
  return `${d.getFullYear()}-W${week.toString().padStart(2, "0")}`;
}

export interface LeagueResetResult {
  resetOccurred: boolean;
  oldLeague: string;
  newLeague: string;
  promoted: boolean;
  demoted: boolean;
  weekKey: string;
}

// Check and apply a weekly league reset for the current learner.
// Returns the result (resetOccurred=false if no reset was needed).
export async function checkAndApplyLeagueReset(
  now: Date = new Date(),
  client: DbClient = db
): Promise<LeagueResetResult> {
  const learner = await getCurrentLearner(client);
  const thisWeek = weekKey(now);

  // check if already reset this week
  const streak = learner.streak;
  const lastReset = streak?.lastLeagueReset;
  const lastResetWeek = lastReset ? weekKey(lastReset) : null;

  if (lastResetWeek === thisWeek) {
    return {
      resetOccurred: false,
      oldLeague: learner.league,
      newLeague: learner.league,
      promoted: false,
      demoted: false,
      weekKey: thisWeek,
    };
  }

  if (!lastReset) {
    // First observation ever: anchor the weekly cadence silently. There is no
    // previous week to judge standings against, so there is nothing to reset —
    // and no toast to show.
    if (streak) {
      await client.streak.update({
        where: { learnerId: learner.id },
        data: { lastLeagueReset: now },
      });
    }
    return {
      resetOccurred: false,
      oldLeague: learner.league,
      newLeague: learner.league,
      promoted: false,
      demoted: false,
      weekKey: thisWeek,
    };
  }

  // A reset is needed. Determine promotion/demotion based on standings.
  const oldLeague = learner.league;
  let newLeague = oldLeague;
  let promoted = false;
  let demoted = false;

  // fetch all learners in the same league tier, sorted by leagueXp desc
  const peers = await client.learner.findMany({
    where: { league: oldLeague },
    orderBy: { leagueXp: "desc" },
  });
  const total = peers.length;
  const myIdx = peers.findIndex((p) => p.id === learner.id);

  if (myIdx >= 0 && total > PROMOTE_ZONE + DEMOTE_ZONE) {
    const currentLeagueIdx = LEAGUES.indexOf(oldLeague as (typeof LEAGUES)[number]);
    // promote if in top PROMOTE_ZONE
    if (myIdx < PROMOTE_ZONE && currentLeagueIdx < LEAGUES.length - 1) {
      newLeague = LEAGUES[currentLeagueIdx + 1];
      promoted = true;
    }
    // demote if in bottom DEMOTE_ZONE
    else if (myIdx >= total - DEMOTE_ZONE && currentLeagueIdx > 0) {
      newLeague = LEAGUES[currentLeagueIdx - 1];
      demoted = true;
    }
  }

  // apply the reset: update league, reset leagueXp to 0, set lastLeagueReset
  await client.learner.update({
    where: { id: learner.id },
    data: {
      league: newLeague,
      leagueXp: 0, // reset weekly league XP
    },
  });
  if (streak) {
    await client.streak.update({
      where: { learnerId: learner.id },
      data: {
        lastLeagueReset: now,
        weeklyXp: 0, // reset weekly XP goal tracker too
      },
    });
  }

  // log the reset
  await client.activityLog.create({
    data: {
      learnerId: learner.id,
      type: promoted
        ? "league_promotion"
        : demoted
        ? "league_demotion"
        : "league_reset",
      detail: `${oldLeague} → ${newLeague}`,
      xpDelta: 0,
    },
  });

  return {
    resetOccurred: true,
    oldLeague,
    newLeague,
    promoted,
    demoted,
    weekKey: thisWeek,
  };
}
