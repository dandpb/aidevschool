import { NextResponse } from "next/server";
import { snapshot } from "@/lib/game-state";

export const dynamic = "force-dynamic";

// GET /api/state — thin adapter over the game-state module: serialize, nothing more.
export async function GET() {
  return NextResponse.json(await snapshot());
}
