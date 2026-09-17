import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentLearner, recomputeHearts } from "@/lib/game";
import { SHOP_BY_SLUG } from "@/lib/shop-catalog";

export const dynamic = "force-dynamic";

// POST /api/shop — buy an item
// body: { slug: string }
export async function POST(req: NextRequest) {
  const learner = await getCurrentLearner();
  const body = await req.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug : "";
  const item = SHOP_BY_SLUG[slug];
  if (!item) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  if (learner.gems < item.cost) {
    return NextResponse.json(
      {
        ok: false,
        error: "insufficient-gems",
        gems: learner.gems,
        cost: item.cost,
      },
      { status: 400 }
    );
  }

  if (item.kind === "heart-refill") {
    // settle heart regen before charging gems — regen is settled automatically
    // on snapshot reads, but mutations must settle it explicitly
    const { hearts } = recomputeHearts(learner);
    if (hearts !== learner.hearts) {
      await db.learner.update({
        where: { id: learner.id },
        data: { hearts, heartsUpdatedAt: new Date() },
      });
    }
    if (hearts >= learner.maxHearts) {
      return NextResponse.json(
        { ok: false, error: "hearts-full" },
        { status: 400 }
      );
    }
    await db.learner.update({
      where: { id: learner.id },
      data: {
        gems: { decrement: item.cost },
        hearts: learner.maxHearts,
        heartsUpdatedAt: new Date(),
      },
    });
    await db.activityLog.create({
      data: {
        learnerId: learner.id,
        type: "heart_refill",
        detail: "shop",
        xpDelta: 0,
      },
    });
    return NextResponse.json({
      ok: true,
      kind: "heart-refill",
      gems: learner.gems - item.cost,
    });
  }

  if (item.kind === "streak-freeze") {
    // decrement gems, increment freezes on the streak row, log activity
    await db.learner.update({
      where: { id: learner.id },
      data: { gems: { decrement: item.cost } },
    });
    await db.streak.upsert({
      where: { learnerId: learner.id },
      update: { freezes: { increment: 1 } },
      create: { learnerId: learner.id, freezes: 1 },
    });
    await db.activityLog.create({
      data: {
        learnerId: learner.id,
        type: "streak_freeze_owned",
        detail: "shop",
        xpDelta: 0,
      },
    });
    return NextResponse.json({
      ok: true,
      kind: "streak-freeze",
      gems: learner.gems - item.cost,
    });
  }

  return NextResponse.json({ ok: false, error: "unknown-kind" }, { status: 400 });
}
