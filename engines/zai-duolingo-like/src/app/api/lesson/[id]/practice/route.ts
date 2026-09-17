import { NextRequest, NextResponse } from "next/server";
import { submitLessonAttempt } from "@/lib/lesson-completion";

export const dynamic = "force-dynamic";

// POST /api/lesson/[id]/practice — thin adapter over the completion pipeline.
// Practice mode: redo a completed lesson. No hearts cost. Awards gems (not XP).
// body: { answers: unknown[] }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const answers: unknown[] = Array.isArray(body?.answers) ? body.answers : [];

  const result = await submitLessonAttempt(id, answers, "practice");
  if (!result.ok) {
    const { status, ...errorBody } = result;
    return NextResponse.json(errorBody, { status });
  }
  return NextResponse.json(result);
}
