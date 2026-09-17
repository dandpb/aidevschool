// POST /api/streak/milestone — claim gem rewards for streak milestones.

import { describe, it, beforeEach, expect } from "vitest";
import { POST } from "@/app/api/streak/milestone/route";
import { db } from "@/lib/db";
import { resetDatabase, seedBaseline, currentLearner, postJson } from "../helpers";

describe("POST /api/streak/milestone", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("streak 0 → 400 not-reached for milestone 3", async () => {
    await seedBaseline();
    const learner = await currentLearner();
    await db.streak.update({
      where: { learnerId: learner.id },
      data: { current: 0 },
    });

    const res = await POST(postJson({ milestone: 3 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("not-reached");
  });

  it("streak 7 → ok for milestone 3, gemsGained:8, learner gems +8", async () => {
    await seedBaseline();
    const learner = await currentLearner();
    await db.streak.update({
      where: { learnerId: learner.id },
      data: { current: 7 },
    });
    const gemsBefore = learner.gems;

    const res = await POST(postJson({ milestone: 3 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.milestone).toBe(3);
    expect(data.gemsGained).toBe(8);

    const after = await db.learner.findUniqueOrThrow({ where: { id: learner.id } });
    expect(after.gems).toBe(gemsBefore + 8);
  });

  it("claiming the same milestone twice → 400 already-claimed", async () => {
    await seedBaseline();
    const learner = await currentLearner();
    await db.streak.update({
      where: { learnerId: learner.id },
      data: { current: 7 },
    });

    const first = await POST(postJson({ milestone: 3 }));
    expect(first.status).toBe(200);

    const second = await POST(postJson({ milestone: 3 }));
    expect(second.status).toBe(400);
    const data = await second.json();
    expect(data.error).toBe("already-claimed");
  });

  it("milestone 999 → 400 invalid-milestone", async () => {
    await seedBaseline();
    const res = await POST(postJson({ milestone: 999 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("invalid-milestone");
  });
});