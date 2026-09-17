// Vertical Protocol — learner game-state (server-side)
//
// Deep module: the single read seam for "the learner's current state".
// snapshot() settles all temporal maintenance internally (weekly league
// reset, heart regen, streak preview) and returns one immutable snapshot.
//
// Invariants (part of the interface, not the implementation):
//  1. Never rejects for domain reasons; a missing learner is created.
//  2. Consistent: league reset, heart regen, and streak preview are already
//     settled when the snapshot returns. Side effects surface via notices[].
//  3. Idempotent in visible state: two calls at the same clock time return
//     the same snapshot (the second has empty notices).
//  4. Fresh by construction: everything is computed against the clock at
//     call time — there is no cache to invalidate.
//
// Construction seam: createGameState({ clock, store }) — tests inject a
// TestClock (and could inject a store client); production uses the defaults.
// Two real adapters justify the seam: the HTTP route (thin) and in-process
// callers (tests, future server components).

import { db, type DbClient } from "@/lib/db";
import {
  getCurrentLearner,
  recomputeHearts,
  computeStreakState,
  leagueForXp,
  nextLeagueThreshold,
} from "@/lib/game";
import { checkAndApplyLeagueReset } from "@/lib/league-reset";

/** Injectable clock — the only configuration that exists, and it's optional. */
export interface Clock {
  now(): number; // epoch ms
}

/** Noteworthy effects that happened DURING the read. Transient by design. */
export type Notice =
  | {
      readonly kind: "league-reset";
      readonly promoted: boolean;
      readonly demoted: boolean;
      readonly oldLeague: string;
      readonly newLeague: string;
    }
  | { readonly kind: "freeze-used" }
  | { readonly kind: "hearts-regenerated"; readonly from: number; readonly to: number };

export interface GameSnapshot {
  readonly at: number; // server clock at snapshot time — clients count down against it
  readonly learner: {
    readonly id: string;
    readonly name: string;
    readonly path: "neon-syntax" | "silicon-shrine";
    readonly xp: number;
    readonly gems: number;
    readonly league: string;
    readonly leagueXp: number;
    readonly nextLeagueThreshold: number | null;
  };
  readonly hearts: {
    readonly current: number;
    readonly max: number;
    /** Absolute epoch ms when the next heart arrives; null when full. */
    readonly nextRegenAt: number | null;
  };
  readonly streak: {
    readonly current: number;
    readonly longest: number;
    readonly freezes: number;
    readonly touchedToday: boolean;
    readonly missedDay: boolean;
    readonly weeklyXp: number;
    readonly weeklyGoal: number;
  };
  readonly settings: {
    readonly sound: boolean;
    readonly rain: boolean;
    readonly reducedMotion: boolean;
    readonly language: string;
  };
  readonly progress: {
    readonly completedLessons: number;
    readonly totalLessons: number;
  };
  /** Emptied by the next snapshot(). Consume for toasts; ignore otherwise. */
  readonly notices: readonly Notice[];
}

export interface GameStateDeps {
  clock?: Clock;
  store?: DbClient;
}

// How long a freeze-used activity stays "recent" and worth a notice.
const FREEZE_NOTICE_WINDOW_MS = 5 * 60 * 1000;

export function createGameState(deps: GameStateDeps = {}) {
  const clock: Clock = deps.clock ?? { now: () => Date.now() };
  const store: DbClient = deps.store ?? db;

  async function snapshot(): Promise<GameSnapshot> {
    const now = clock.now();
    const nowDate = new Date(now);
    const notices: Notice[] = [];

    // Settle stage 1: weekly league reset (lazy — no cron needed).
    const reset = await checkAndApplyLeagueReset(nowDate, store);
    if (reset.resetOccurred) {
      notices.push({
        kind: "league-reset",
        promoted: reset.promoted,
        demoted: reset.demoted,
        oldLeague: reset.oldLeague,
        newLeague: reset.newLeague,
      });
    }

    const learner = await getCurrentLearner(store);

    // Settle stage 2: heart regen, persisted so the regen baseline advances.
    const { hearts, regenMs } = recomputeHearts(learner, now);
    if (hearts !== learner.hearts) {
      await store.learner.update({
        where: { id: learner.id },
        data: { hearts, heartsUpdatedAt: new Date(now) },
      });
      notices.push({ kind: "hearts-regenerated", from: learner.hearts, to: hearts });
    }

    // Streak preview: never-touched streaks report the stored value (0);
    // otherwise preview what the streak becomes when touched today.
    const streakState = computeStreakState(
      learner.streak?.lastTouch ?? null,
      learner.streak?.current ?? 0,
      0,
      nowDate
    );

    const [totalLessons, completedLessons, recentFreeze] = await Promise.all([
      store.lesson.count(),
      store.lessonProgress.count({
        where: { learnerId: learner.id, completed: true },
      }),
      store.activityLog.findFirst({
        where: {
          learnerId: learner.id,
          type: "streak_freeze_used",
          createdAt: { gte: new Date(now - FREEZE_NOTICE_WINDOW_MS) },
        },
      }),
    ]);
    if (recentFreeze) notices.push({ kind: "freeze-used" });

    return {
      at: now,
      learner: {
        id: learner.id,
        name: learner.name,
        path: learner.path === "silicon-shrine" ? "silicon-shrine" : "neon-syntax",
        xp: learner.xp,
        gems: learner.gems,
        league: leagueForXp(learner.xp),
        leagueXp: learner.leagueXp,
        nextLeagueThreshold: nextLeagueThreshold(learner.xp),
      },
      hearts: {
        current: hearts,
        max: learner.maxHearts,
        nextRegenAt: hearts >= learner.maxHearts ? null : now + regenMs,
      },
      streak: {
        current:
          streakState.touchedToday || !learner.streak?.lastTouch
            ? learner.streak?.current ?? 0
            : streakState.newStreak,
        longest: learner.streak?.longest ?? 0,
        freezes: learner.streak?.freezes ?? 0,
        touchedToday: streakState.touchedToday,
        missedDay: streakState.missedDay,
        weeklyXp: learner.streak?.weeklyXp ?? 0,
        weeklyGoal: learner.streak?.weeklyGoal ?? 50,
      },
      settings: learner.settings ?? {
        sound: true,
        rain: true,
        reducedMotion: false,
        language: "pt-BR",
      },
      progress: { completedLessons, totalLessons },
      notices,
    };
  }

  return { snapshot };
}

const defaultGameState = createGameState();

/** Convenience over the default instance (system clock, global store). */
export function snapshot(opts?: { clock?: Clock }): Promise<GameSnapshot> {
  return opts?.clock
    ? createGameState({ clock: opts.clock }).snapshot()
    : defaultGameState.snapshot();
}
