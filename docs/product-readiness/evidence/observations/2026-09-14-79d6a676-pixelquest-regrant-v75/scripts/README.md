# QA observation scripts — re-grant v75 (AID-1943)

Scaffold da fase de observação independente do ciclo re-grant v75
(PR #430, branch `regrant/auto-20260914-35dd4193`, base main @ `35dd4193`;
despacho AID-1942; precedente v71 AID-1924).

- Escopo: use case `pixelquest-evidence-encounter` (3 cenários —
  `pixelquest-encounter-evidence`, `pixelquest-evidence-recovery`,
  `pixelquest-returning-evidence-handoff`). Demais use cases NÃO fazem parte
  deste re-anchor (lição v71 §3: entradas stale de outros use cases no
  aggregate derrubam claims publicadas).
- `pixelquest/obs-pixelquest.spec.ts` + `pixelquest/playwright-qa-v75.config.ts`:
  walk QA-authored (chromium headless sobre vite dev local no worktree),
  distinto das runs de producer (`pnpm run smoke` — 5 specs).
- Saídas esperadas do bundle: `ev/*.png`, `logs/walk-log-pixelquest.json`,
  `observations.json` (gitSha = árvore observada).
