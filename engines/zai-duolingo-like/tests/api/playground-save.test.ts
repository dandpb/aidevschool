// POST /api/playground/save — creates a chatThread, appends messages on second
// save, 400 on empty, falls through to a new thread when given an unknown
// threadId, and unlocks "explorador-playground" after first save.

import { describe, it, beforeEach, expect } from "vitest";
import { POST } from "@/app/api/playground/save/route";
import { db } from "@/lib/db";
import { resetDatabase, seedBaseline, postJson } from "../helpers";

describe("POST /api/playground/save", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("first save: ok, threadId returned, chatThread row in db with the exchange", async () => {
    await seedBaseline();
    const res = await POST(
      postJson({ message: "olá", reply: "oi, humano" }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(typeof data.threadId).toBe("string");

    const thread = await db.chatThread.findUniqueOrThrow({ where: { id: data.threadId } });
    const messages = JSON.parse(thread.messages);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ role: "user", content: "olá" });
    expect(messages[1]).toEqual({ role: "assistant", content: "oi, humano" });
  });

  it("second save with same threadId: messages array grows to 4 entries", async () => {
    await seedBaseline();
    const first = await (await POST(postJson({ message: "olá", reply: "oi" }))).json();
    const threadId = first.threadId as string;

    const second = await POST(
      postJson({ message: "como vai?", reply: "bem, obrigado", threadId }),
    );
    expect(second.status).toBe(200);

    const thread = await db.chatThread.findUniqueOrThrow({ where: { id: threadId } });
    const messages = JSON.parse(thread.messages);
    expect(messages).toHaveLength(4);
    expect(messages[2].content).toBe("como vai?");
    expect(messages[3].content).toBe("bem, obrigado");
  });

  it("empty message → 400", async () => {
    await seedBaseline();
    const res = await POST(postJson({ message: "", reply: "algo" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("empty");
  });

  it("empty reply → 400", async () => {
    await seedBaseline();
    const res = await POST(postJson({ message: "algo", reply: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("empty");
  });

  it("unknown threadId: creates a NEW thread (does not append to a non-owned thread)", async () => {
    await seedBaseline();
    // First save so the learner exists
    await POST(postJson({ message: "a", reply: "b" }));

    const res = await POST(
      postJson({ message: "x", reply: "y", threadId: "thread-that-does-not-exist" }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(typeof data.threadId).toBe("string");
    expect(data.threadId).not.toBe("thread-that-does-not-exist");

    // the new thread should contain only the new exchange
    const thread = await db.chatThread.findUniqueOrThrow({ where: { id: data.threadId } });
    const messages = JSON.parse(thread.messages);
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe("x");
    expect(messages[1].content).toBe("y");
  });

  it("after first save, 'explorador-playground' achievement is unlocked", async () => {
    await seedBaseline();
    await POST(postJson({ message: "olá", reply: "oi" }));

    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    const ach = await db.achievement.findUnique({
      where: { learnerId_slug: { learnerId: learner.id, slug: "explorador-playground" } },
    });
    expect(ach).not.toBeNull();
  });

  it("a thread owned by another learner is NEVER modified — route falls through to a new thread", async () => {
    await seedBaseline();
    await POST(postJson({ message: "a", reply: "b" }));

    // A rival owns a thread; getCurrentLearner never returns rival- learners.
    const rival = await db.learner.create({
      data: { id: "rival-ana", name: "Ana", path: "neon-syntax" },
    });
    const otherThread = await db.chatThread.create({
      data: {
        learnerId: rival.id,
        title: "segredo",
        messages: JSON.stringify([{ role: "user", content: "privado" }]),
      },
    });

    const res = await POST(
      postJson({ message: "x", reply: "y", threadId: otherThread.id }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.threadId).not.toBe(otherThread.id);

    const untouched = await db.chatThread.findUniqueOrThrow({
      where: { id: otherThread.id },
    });
    expect(JSON.parse(untouched.messages)).toHaveLength(1);
    expect(untouched.title).toBe("segredo");
  });
});