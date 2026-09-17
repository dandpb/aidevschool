// Vertical Protocol — lesson-completion pipeline (server-side)
//
// Deep module: everything that happens when a lesson attempt is submitted
// lives here, inside one Prisma interactive transaction — heart regen and
// gating, grading, progress upsert, XP/gem rewards, streak touch with freeze
// consumption, activity logging, achievement sync, and the daily-challenge
// check. The HTTP routes are thin adapters that map the result to a response.
//
// mode "complete": costs hearts, awards XP + gems, touches the streak.
// mode "practice": requires a completed lesson, awards gems only.

import { db, type DbClient } from "@/lib/db";
import {
  getCurrentLearner,
  recomputeHearts,
  computeStreakState,
} from "@/lib/game";
import { syncAchievements } from "@/lib/achievement-sync";
import { ACHIEVEMENT_MAP, type AchievementDef } from "@/lib/achievements";
import { completeDailyChallenge } from "@/lib/daily-challenge";
import { gradeExercise, type Exercise } from "@/lib/grader";

export type LessonAttemptMode = "complete" | "practice";

export interface AchievementUnlockPayload {
  slug: string;
  title: string;
  emoji: string;
  gemReward: number;
  xpReward: number;
}

interface AttemptBase {
  ok: true;
  passed: boolean;
  correctCount: number;
  total: number;
  gemsGained: number;
  newAchievements: AchievementUnlockPayload[];
}

export interface CompleteLessonResult extends AttemptBase {
  stars: number;
  xpGained: number;
  heartsLost: number;
  streakTouched: boolean;
  streakBroke: boolean;
  newStreak: number;
  dailyChallengeAwarded: boolean;
  dailyChallengeGems: number;
}

export type PracticeLessonResult = AttemptBase;

export type LessonAttemptError =
  | { ok: false; error: "no-hearts"; status: 400; hearts: number }
  | { ok: false; error: "not-found"; status: 404 }
  | { ok: false; error: "not-completed"; status: 400 };

export type LessonAttemptResult =
  | CompleteLessonResult
  | PracticeLessonResult
  | LessonAttemptError;

// Run the achievement sync inside the pipeline transaction and return the
// freshly-unlocked badges in the wire shape the client toasts render.
async function syncAchievementPayloads(
  tx: DbClient
): Promise<AchievementUnlockPayload[]> {
  const sync = await syncAchievements(tx);
  return sync.newlyUnlocked
    .map((slug) => ACHIEVEMENT_MAP[slug])
    .filter((def): def is AchievementDef => Boolean(def))
    .map((def) => ({
      slug: def.slug,
      title: def.title,
      emoji: def.emoji,
      gemReward: def.gemReward,
      xpReward: def.xpReward,
    }));
}

export async function submitLessonAttempt(
  lessonId: string,
  answers: unknown[],
  mode: LessonAttemptMode,
  opts?: { now?: number }
): Promise<LessonAttemptResult> {
  // the clock lives at the seam: one timestamp drives the whole pipeline
  const now = opts?.now ?? Date.now();
  return db.$transaction(async (tx) => {
    const learner = await getCurrentLearner(tx);

    // Complete mode costs hearts: regen first (persisting if it changed),
    // then gate on the recomputed value.
    let hearts = learner.hearts;
    if (mode === "complete") {
      hearts = recomputeHearts(learner, now).hearts;
      if (hearts !== learner.hearts) {
        await tx.learner.update({
          where: { id: learner.id },
          data: { hearts, heartsUpdatedAt: new Date(now) },
        });
      }
      if (hearts <= 0) {
        return { ok: false, error: "no-hearts", status: 400, hearts } as const;
      }
    }

    const lesson = await tx.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      return { ok: false, error: "not-found", status: 404 } as const;
    }

    let exercises: Exercise[] = [];
    try {
      exercises = JSON.parse(lesson.exercises) as Exercise[];
    } catch {
      exercises = [];
    }

    const correctCount = exercises.filter((ex, i) =>
      gradeExercise(ex, answers[i])
    ).length;
    const total = exercises.length || 1;
    const accuracy = correctCount / total;
    const passed = accuracy >= 0.5;

    if (mode === "practice") {
      // Practice requires the lesson to be already completed.
      const progress = await tx.lessonProgress.findUnique({
        where: { learnerId_lessonId: { learnerId: learner.id, lessonId } },
      });
      if (!progress?.completed) {
        return { ok: false, error: "not-completed", status: 400 } as const;
      }

      // Practice rewards: gems by accuracy, no XP, no hearts lost.
      const gemsGained =
        accuracy >= 1 ? 3 : accuracy >= 0.66 ? 2 : accuracy >= 0.33 ? 1 : 0;

      await tx.lessonProgress.update({
        where: { learnerId_lessonId: { learnerId: learner.id, lessonId } },
        data: { attempts: { increment: 1 }, lastPlayed: new Date(now) },
      });
      if (gemsGained > 0) {
        await tx.learner.update({
          where: { id: learner.id },
          data: { gems: { increment: gemsGained } },
        });
      }
      await tx.activityLog.create({
        data: {
          learnerId: learner.id,
          type: "practice",
          detail: lesson.title,
          xpDelta: 0,
        },
      });

      // Practice can unlock achievements too (e.g. estrela-perfeita).
      const newAchievements = await syncAchievementPayloads(tx);
      return {
        ok: true,
        passed,
        correctCount,
        total,
        gemsGained,
        newAchievements,
      };
    }

    // --- complete mode ---

    let stars = 0;
    if (accuracy >= 1) stars = 3;
    else if (accuracy >= 0.66) stars = 2;
    else if (accuracy >= 0.33) stars = 1;

    const wrongCount = total - correctCount;
    const heartsLost = passed ? Math.min(hearts, wrongCount) : Math.min(hearts, 1);
    const newHearts = Math.max(0, hearts - heartsLost);

    const xpGained = passed
      ? Math.round(lesson.xpReward * (0.6 + 0.4 * accuracy))
      : Math.round(lesson.xpReward * 0.2 * accuracy);
    const gemsGained = passed ? 2 : 0;

    const existing = await tx.lessonProgress.findUnique({
      where: { learnerId_lessonId: { learnerId: learner.id, lessonId } },
    });
    const completed = passed;
    const bestScore = Math.max(existing?.bestScore ?? 0, correctCount);
    const bestStars = Math.max(existing?.stars ?? 0, stars);
    const attempts = (existing?.attempts ?? 0) + 1;

    await tx.lessonProgress.upsert({
      where: { learnerId_lessonId: { learnerId: learner.id, lessonId } },
      create: {
        learnerId: learner.id,
        lessonId,
        completed,
        stars: bestStars,
        bestScore,
        attempts,
        lastPlayed: new Date(now),
        completedAt: completed ? new Date(now) : null,
      },
      update: {
        completed: existing?.completed || completed,
        stars: bestStars,
        bestScore,
        attempts,
        lastPlayed: new Date(now),
        completedAt: existing?.completedAt ?? (completed ? new Date(now) : null),
      },
    });

    // Award XP + league XP + weekly XP.
    if (xpGained > 0) {
      await tx.learner.update({
        where: { id: learner.id },
        data: {
          xp: { increment: xpGained },
          leagueXp: { increment: xpGained },
          hearts: newHearts,
          heartsUpdatedAt: new Date(now),
          gems: { increment: gemsGained },
        },
      });
      if (learner.streak) {
        await tx.streak.update({
          where: { learnerId: learner.id },
          data: { weeklyXp: { increment: xpGained } },
        });
      }
    } else {
      await tx.learner.update({
        where: { id: learner.id },
        data: { hearts: newHearts, heartsUpdatedAt: new Date(now) },
      });
    }

    // Touch the streak on lesson completion (freeze consumed if a day was missed).
    const streakState = computeStreakState(
      learner.streak?.lastTouch ?? null,
      learner.streak?.current ?? 0,
      learner.streak?.freezes ?? 0,
      new Date(now)
    );
    let streakBroke = false;
    if (!streakState.touchedToday && passed) {
      const newCurrent = streakState.newStreak;
      const newLongest = Math.max(learner.streak?.longest ?? 0, newCurrent);
      await tx.streak.update({
        where: { learnerId: learner.id },
        data: {
          current: newCurrent,
          longest: newLongest,
          lastTouch: new Date(now),
          ...(streakState.freezeConsumed ? { freezes: { decrement: 1 } } : {}),
        },
      });
      if (streakState.freezeConsumed) {
        await tx.activityLog.create({
          data: {
            learnerId: learner.id,
            type: "streak_freeze_used",
            detail: "protected",
            xpDelta: 0,
          },
        });
      }
      streakBroke = streakState.missedDay;
    }

    await tx.activityLog.create({
      data: {
        learnerId: learner.id,
        type: "lesson_complete",
        detail: lesson.title,
        xpDelta: xpGained,
      },
    });

    // Achievements and the daily challenge only trigger on a pass.
    let newAchievements: AchievementUnlockPayload[] = [];
    let dailyChallengeAwarded = false;
    let dailyChallengeGems = 0;
    if (passed) {
      newAchievements = await syncAchievementPayloads(tx);
      const dc = await completeDailyChallenge(lesson.id, tx);
      if (dc.awarded) {
        dailyChallengeAwarded = true;
        dailyChallengeGems = dc.gemsGained;
      }
    }

    return {
      ok: true,
      passed,
      correctCount,
      total,
      stars,
      xpGained,
      heartsLost,
      gemsGained,
      streakTouched: !streakState.touchedToday && passed,
      streakBroke,
      newStreak:
        !streakState.touchedToday && passed
          ? streakState.newStreak
          : learner.streak?.current ?? 0,
      newAchievements,
      dailyChallengeAwarded,
      dailyChallengeGems,
    };
  });
}
