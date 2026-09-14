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
