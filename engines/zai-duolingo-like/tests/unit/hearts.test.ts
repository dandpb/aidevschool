// Unit tests for heart regeneration (1 heart per HEART_REGEN_MINUTES since heartsUpdatedAt).

import { describe, expect, it } from "vitest";
import { HEART_REGEN_MINUTES, recomputeHearts } from "@/lib/game";

const REGEN_MS = HEART_REGEN_MINUTES * 60 * 1000;

function learnerWith(hearts: number, maxHearts: number, elapsedMs: number) {
  return {
    hearts,
    maxHearts,
    heartsUpdatedAt: new Date(Date.now() - elapsedMs),
  } as any;
}

describe("recomputeHearts", () => {
  it("does nothing when hearts are full", () => {
    expect(recomputeHearts(learnerWith(5, 5, 10 * REGEN_MS))).toEqual({
      hearts: 5,
      regenMs: 0,
    });
  });

  it("leaves hearts unchanged within one regen interval and reports the countdown", () => {
    const { hearts, regenMs } = recomputeHearts(
      learnerWith(3, 5, 5 * 60 * 1000)
    );
    expect(hearts).toBe(3);
    expect(regenMs).toBe(REGEN_MS - 5 * 60 * 1000);
  });

  it("regenerates one heart per full interval", () => {
    const { hearts } = recomputeHearts(
      learnerWith(3, 5, REGEN_MS + 30 * 1000)
    );
    expect(hearts).toBe(4);
  });

  it("caps at maxHearts and stops the countdown", () => {
    expect(recomputeHearts(learnerWith(1, 5, 10 * REGEN_MS))).toEqual({
      hearts: 5,
      regenMs: 0,
    });
  });
});
