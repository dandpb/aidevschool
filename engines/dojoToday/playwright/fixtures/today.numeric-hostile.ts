// TEST FIXTURE — numeric-fields escape guard (AID-2205, follow-up do PR #460).
// Projeção HOSTIL: payloads HTML em campos numericamente tipados do read model
// (streak.current/freezesMax, masteredCount, totalUnits). Simula o pior caso
// de defesa em profundidade — read model corrompido no build — sem tocar o
// módulo gerado (src/data/today.ts segue canônico); servido pela seam
// DOJOTODAY_TODAY_MODULE (alias ./data/today no vite.config.ts).
//
// Branch-gating deliberado: `current` hostil é string → `s.current > 0` dá
// NaN > 0 = false → headline/sub caem no fallback "Quebre o gelo hoje" e o
// payload de `current`/`longest` NÃO renderiza nesta projeção (o fallback é o
// comportamento correto, não XSS). A guarda do `escapeHtml(s.longest)` com
// streak acesa vive na projeção irmã today.numeric-hostile-record.ts.
import type { TodaySnapshot } from "../../src/types";

export const HOSTILE_CURRENT = '<img src=x onerror="window.__xssCurrent=1">';
export const HOSTILE_FREEZES_MAX = '2" onmouseover="window.__xssTitle=1';
export const HOSTILE_MASTERED = '<img src=x onerror="window.__xssMastered=1">';
export const HOSTILE_TOTAL = '18<img src=x onerror="window.__xssTotal=1">';

// O fixture viola de propósito os tipos numéricos (é isso que o guard
// exercita); a quebra de tipo é explícita e confinada a este arquivo de teste.
const hostileStreak = {
  current: HOSTILE_CURRENT,
  longest: 4,
  freezesEquipped: 1,
  freezesMax: HOSTILE_FREEZES_MAX,
  lastGateDate: "2026-09-06",
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
  masteredCount: HOSTILE_MASTERED,
  totalUnits: HOSTILE_TOTAL,
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
