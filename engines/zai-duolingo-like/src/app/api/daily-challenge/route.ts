import { NextResponse } from "next/server";
import { getDailyChallenge } from "@/lib/daily-challenge";

export const dynamic = "force-dynamic";

// GET /api/daily-challenge — returns the learner's current daily challenge
export async function GET() {
  const challenge = await getDailyChallenge();
  return NextResponse.json({ challenge });
}
