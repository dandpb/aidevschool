import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentLearner } from "@/lib/game";

export const dynamic = "force-dynamic";

// POST /api/settings — update cozy settings
export async function POST(req: NextRequest) {
  const learner = await getCurrentLearner();
  const body = await req.json().catch(() => ({}));

  const sound = typeof body.sound === "boolean" ? body.sound : undefined;
  const rain = typeof body.rain === "boolean" ? body.rain : undefined;
  const reducedMotion =
    typeof body.reducedMotion === "boolean" ? body.reducedMotion : undefined;

  const data: { sound?: boolean; rain?: boolean; reducedMotion?: boolean } = {};
  if (sound !== undefined) data.sound = sound;
  if (rain !== undefined) data.rain = rain;
  if (reducedMotion !== undefined) data.reducedMotion = reducedMotion;

  if (!learner.settings) {
    await db.settings.create({
      data: { learnerId: learner.id, ...data },
    });
  } else {
    await db.settings.update({
      where: { learnerId: learner.id },
      data,
    });
  }

  return NextResponse.json({ ok: true });
}
