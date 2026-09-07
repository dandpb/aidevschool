// TEST FIXTURE — continuity scenario `dojotoday-returning-next-day` (AID-987/T1).
// Deterministic "day N" projection for the 2-build readiness harness. This is
// NOT the generated read model (src/data/today.ts stays canonical and
// untouched); the harness serves it through the DOJOTODAY_TODAY_MODULE alias.
import type { TodaySnapshot } from "../../src/types";

export const today: TodaySnapshot = {
  asOf: "2026-09-07",
  streak: {
    current: 3,
    longest: 4,
    freezesEquipped: 1,
    freezesMax: 2,
    lastGateDate: "2026-09-06",
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
      dueIn: "overdue 44d",
      reason: "overdue",
      gameDir: "engines/pixelDojo",
      project: "01_rate_limiter",
    },
    {
      unitId: "U2-key-value-store",
      title: "KV WAREHOUSE: hash-map-backed CRUD with TTL expiration",
      dueIn: "due hoje",
      reason: "due",
      gameDir: "engines/voxelDojo/game-02-warehouse",
      project: "02_key_value_store",
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
