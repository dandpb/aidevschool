import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentLearner, recomputeHearts } from "@/lib/game";

export const dynamic = "force-dynamic";

// POST /api/heart/refill — spend gems to refill hearts (5 gems = full refill)
export async function POST() {
  const learner = await getCurrentLearner();
  const { hearts } = recomputeHearts(learner);
  // settle regen before deciding — consistent with the shop route
  if (hearts !== learner.hearts) {
    await db.learner.update({
      where: { id: learner.id },
      data: { hearts, heartsUpdatedAt: new Date() },
    });
  }

  if (hearts >= learner.maxHearts) {
    return NextResponse.json({ ok: true, hearts, gems: learner.gems });
  }

  if (learner.gems < 5) {
    return NextResponse.json(
      { ok: false, error: "no-gems", gems: learner.gems },
      { status: 400 }
    );
  }

  const updated = await db.learner.update({
    where: { id: learner.id },
    data: { hearts: learner.maxHearts, heartsUpdatedAt: new Date(), gems: { decrement: 5 } },
  });

  await db.activityLog.create({
    data: {
      learnerId: learner.id,
      type: "heart_refill",
      detail: "gems",
      xpDelta: 0,
    },
  });

  return NextResponse.json({
    ok: true,
    hearts: updated.hearts,
    gems: updated.gems,
  });
}
