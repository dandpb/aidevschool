// POST /api/shop (heart-refill and streak-freeze) and POST /api/heart/refill.
// Asserts gems delta, hearts delta, streak.freezes delta, activity log rows, and
// error contracts (insufficient-gems, not-found, no-gems).

import { describe, it, beforeEach, expect } from "vitest";
import { POST as buy } from "@/app/api/shop/route";
import { POST as refill } from "@/app/api/heart/refill/route";
import { db } from "@/lib/db";
import { resetDatabase, seedBaseline, postJson } from "../helpers";

async function setLearner(updates: { hearts?: number; gems?: number }) {
  const learner = await db.learner.findFirstOrThrow({
    where: { NOT: { id: { startsWith: "rival-" } } },
  });
  return db.learner.update({
    where: { id: learner.id },
    data: { ...updates, heartsUpdatedAt: new Date() }, // fresh regen baseline: regen doesn't bump hearts
  });
}

describe("POST /api/shop heart-refill", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("with 3/5 hearts and 20 gems: ok, hearts=maxHearts, gems 20→15, logs activity", async () => {
    await seedBaseline();
    const before = await setLearner({ hearts: 3, gems: 20 });
    expect(before.gems).toBe(20);

    const res = await buy(postJson({ slug: "heart-refill" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.kind).toBe("heart-refill");
    expect(data.gems).toBe(15);

    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    expect(learner.hearts).toBe(learner.maxHearts);
    expect(learner.gems).toBe(15);

    const logs = await db.activityLog.findMany({
      where: { learnerId: learner.id, type: "heart_refill" },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
  });

  it("insufficient gems → 400 insufficient-gems", async () => {
    await seedBaseline();
    await setLearner({ hearts: 3, gems: 2 });

    const res = await buy(postJson({ slug: "heart-refill" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("insufficient-gems");
  });

  it("unknown slug → 404", async () => {
    await seedBaseline();
    const res = await buy(postJson({ slug: "not-an-item" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("not-found");
  });
});

describe("POST /api/shop streak-freeze", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("buys a streak freeze: freezes +1, gems -10", async () => {
    await seedBaseline();
    await setLearner({ gems: 20 });
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    const freezesBefore = (await db.streak.findUniqueOrThrow({ where: { learnerId: learner.id } }))
      .freezes;

    const res = await buy(postJson({ slug: "streak-freeze" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.kind).toBe("streak-freeze");
    expect(data.gems).toBe(10);

    const after = await db.learner.findUniqueOrThrow({ where: { id: learner.id } });
    expect(after.gems).toBe(10);

    const streak = await db.streak.findUniqueOrThrow({ where: { learnerId: learner.id } });
    expect(streak.freezes).toBe(freezesBefore + 1);
  });
});

describe("POST /api/heart/refill", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("with full hearts returns ok:true and leaves gems unchanged", async () => {
    await seedBaseline();
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    const gemsBefore = learner.gems;

    const res = await refill();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.hearts).toBe(learner.maxHearts);
    expect(data.gems).toBe(gemsBefore); // unchanged

    const after = await db.learner.findUniqueOrThrow({ where: { id: learner.id } });
    expect(after.gems).toBe(gemsBefore);
    // no activity log entry for "gems" refill when already full
    const logs = await db.activityLog.findMany({
      where: { learnerId: learner.id, type: "heart_refill", detail: "gems" },
    });
    expect(logs).toHaveLength(0);
  });

  it("with 2/5 hearts and 20 gems: hearts → 5, gems → 15", async () => {
    await seedBaseline();
    await setLearner({ hearts: 2, gems: 20 });

    const res = await refill();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.hearts).toBe(5);
    expect(data.gems).toBe(15);

    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    expect(learner.hearts).toBe(5);
    expect(learner.gems).toBe(15);
  });

  it("with 2/5 hearts and only 3 gems → 400", async () => {
    await seedBaseline();
    await setLearner({ hearts: 2, gems: 3 });

    const res = await refill();
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("no-gems");
  });
});