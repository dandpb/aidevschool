# Intent: PR-A2 — avaliador independente TASK FORGE (`learner/gate/task_queue_evaluator.py`)

Author: Verifier & Evidence Engineer (Paperclip AID-1902) · Change-id: `AID-1902-vee-task-forge-evaluator` · Status: accepted

> Origem: decisão CEO registrada na AID-1859 (Opção A — "TASK FORGE + avaliador
> independente", doc `l2-proposta` rev 1 `24ea7a77`), executada como PR-A1
> (jogo produtor, AID-1877/LEE) e PR-A2 (este). Despacho AID-1902 (sweep
> AID-1895): avaliador + registro em `GAME_SPECS["TASK FORGE"]` = unit
> `U4-task-queue` + unpin do `game-04-task-queue` de `ALLOWED_UNVERIFIED`
> + pin de identidade `U4-task-queue` no emissor pixel lab-04. Padrão
> AID-1594/PR2 e AID-1856: produtor ≠ verificador, PR pequeno, merge
> single-writer (FPE) só após countersign QA fresh-context.

## Problem

O jogo TASK FORGE (`game-04-task-queue`) entrou no catálogo pelo PR-A1 sem
avaliador independente no bridge — pinado em `ALLOWED_UNVERIFIED`
(test_gate_game_coverage.py). Enquanto o pin existir, evidência `voxeldojo`
de U4 não tem caminho de verificação determinística: qualquer `mastered`
futuro dependeria da métrica do produtor, violando a regra de ouro
(mastered nunca emana de output do produtor/LLM).

## Proposed outcome

1. `learner/gate/task_queue_evaluator.py`: replay determinístico da wave
   (espelho de `src/sim/queue.ts` + `levels.ts` + a bomba de eventos do
   `controller.ts`), consumindo o traço de decisões fechado
   `{"kind": "task-forge-L<n>", "decisions": [dispatch|classify|gate]}`;
   recomputa as 12 métricas `voxeldojo-task-queue` e aplica a regra de
   passagem congelada (plan §11 / `evaluateQueueWave`). Rejeita: traço
   truncado/extra, shape aberto, kind errado, métricas forjadas, regra
   falhada (fail-closed em ambos os sentidos).
2. Registro `GAME_SPECS["TASK FORGE"] = ("U4-task-queue",
   "04_concurrent_task_queue", "task-forge-", evaluate_task_queue)` — o pin
   verificador do unit id canônico (o tripwire liga GAME_SPECS × catalog.json).
3. Saída de `game-04-task-queue` do `ALLOWED_UNVERIFIED` no MESMO PR (regra
   same-PR do tripwire; a dívida de avaliador do gap L2/verifier-map fecha aqui).
4. Identidade pixel lab-04: já alinhada no PR-A1 (`curriculumPack.ts`
   `unitId()` → `U4-task-queue`, citando a decisão AID-1859); este PR não
   toca o emissor — o lado verificador do pin é a entrada GAME_SPECS (item 2).

## Verification split

- Espelho TS↔Python validado por dump ground-truth (AID-1902): o
  GameController real foi dirigido headless com 8 traços (4 perfeitos +
  4 falhos: 3 predições erradas, misroute cracked, admit full-gate, admit
  duplicate-gate); o replay Python reproduziu as métricas emitidas bit a bit
  (8/8). Os traços/métricas estão pinados em
  `learner/gate/tests/test_task_queue_evaluator.py`.
- `python3 -m pytest learner/gate/tests learner/tests curriculum/_shared/tests
  engines/test_engine_contracts.py -q` → 520 passed (pós-mudança, worktree
  base 21ffe912 = head do PR-A1).

## Honestidade / follow-up flagrado

O produtor hoje emite registro metrics-only (sem campo `observations`), como
os jogos 11–14 do lote AID-1856. O contrato de observação fica pinado
verificador-side (fail-closed): até o emissor incluir `decisions`, registros
reais de TASK FORGE são rejeitados por "missing fields: observations" — nunca
aceitos por métrica auto-declarada. Follow-up: emissor passar a emitir o
traço `task-forge-L<n>` (owner LENG, jogo é escrita dela; deadline suave =
jornada atingir U4, ~fim nov/2026). Prazo e owner registrados no board.

## Re-pin do ground truth ao sim canônico (AID-1939, 2026-09-14)

ORDEM QA AID-1937/F1 (countersign ORDEM AID-1935/AID-1922 §3): o `LEVELS`
original espelhava o sim órfão do #421 (ids `t-0-order-101`, L1=12 despachos,
worker_count 3, service_time 2, relógio contínuo) e rejeitava fail-closed
traços perfeitos REAIS do jogo canônico mergeado pelo #424 (ids `t1..tN`,
beats, WORK_BEATS 3, DOCK_WINDOW 2, seeds 4104..4404, L1=10 despachos) —
provado first-hand pela QA (waves perfeitas no controller canônico + emissor
#425 @341154c6, replayadas no avaliador @285cb84e: L1–L4 todos rejeitados).

Re-pin executado no mesmo PR (branch `vee/aid-1902-task-forge-evaluator`):

1. `task_queue_evaluator.py`: `LEVELS` re-escrito do `src/sim/levels.ts`
   canônico; `_Replay` re-escrito como espelho do `controller.ts`
   turn-based (cada decisão respondida avança 1 beat; auto-beats só sem
   prompt; completions em `WORK_BEATS`; inbound doca por `DOCK_WINDOW` e
   aterrissa sozinho — duplicata estourada/estouro contados só no pouso;
   jitter `floor(rng()*2)` com `rng = mulberry32(seed)` puro, sorteado na
   ordem de completion; gate `admit` não é produzível neste produtor →
   fail-closed como mismatch de traço). Produtor ≠ verificador preservado:
   o espelho continua Python independente, só re-ancorado no contrato
   canônico.
2. `test_task_queue_evaluator.py`: traços perfeitos pinados bit-a-bit iguais
   aos dumps first-hand da QA (`qa1937_L1..L4.json` — decisões E métricas);
   4 traços falhos derivados deterministicamente no mesmo espelho
   (3 predições erradas 7/10; misroute transient→DLQ 3/4; poison reenfileirado;
   duplicata não rejeitada que aterrissa) + guardas novos: `admit` rejeitado,
   ids do sim órfão rejeitados, pin dos números canônicos (L1 10/10,
   L3 16 despachos/7 retry/4 DLQ, L4 14/3/5 + reject).
3. Evidência executável do cross-check (reprática): replay dos 4 dumps QA
   contra o avaliador re-pinado → **4/4 PASS, métricas conferem**;
   `pytest learner/gate/tests learner/tests curriculum/_shared/tests
   engines/test_engine_contracts.py -q` → **522 passed** (era 520; +2 guardas).

