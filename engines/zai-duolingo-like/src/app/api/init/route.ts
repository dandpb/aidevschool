import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentLearner } from "@/lib/game";

export const dynamic = "force-dynamic";

// POST /api/init — set the learner's name and chosen narrative path
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim().slice(0, 24)
      : "Recruta";
  const path = body.path === "silicon-shrine" ? "silicon-shrine" : "neon-syntax";

  const learner = await getCurrentLearner();
  const updated = await db.learner.update({
    where: { id: learner.id },
    data: { name, path },
  });

  return NextResponse.json({ ok: true, learner: updated });
}
