import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentLearner } from "@/lib/game";

export const dynamic = "force-dynamic";

// POST /api/streak/goal — set the learner's weekly XP goal
// body: { goal: 50 | 100 | 150 | 200 }
export async function POST(req: NextRequest) {
  const learner = await getCurrentLearner();
  const body = await req.json().catch(() => ({}));
  const goal = typeof body.goal === "number" ? body.goal : 0;

  const ALLOWED_GOALS = [50, 100, 150, 200];
  if (!ALLOWED_GOALS.includes(goal)) {
    return NextResponse.json(
      { ok: false, error: "invalid-goal" },
      { status: 400 }
    );
  }

  // getCurrentLearner creates streak+settings for new learners, but a row
  // can still be missing on legacy data — mirror the settings route pattern.
  if (!learner.streak) {
    await db.streak.create({
      data: { learnerId: learner.id, weeklyGoal: goal },
    });
  } else {
    await db.streak.update({
      where: { learnerId: learner.id },
      data: { weeklyGoal: goal },
    });
  }

  return NextResponse.json({ ok: true, weeklyGoal: goal });
}
