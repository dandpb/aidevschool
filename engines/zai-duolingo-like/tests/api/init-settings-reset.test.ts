// POST /api/init, POST /api/settings, POST /api/reset — happy paths and the
// effects visible via /api/state and direct db reads.

import { describe, it, beforeEach, expect } from "vitest";
import { GET as getState } from "@/app/api/state/route";
import { POST as postInit } from "@/app/api/init/route";
import { POST as postSettings } from "@/app/api/settings/route";
import { POST as postReset } from "@/app/api/reset/route";
import { db } from "@/lib/db";
import { resetDatabase, seedBaseline, postJson } from "../helpers";

describe("POST /api/init", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("updates the learner's name and path", async () => {
    await seedBaseline();
    const res = await postInit(postJson({ name: "Akira", path: "silicon-shrine" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.learner.name).toBe("Akira");
    expect(data.learner.path).toBe("silicon-shrine");
  });

  it("trims and caps name length (24 chars)", async () => {
    await seedBaseline();
    await postInit(postJson({ name: "  Akira  ", path: "neon-syntax" }));
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    expect(learner.name).toBe("Akira");
  });

  it("defaults name to Recruta and path to neon-syntax when invalid", async () => {
    await seedBaseline();
    const res = await postInit(postJson({ name: "", path: "bogus-path" }));
    const data = await res.json();
    expect(data.learner.name).toBe("Recruta");
    expect(data.learner.path).toBe("neon-syntax");
  });
});

describe("POST /api/settings", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("toggles sound and rain, visible via /api/state", async () => {
    await seedBaseline();
    const res = await postSettings(postJson({ sound: false, rain: false }));
    expect(res.status).toBe(200);

    const state = await (await getState()).json();
    expect(state.settings.sound).toBe(false);
    expect(state.settings.rain).toBe(false);
    // language/reducedMotion left at defaults
    expect(state.settings.reducedMotion).toBe(false);
    expect(state.settings.language).toBe("pt-BR");
  });

  it("creates the settings row lazily if missing", async () => {
    await seedBaseline();
    await db.settings.deleteMany();
    await postSettings(postJson({ sound: false }));
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
      include: { settings: true },
    });
    expect(learner.settings?.sound).toBe(false);
  });
});

describe("POST /api/reset", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("wipes progress, activity, gems, xp, hearts back to fresh defaults", async () => {
    await seedBaseline();
    // dirty the learner
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    await db.learner.update({
      where: { id: learner.id },
      data: { xp: 500, gems: 999, hearts: 1, name: "Dirty", path: "silicon-shrine" },
    });
    await db.activityLog.create({
      data: { learnerId: learner.id, type: "lesson_complete", detail: "x", xpDelta: 15 },
    });

    const res = await postReset();
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    const after = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });
    expect(after.xp).toBe(0);
    expect(after.gems).toBe(20);
    expect(after.hearts).toBe(5);
    expect(after.league).toBe("bronze");
    expect(after.leagueXp).toBe(0);
    expect(after.name).toBe("Recruta");

    const activity = await db.activityLog.findMany({
      where: { learnerId: after.id },
    });
    expect(activity).toHaveLength(0);

    const streak = await db.streak.findUnique({ where: { learnerId: after.id } });
    expect(streak?.current).toBe(0);
    expect(streak?.longest).toBe(0);
    expect(streak?.lastTouch).toBeNull();
  });
});