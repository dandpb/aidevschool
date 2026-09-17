import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentLearner } from "@/lib/game";

export const dynamic = "force-dynamic";

// POST /api/streak/milestone — claim the gem reward for a streak milestone
// body: { milestone: number }
export async function POST(req: NextRequest) {
  const learner = await getCurrentLearner();
  const body = await req.json().catch(() => ({}));
  const milestone = typeof body.milestone === "number" ? body.milestone : 0;

  const MILESTONE_REWARDS: Record<number, number> = {
    3: 8,
    7: 20,
    14: 40,
    30: 100,
    50: 150,
    100: 300,
  };

  const reward = MILESTONE_REWARDS[milestone];
  if (!reward) {
    return NextResponse.json({ ok: false, error: "invalid-milestone" }, { status: 400 });
  }

  // verify the learner's streak actually reached this milestone
  if ((learner.streak?.current ?? 0) < milestone) {
    return NextResponse.json(
      { ok: false, error: "not-reached" },
      { status: 400 }
    );
  }

  // check if already claimed (activity log entry)
  const existing = await db.activityLog.findFirst({
    where: {
      learnerId: learner.id,
      type: "streak_milestone",
      detail: String(milestone),
    },
  });
  if (existing) {
    return NextResponse.json({ ok: false, error: "already-claimed" }, { status: 400 });
  }

  // award gems + log
  await db.learner.update({
    where: { id: learner.id },
    data: { gems: { increment: reward } },
  });
  await db.activityLog.create({
    data: {
      learnerId: learner.id,
      type: "streak_milestone",
      detail: String(milestone),
      xpDelta: 0,
    },
  });

  return NextResponse.json({ ok: true, milestone, gemsGained: reward });
}
