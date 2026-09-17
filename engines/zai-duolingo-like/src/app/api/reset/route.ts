import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentLearner } from "@/lib/game";

export const dynamic = "force-dynamic";

// POST /api/reset — wipe learner progress and restart fresh (cozy "new game")
export async function POST() {
  const learner = await getCurrentLearner();
  await db.lessonProgress.deleteMany({ where: { learnerId: learner.id } });
  await db.activityLog.deleteMany({ where: { learnerId: learner.id } });
  await db.learner.update({
    where: { id: learner.id },
    data: {
      xp: 0,
      hearts: 5,
      heartsUpdatedAt: new Date(),
      gems: 20,
      league: "bronze",
      leagueXp: 0,
      name: "Recruta",
    },
  });
  if (learner.streak) {
    await db.streak.update({
      where: { learnerId: learner.id },
      data: { current: 0, longest: 0, lastTouch: null, weeklyXp: 0 },
    });
  }
  return NextResponse.json({ ok: true });
}
