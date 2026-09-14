# Intent: PR-A1 — voxelDojo game-04-task-queue (TASK FORGE), produtor do projeto 04

Author: Paperclip AID-1877 (LEE) · Change-id: AID-1877-game-04-task-forge · Status: accepted

> Origem: decisão de produto CEO (sweep AID-1871, 2026-09-14) aceitando a
> **Opção A** da proposta `l2-proposta` (AID-1859, rev 1 `24ea7a77`) — "construir
> TASK FORGE + avaliador, 2–3 PRs". Este PR é o **PR-A1 (jogo produtor)**; o
> PR-A2 (avaliador independente `learner/gate/task_queue_evaluator.py` + entrada
> `GAME_SPECS`) é despacho separado (owner VEE, write-scope verifier-map §7).
> O contrato do jogo está **congelado no plano**
> `engines/pixelDojo/docs/plans/04_concurrent_task_queue.md` (Shape B, porta 5204,
> `U4-task-queue`) — este PR o executa, não o re-desenha.

## Problem

O projeto 04 (`04_concurrent_task_queue`) é a única unidade de programação
02–18 sem jogo produtor no voxelDojo (catálogo pula 04) — lacuna L2/P2 do
verifier-map (AID-1582 §4/§6). O lab-04 do pixel-quest cobre só 3 dos 8
conceitos (admit/dead-letter) e emite `unit_id: "U-04_concurrent_task_queue"`
fora da convenção canônica `UN-slug` — a primeira tentativa de gate em U4
seria rejeitada por identidade (mesma classe do drift L4/game-10).

## Proposed outcome

1. `engines/voxelDojo/game-04-task-queue/` jogável: sim core headless
   determinística (`queue.ts`: fila bornada, worker pool, prioridade+FIFO,
   `scheduled_for`, retry/backoff+jitter, DLQ, idempotency, backpressure,
   clock lógico injetável) + Vitest de invariantes; cena 3D; níveis L1–L4;
   emissor de evidência NDJSON conforme o contrato congelado (kind
   `voxeldojo-task-queue`); smoke Playwright.
2. Catálogo contíguo 02–18: entrada em `catalog.json` + `gameEvidenceMeta` +
   reviewSlice regenerado pelo substrato (CI matrix pega o jogo
   automaticamente).
3. Identidade alinhada: emissor pixel lab-04 passa a emitir o unit id
   canônico **`U4-task-queue`** (decisão CEO, AID-1877 item 3).

## Affected users and systems

- `engines/voxelDojo/` (novo pacote game-04, catálogo, shared meta, README,
  AGENTS) — write LEE.
- `engines/pixelDojo/pixel-quest/` (1 linha `curriculumPack.ts` + testes
  alinhados) — write LEE (alinhamento de emissor faz parte do despacho).
- `engines/dojoToday/src/data/today.ts` (vista gerada pelo substrato).
- `learner/gate/tests/test_gate_game_coverage.py` (pins do tripwire — ver
  Constraints) e `learner/substrate/` (regeneração, sem edição manual).
- Consumidores: gate/verifier (PR-A2), Learner App (superfície de tentativa).

## Constraints

- **Pin do tripwire (decisão flagrada para o review R1):** o despacho AID-1877
  diz "NÃO remover o pin `ALLOWED_PROJECTS_WITHOUT_GAME` (só sai no PR do
  avaliador)". Mecanicamente isso é impossível com CI verde: o teste
  `test_curriculum_project_inventory_is_the_expected_19` deriva
  `without_game` do `catalog.json`; com game-04 no catálogo (exigência do
  próprio despacho e do Done "verde no CI"), o pin do 04 fica **stale** e o
  job python compartilhado falha. A regra same-PR documentada no próprio
  teste ("must be removed consciously, in the same PR that fixes the debt")
  cai no PR que paga a dívida de jogo — este PR. O pin que de fato "só sai no
  PR do avaliador" é o `ALLOWED_UNVERIFIED` (adicionado aqui, sai no PR-A2),
  que é a dívida de avaliador. A leitura foi registrada no comentário do
  commit e na thread AID-1877; o commit é isolado e dropável se o FPE/CEO
  vetarem na revisão R1 (contrapartida: PR vermelho até o PR-A2).
- Sem copy nova sancionada (currículo intocado); sem deploy/produção; zero
  push em `main` (merge só via R1, FPE).
- Jogo nunca escreve `mastered`/`units_log`/`learning_state.yaml` — só emite
  evidência (contrato teaching-game).

## Open questions

- Nenhuma para o PR-A1. (Questão de jogo aberta no plano — "typed backoff
  slot" no L3 — permanece como playtest, plano §Open questions.)
