// GET /api/activity — cursor pagination over activityLog rows.

import { describe, it, beforeEach, expect } from "vitest";
import { GET } from "@/app/api/activity/route";
import { db } from "@/lib/db";
import { resetDatabase, seedBaseline, getReq } from "../helpers";

describe("GET /api/activity", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns 10 of 12 rows with hasMore:true and a nextCursor; cursor page returns remaining 2", async () => {
    await seedBaseline();
    const learner = await db.learner.findFirstOrThrow({
      where: { NOT: { id: { startsWith: "rival-" } } },
    });

    // Create 12 logs with deterministic increasing createdAt (so desc order is
    // oldest → newest → index 0 is newest).
    const base = Date.now();
    for (let i = 0; i < 12; i++) {
      await db.activityLog.create({
        data: {
          learnerId: learner.id,
          type: "lesson_complete",
          detail: `log-${i}`,
          xpDelta: 1,
          createdAt: new Date(base + i * 1000),
        },
      });
    }

    // First page: limit=10
    const first = await GET(getReq("http://localhost/api/activity?limit=10"));
    const firstData = await first.json();
    expect(first.status).toBe(200);
    expect(firstData.activity).toHaveLength(10);
    expect(firstData.hasMore).toBe(true);
    expect(typeof firstData.nextCursor).toBe("string");

    // Most-recent first: first detail is the last one inserted ("log-11").
    expect(firstData.activity[0].detail).toBe("log-11");
    expect(firstData.activity[9].detail).toBe("log-2");

    // Second page using the cursor
    const second = await GET(
      getReq(`http://localhost/api/activity?limit=10&cursor=${encodeURIComponent(firstData.nextCursor)}`),
    );
    const secondData = await second.json();
    expect(secondData.activity).toHaveLength(2);
    expect(secondData.hasMore).toBe(false);
    expect(secondData.nextCursor).toBeNull();
    expect(secondData.activity[0].detail).toBe("log-1");
    expect(secondData.activity[1].detail).toBe("log-0");
  });

  it("unparseable cursor → 400 invalid-cursor (never a 500)", async () => {
    await seedBaseline();
    const res = await GET(
      getReq("http://localhost/api/activity?cursor=nao-e-uma-data"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid-cursor");
  });
});