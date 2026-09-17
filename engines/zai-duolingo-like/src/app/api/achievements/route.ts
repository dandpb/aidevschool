import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentLearner } from "@/lib/game";
import { ACHIEVEMENTS } from "@/lib/achievements";

export const dynamic = "force-dynamic";

// GET /api/achievements — read-only. Awards happen inside mutation pipelines
// (lesson completion, playground save); a read never mutates the learner.
export async function GET() {
  const learner = await getCurrentLearner();

  const owned = await db.achievement.findMany({
    where: { learnerId: learner.id },
    select: { slug: true, unlockedAt: true },
  });
  const ownedMap = new Map(owned.map((a) => [a.slug, a.unlockedAt]));

  const list = ACHIEVEMENTS.map((def) => ({
    ...def,
    unlocked: ownedMap.has(def.slug),
    unlockedAt: ownedMap.get(def.slug) ?? null,
  }));

  return NextResponse.json({
    achievements: list,
    totalUnlocked: list.filter((a) => a.unlocked).length,
    total: ACHIEVEMENTS.length,
  });
}
