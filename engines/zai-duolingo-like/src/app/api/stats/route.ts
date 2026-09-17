import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentLearner } from "@/lib/game";

export const dynamic = "force-dynamic";

// GET /api/stats — aggregate learner statistics for the profile dashboard
export async function GET() {
  const learner = await getCurrentLearner();

  const progress = await db.lessonProgress.findMany({
    where: { learnerId: learner.id },
  });
  const completed = progress.filter((p) => p.completed);

  const totalLessons = await db.lesson.count();
  const completedLessons = completed.length;

  // average accuracy: bestScore / total exercises per lesson (approx)
  // we don't store per-lesson exercise count, so use attempts vs stars
  const totalStars = completed.reduce((acc, p) => acc + p.stars, 0);
  const maxStars = completed.length * 3;
  const avgAccuracy =
    maxStars > 0 ? Math.round((totalStars / maxStars) * 100) : 0;

  const bestStreak = learner.streak?.longest ?? 0;
  const currentStreak = learner.streak?.current ?? 0;

  // gems earned from activity (sum of gem-related activity + achievement rewards)
  // simpler: total gems ever = current gems + gems spent (we don't track spent precisely)
  // so we show current gems + total from achievements
  const achievements = await db.achievement.findMany({
    where: { learnerId: learner.id },
  });

  // total XP earned (current xp is the source of truth)
  const totalXp = learner.xp;

  // lessons practiced (attempts - completions, since practice doesn't complete)
  const totalAttempts = progress.reduce((acc, p) => acc + p.attempts, 0);
  const practiceCount = Math.max(0, totalAttempts - completedLessons);

  // playground messages sent
  const playgroundCount = await db.chatThread.count({
    where: { learnerId: learner.id },
  });

  // achievements unlocked
  const achievementsUnlocked = achievements.length;

  return NextResponse.json({
    totalLessons,
    completedLessons,
    avgAccuracy,
    totalStars,
    maxStars,
    bestStreak,
    currentStreak,
    totalXp,
    practiceCount,
    playgroundCount,
    achievementsUnlocked,
    gems: learner.gems,
    league: learner.league,
  });
}
