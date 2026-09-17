// POST /api/streak/goal — set the learner's weekly XP goal.

import { describe, it, beforeEach, expect } from "vitest";
import { POST } from "@/app/api/streak/goal/route";
import { db } from "@/lib/db";
import { snapshot } from "@/lib/game-state";
import {
  resetDatabase,
  seedBaseline,
  postJson,
} from "../helpers";

describe("POST /api/streak/goal", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("valid goal → 200 with weeklyGoal and persisted to the streak row", async () => {
    const learner = await seedBaseline();
    expect(learner.streak?.weeklyGoal).toBe(50); // schema default

    const res = await POST(postJson({ goal: 100 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.weeklyGoal).toBe(100);

    const streak = await db.streak.findUniqueOrThrow({
      where: { learnerId: learner.id },
    });
    expect(streak.weeklyGoal).toBe(100);
  });

  it("goal outside the allowlist → 400 invalid-goal, nothing persisted", async () => {
    const learner = await seedBaseline();

    const res = await POST(postJson({ goal: 75 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid-goal");

    const streak = await db.streak.findUniqueOrThrow({
      where: { learnerId: learner.id },
    });
    expect(streak.weeklyGoal).toBe(50);
  });

  it("missing or non-numeric goal → 400 invalid-goal", async () => {
    await seedBaseline();

    const empty = await POST(postJson({}));
    expect(empty.status).toBe(400);
    expect((await empty.json()).error).toBe("invalid-goal");

    const text = await POST(postJson({ goal: "cem" }));
    expect(text.status).toBe(400);
    expect((await text.json()).error).toBe("invalid-goal");
  });

  it("idempotent: setting the same goal twice succeeds both times", async () => {
    await seedBaseline();

    const first = await POST(postJson({ goal: 150 }));
    expect(first.status).toBe(200);
    const second = await POST(postJson({ goal: 150 }));
    expect(second.status).toBe(200);
    expect((await second.json()).weeklyGoal).toBe(150);
  });

  it("the snapshot seam reflects the new weekly goal", async () => {
    await seedBaseline();

    const before = await snapshot();
    expect(before.streak.weeklyGoal).toBe(50);

    const res = await POST(postJson({ goal: 200 }));
    expect(res.status).toBe(200);

    const after = await snapshot();
    expect(after.streak.weeklyGoal).toBe(200);
  });

  it("learner without a streak row → creates it instead of failing", async () => {
    const learner = await seedBaseline();
    await db.streak.delete({ where: { learnerId: learner.id } });

    const res = await POST(postJson({ goal: 100 }));
    expect(res.status).toBe(200);
    expect((await res.json()).weeklyGoal).toBe(100);

    const streak = await db.streak.findUniqueOrThrow({
      where: { learnerId: learner.id },
    });
    expect(streak.weeklyGoal).toBe(100);
  });
});
