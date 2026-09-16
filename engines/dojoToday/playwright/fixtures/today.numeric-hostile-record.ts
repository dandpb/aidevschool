// TEST FIXTURE — numeric-fields escape guard (AID-2205, follow-up do PR #460).
// Projeção irmã de today.numeric-hostile.ts com a streak ACESA (current=3
// válido) e o recorde (`longest`) hostil: só assim o branch `s.current > 0`
// renderiza `Recorde: ${escapeHtml(s.longest)}` e a guarda cobre a remoção
// isolada do escapeHtml(s.longest) do diff do PR #460. Resto do snapshot
// benigno e determinístico (mesma base dos fixtures day-n).
import type { TodaySnapshot } from "../../src/types";

export const HOSTILE_LONGEST = "<script>window.__xssLongest=1</script>";

const hostileStreak = {
  current: 3,
  longest: HOSTILE_LONGEST,
  freezesEquipped: 1,
  freezesMax: 2,
  lastGateDate: "2026-09-15",
} as unknown as TodaySnapshot["streak"];

export const today = {
  asOf: "2026-09-16",
  streak: hostileStreak,
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
  reviews: [],
  masteredCount: 2,
  totalUnits: 18,
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
} as unknown as TodaySnapshot;
