import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentLearner } from "@/lib/game";

export const dynamic = "force-dynamic";

// GET /api/activity?cursor=<iso>&limit=<n> — paginated learner activity
// Returns the most recent events first. Uses cursor-based pagination:
// pass the oldest item's createdAt as `cursor` to fetch the next page.
export async function GET(req: NextRequest) {
  const learner = await getCurrentLearner();
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
  );

  const where: { learnerId: string; createdAt?: { lt: Date } } = {
    learnerId: learner.id,
  };
  if (cursor) {
    const cursorDate = new Date(cursor);
    if (Number.isNaN(cursorDate.getTime())) {
      return NextResponse.json(
        { ok: false, error: "invalid-cursor" },
        { status: 400 }
      );
    }
    where.createdAt = { lt: cursorDate };
  }

  const logs = await db.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1, // fetch one extra to know if there's a next page
  });

  const hasMore = logs.length > limit;
  const items = (hasMore ? logs.slice(0, limit) : logs).map((l) => ({
    id: l.id,
    type: l.type,
    detail: l.detail,
    xpDelta: l.xpDelta,
    createdAt: l.createdAt.toISOString(),
  }));

  const nextCursor = hasMore && items.length > 0
    ? items[items.length - 1].createdAt
    : null;

  return NextResponse.json({
    activity: items,
    hasMore,
    nextCursor,
  });
}
