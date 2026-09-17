// Vertical Protocol — Daily Challenge helper (server-side)

import { db, type DbClient } from "@/lib/db";
import { getCurrentLearner } from "@/lib/game";
import { isLessonUnlocked } from "@/lib/lesson-unlock";

// Returns YYYY-MM-DD in the learner's local timezone (using server timezone).
function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Pick a deterministic-ish "random" lesson for the day from unlocked lessons.
// We rotate through lessons based on the day-of-year to feel varied but stable
// within a single day.
function pickLessonForDay(allLessonIds: string[], dayKey: string): string | null {
  if (allLessonIds.length === 0) return null;
  // hash the dayKey to a number
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) {
    hash = (hash * 31 + dayKey.charCodeAt(i)) >>> 0;
  }
  const idx = hash % allLessonIds.length;
  return allLessonIds[idx];
}

export interface DailyChallengeState {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  moduleAccent: string;
  moduleIcon: string;
  completed: boolean;
  completedAt: string | null;
  dayKey: string;
  rewardGems: number;
  lessonCompleted: boolean; // whether the lesson itself is completed
  lessonUnlocked: boolean;
}

export const DAILY_CHALLENGE_REWARD = 5; // bonus gems

// Get the learner's current daily challenge, assigning/rotating if needed.
export async function getDailyChallenge(): Promise<DailyChallengeState | null> {
  const learner = await getCurrentLearner();
  const today = todayKey();

  // fetch all lessons with module info
  const modules = await db.module.findMany({
    orderBy: { order: "asc" },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  const allLessons = modules.flatMap((m) =>
    m.lessons.map((l) => ({ lesson: l, module: m }))
  );
  if (allLessons.length === 0) return null;

  // check existing daily challenge
  let dc = await db.dailyChallenge.findUnique({
    where: { learnerId: learner.id },
  });

  // progress map to know which lessons are unlocked
  const progress = await db.lessonProgress.findMany({
    where: { learnerId: learner.id },
  });
  const completedSet = new Set(
    progress.filter((p) => p.completed).map((p) => p.lessonId)
  );

  // if no dc, or it's from a previous day, assign a new one
  if (!dc || dc.dayKey !== today) {
    // pick from unlocked, not-yet-completed lessons if possible; else any unlocked
    const unlockedLessonIds = allLessons
      .filter(({ lesson, module }) => {
        const moduleIdx = modules.findIndex((m) => m.id === module.id);
        const lessonIdx = module.lessons.findIndex((l) => l.id === lesson.id);
        return isLessonUnlocked(modules, completedSet, moduleIdx, lessonIdx);
      })
      .map(({ lesson }) => lesson.id);

    // prefer incomplete unlocked lessons; fall back to any unlocked; else any lesson
    let candidates = unlockedLessonIds.filter((id) => !completedSet.has(id));
    if (candidates.length === 0) candidates = unlockedLessonIds;
    if (candidates.length === 0) candidates = allLessons.map(({ lesson }) => lesson.id);

    const lessonId = pickLessonForDay(candidates, today) ?? candidates[0];

    dc = await db.dailyChallenge.upsert({
      where: { learnerId: learner.id },
      update: {
        lessonId,
        completed: false,
        completedAt: null,
        dayKey: today,
        assignedAt: new Date(),
      },
      create: {
        learnerId: learner.id,
        lessonId,
        dayKey: today,
      },
    });
  }

  // find the lesson + module details
  const found = allLessons.find(({ lesson }) => lesson.id === dc!.lessonId);
  if (!found) return null;

  return {
    lessonId: dc.lessonId,
    lessonTitle: found.lesson.title,
    moduleTitle: found.module.title,
    moduleAccent: found.module.accent,
    moduleIcon: found.module.icon,
    completed: dc.completed,
    completedAt: dc.completedAt?.toISOString() ?? null,
    dayKey: dc.dayKey,
    rewardGems: DAILY_CHALLENGE_REWARD,
    lessonCompleted: completedSet.has(dc.lessonId),
    lessonUnlocked: true, // we picked from unlocked
  };
}

// Mark the daily challenge as completed (called when the assigned lesson is completed).
// Awards the bonus gems. Returns whether this was a new completion.
export async function completeDailyChallenge(
  lessonId: string,
  client: DbClient = db
): Promise<{ awarded: boolean; gemsGained: number }> {
  const learner = await getCurrentLearner(client);
  const today = todayKey();

  const dc = await client.dailyChallenge.findUnique({
    where: { learnerId: learner.id },
  });
  if (!dc || dc.lessonId !== lessonId || dc.dayKey !== today) {
    return { awarded: false, gemsGained: 0 };
  }
  if (dc.completed) {
    return { awarded: false, gemsGained: 0 };
  }

  // Sequential ops on the passed client: when called from inside the
  // lesson-completion transaction these join it atomically.
  await client.dailyChallenge.update({
    where: { id: dc.id },
    data: { completed: true, completedAt: new Date() },
  });
  await client.learner.update({
    where: { id: learner.id },
    data: { gems: { increment: DAILY_CHALLENGE_REWARD } },
  });
  await client.activityLog.create({
    data: {
      learnerId: learner.id,
      type: "daily_challenge",
      detail: "Desafio diário completo",
      xpDelta: 0,
    },
  });

  return { awarded: true, gemsGained: DAILY_CHALLENGE_REWARD };
}
