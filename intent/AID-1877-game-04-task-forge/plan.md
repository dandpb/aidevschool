# Plan: PR-A1 — TASK FORGE (game-04-task-queue) + catálogo + alinhamento U4

Change-id: AID-1877-game-04-task-forge · From: intent/AID-1877-game-04-task-forge/intent.md · Status: approved

> O design de produto/pedagógico está **congelado** em
> `engines/pixelDojo/docs/plans/04_concurrent_task_queue.md` (decisão AID-1859
> Opção A). Este plan cobre apenas a implementação do PR-A1.

## Files that change

- `engines/voxelDojo/game-04-task-queue/` (new): `package.json`, `index.html`,
  `tsconfig.json`, `playwright.config.ts` (porta 5204), `playwright/task-forge.spec.ts`,
  `src/sim/queue.ts` (+`queue.test.ts`), `src/sim/levels.ts` (L1–L4 scriptados),
  `src/sim/rng.ts`, `src/game/controller.ts` (+`controller.test.ts`),
  `src/evidence/emit.ts`, `src/reviewSlice.ts` (gerado), `src/scene/forgeScene.ts`,
  `src/scene/hud.ts`, `src/main.ts`, `src/index.ts` (+`index.test.ts`).
- `engines/voxelDojo/catalog.json` — entrada `game-04-task-queue` / TASK FORGE /
  porta 5204 / `U4-task-queue` (catálogo contíguo 02–18).
- `engines/voxelDojo/shared/gameEvidenceMeta.ts` — meta de evidência (project
  `04_concurrent_task_queue`, scenario `task-forge`, curriculum_context com
  accepted_signal/rejected_trap do contrato congelado).
- `engines/voxelDojo/game-04-task-queue/src/reviewSlice.ts` (new, gerado por
  `python3 -m learner.substrate`) + `engines/dojoToday/src/data/today.ts`
  (vista derivada: linha do projeto 04 aponta para o jogo novo).
- `engines/voxelDojo/README.md` + `AGENTS.md` — contagem 16→17, linha do 04.
- `engines/pixelDojo/pixel-quest/src/content/curriculumPack.ts` — `unitId()`
  lab-04 → `U4-task-queue` (1 ramo + comentário); testes alinhados
  (`src/tests/taskQueue.test.ts`, `playwright/pixel-quest.spec.ts`).
- `learner/gate/tests/test_gate_game_coverage.py` — commit próprio:
  +`game-04-task-queue` em `ALLOWED_UNVERIFIED` (sai no PR-A2),
  −`04_concurrent_task_queue` em `ALLOWED_PROJECTS_WITHOUT_GAME` (dívida de
  jogo paga AQUI — ver Constraints do intent).
- `engines/voxelDojo/pnpm-lock.yaml` (workspace: novo pacote).

## Order of work

1. Sim core `queue.ts` + Vitest de invariantes (I1–I6) — sem pixels.
2. Levels L1–L4 (scripts data-only) + `evaluateQueueWave` (regra de passagem
   congelada §11).
3. Controller (bomba de eventos discreta determinística: predição de despacho,
   classificação retry/DLQ, gate R/admit, P pausa) + testes (jogador perfeito
   passa L1–L4; caminhos de falha; determinismo same-seed).
4. Cena 3D + HUD + main (sceneHarness, hook `__taskForge`).
5. Emissor (`createEmitForGame`) + catálogo + meta + substrato (reviewSlice).
6. Smoke Playwright (L1 evidência PASS completa + L3 retry/DLQ + WebGL).
7. Alinhamento pixel lab-04 + testes.
8. Pins do tripwire (commit isolado) + intent/ docs.

## Risks

- Conflito com PR #412 (aberto): toca `catalog.json` (linha game-10) e o mesmo
  tripwire (quirk game-10). Rebase de 2 linhas; janela do despacho (#412/#415)
  respeitada ao abrir o PR em fila.
- Pin `ALLOWED_PROJECTS_WITHOUT_GAME`: interpretação flagrada (ver intent
  Constraints); commit dropável.
- WebGL no smoke: risco G6 compartilhado por todo o voxelDojo; sim core 100%
  headless (Vitest sem GPU).

## Proof

- `cd engines/voxelDojo && pnpm --filter game-04-task-queue test` → 30/30
- `cd engines/voxelDojo && pnpm --filter game-04-task-queue typecheck && pnpm --filter game-04-task-queue lint && pnpm --filter game-04-task-queue build` → verdes
- `cd engines/voxelDojo/game-04-task-queue && npx playwright test` → 3/3 (evidência `U4-task-queue` PASS no console + `window.__voxelDojoEvidence`)
- `cd engines/voxelDojo && pnpm run lint && pnpm run test && pnpm run typecheck` → verdes (workspace 17 jogos)
- `cd engines/pixelDojo/pixel-quest && pnpm run test && pnpm run typecheck` → verdes; smoke quest slice → 1/1
- `python3 -m learner.substrate` → valida; reviewSlice game-04 gerado
- `python3 -m pytest learner/gate/tests/test_gate_game_coverage.py engines/test_engine_contracts.py -q` → 23 passed

## Verification split

Verifier de contexto fresco (PR-A2/review R1): conferir o diff contra o plano
congelado §3/§6/§10/§11 — emissor emite exatamente as métricas do contrato
(12 chaves, kind `voxeldojo-task-queue`), regra de passagem idêntica, e o
smoke prova next-dispatch ≥80% + retry/DLQ + backpressure/idempotência
end-to-end no Playwright.
