import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentLearner } from "@/lib/game";
import { syncAchievements } from "@/lib/achievement-sync";
import { ACHIEVEMENT_MAP, type AchievementDef } from "@/lib/achievements";

export const dynamic = "force-dynamic";

// POST /api/playground/save
// body: { message: string, reply: string, threadId?: string }
// Persists a chat exchange to the learner's thread and syncs achievements.
// The LLM reply itself is obtained by the frontend via the mini-service gateway.
export async function POST(req: NextRequest) {
  const learner = await getCurrentLearner();
  const body = await req.json().catch(() => ({}));
  const message: string =
    typeof body.message === "string" ? body.message.slice(0, 2000) : "";
  const reply: string =
    typeof body.reply === "string" ? body.reply.slice(0, 8000) : "";

  if (!message.trim() || !reply.trim()) {
    return NextResponse.json(
      { ok: false, error: "empty" },
      { status: 400 }
    );
  }

  let threadId: string | undefined =
    typeof body.threadId === "string" ? body.threadId : undefined;

  const newExchange = [
    { role: "user", content: message },
    { role: "assistant", content: reply },
  ];

  if (threadId) {
    // append to existing thread
    const existing = await db.chatThread.findFirst({
      where: { id: threadId, learnerId: learner.id },
    });
    if (existing) {
      let prev: { role: string; content: string }[] = [];
      try {
        prev = JSON.parse(existing.messages);
      } catch {
        prev = [];
      }
      // Scoped write: even if the ownership check above is ever weakened,
      // the write itself can only touch the current learner's thread.
      await db.chatThread.updateMany({
        where: { id: threadId, learnerId: learner.id },
        data: {
          messages: JSON.stringify([...prev, ...newExchange]),
          updatedAt: new Date(),
        },
      });
    } else {
      threadId = undefined; // fall through to create
    }
  }

  if (!threadId) {
    const thread = await db.chatThread.create({
      data: {
        learnerId: learner.id,
        title: message.slice(0, 40),
        messages: JSON.stringify(newExchange),
      },
    });
    threadId = thread.id;
  }

  const sync = await syncAchievements();
  const newAchievements = sync.newlyUnlocked
    .map((slug) => ACHIEVEMENT_MAP[slug])
    .filter((def): def is AchievementDef => Boolean(def))
    .map((def) => ({
      slug: def.slug,
      title: def.title,
      emoji: def.emoji,
      gemReward: def.gemReward,
      xpReward: def.xpReward,
    }));

  return NextResponse.json({
    ok: true,
    threadId,
    newAchievements,
  });
}
