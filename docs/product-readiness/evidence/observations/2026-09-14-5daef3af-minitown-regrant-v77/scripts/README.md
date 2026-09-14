# QA observation scripts — re-grant v77 (AID-1954)

Scaffold da fase de observação independente do ciclo re-grant v77
(PR #432, branch `regrant/auto-20260914-974ef10d`, base main @ `974ef10d`;
despacho AID-1953→AID-1954; precedentes v71 AID-1924 / v75 AID-1943).

- Escopo: use case `minitown-explore-only` (1 cenário — `minitown-explore-only`),
  stale pós-merge PR #429 (fonte `engines/miniTown/src/sim/paths.ts` mudou ⇒
  fingerprint stale por design do gate). Demais use cases NÃO fazem parte
  deste re-anchor (lição v71 §3: entradas de outros use cases no aggregate
  derrubam claims publicadas).
- `minitown/obs-minitown.spec.ts` + `minitown/playwright-qa-v77.config.ts`:
  walk QA-authored (chromium headless sobre vite dev local no worktree),
  distinto das runs de producer (`pnpm run smoke`).
- Saídas esperadas do bundle: `ev/*.png`, `logs/walk-log-minitown.json`,
  `observations.json` (gitSha = árvore observada).
