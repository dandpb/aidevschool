// TEST FIXTURE — continuity scenario `dojotoday-returning-next-day` (AID-987/T1).
// Deterministic "day N+1" projection: the scheduler regenerated overnight —
// the U2 review that was due on day N was completed (streak reconciled to 4,
// next U2 review scheduled out), the overdue U0 review aged one more day, and
// the active unit stays consistent. Same base state as today.day-n.ts so the
// day-over-day delta is exactly the scheduler's regeneration.
import type { TodaySnapshot } from "../../src/types";

export const today: TodaySnapshot = {
  asOf: "2026-09-08",
  streak: {
    current: 4,
    longest: 4,
    freezesEquipped: 1,
    freezesMax: 2,
    lastGateDate: "2026-09-07",
  },
  curr: 0.0,
  activeUnit: {
    id: "U2-key-value-store",
    title: "KV WAREHOUSE: hash-map-backed CRUD with TTL expiration",
    project: "02_key_value_store",
    num: "02",
    state: "mastered",
    gameDir: "engines/voxelDojo/game-02-warehouse",
    diagnosticFile: "curriculum/02_key_value_store/docs/spec.md",
  },
  reviews: [
    {
      unitId: "U0-sonda-rate-limiter-robustness",
      title: "GATEKEEPER: token-bucket rate limiter robustness",
      dueIn: "overdue 45d",
      reason: "overdue",
      gameDir: "engines/pixelDojo",
      project: "01_rate_limiter",
    },
  ],
  masteredCount: 2,
  totalUnits: 2,
  nextProjectNum: "03",
  track: [
    {
      num: "01",
      title: "GATEKEEPER: token-bucket rate limiter robustness",
      gameDir: "engines/pixelDojo/pixel-quest",
      status: "mastered",
    },
    {
      num: "02",
      title: "KV WAREHOUSE: hash-map-backed CRUD with TTL expiration",
      gameDir: "engines/voxelDojo/game-02-warehouse",
      status: "mastered",
    },
    {
      num: "03",
      title: "Próxima unidade da trilha dev",
      gameDir: null,
      status: "available",
    },
  ],
};
