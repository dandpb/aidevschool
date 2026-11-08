# AID-5013: CURRÍCULO REAL (Onda 2): Implementar código de referência, testes executáveis e benchmark real para 03_url_shortener e 04_concurrent_task_queue

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** — | **Created:** 2026-10-17T16:22:02.086286+00:00 | **Updated:** 2026-11-01T14:11:52.33+00:00
- **ID:** `e8807439-e72f-4c0e-b8a5-cbd74245332c`

## Description

Avançar o objetivo central (`docs/PROMPTS/-01_GOAL.md`): substituir os scaffolds vazios em `curriculum/03_url_shortener` e `curriculum/04_concurrent_task_queue` por implementações reais verificáveis, com suíte de testes automatizados e evidência executável compatível com `openclaw --mode verify` e `learner/substrate`.

## Document `Continuation Summary` (2026-10-17)

# Continuation Summary

- Issue: AID-5013 — CURRÍCULO REAL (Onda 2): Implementar código de referência, testes executáveis e benchmark real para 03_url_shortener e 04_concurrent_task_queue
- Status: in_review
- Priority: high
- Current mode: review
- Last updated by run: 1a268695-56cb-4b3f-8e7e-ff44ab09fbec
- Agent: Founding Product Engineer (opencode_local)

## Objective

Avançar o objetivo central (`docs/PROMPTS/-01_GOAL.md`): substituir os scaffolds vazios em `curriculum/03_url_shortener` e `curriculum/04_concurrent_task_queue` por implementações reais verificáveis, com suíte de testes automatizados e evidência executável compatível com `openclaw --mode verify` e `learner/substrate`.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `1a268695-56cb-4b3f-8e7e-ff44ab09fbec` finished with status `succeeded` at 2026-10-18T11:53:48.165Z.
- Substantial implementation already exists in `04_concurrent_task_queue/node-impl`. Let me check the git state of the shared checkout and the actual state of both curriculum dirs (excluding node_modules), plus fetch the issue thread.

Both curriculum dirs already have real implementations with tests and benchmark docs. The checkout is on branch `aid5004/pg-d03-d04-source-contracts` with unrelated dirty files (AID-5004/5011 work). Let me check whether 03/04 files are committed, and fetch the issue thread to see prior progress.

Files are already tracked. Now let me fetch the AID-5013 issue thread to understand prior progress and remaining scope.

AID-5013 was unblocked and reassigned to me to open the PR. Implementations exist and are tracked — let me verify whether they're complete with real benchmarks, check for an existing branch/PR, and run the tests.

Implementations already exist on origin/main. Let me check when they landed, whether an AID-5013 PR exists, and what "compatible with openclaw --mode verify" requires.

The implementation landed on main 2026-10-16 (b080783a). Let me see what that commit delivered for 03/04, check the 04 benchmark, and understand
[truncated]

## Files / Routes Touched

- `scripts/merge_pr.sh`

## Commands Run

- Heartbeat run `1a268695-56cb-4b3f-8e7e-ff44ab09fbec` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Wait for reviewer feedback or approval before continuing executor work.

## Interaction [request_confirmation]  (expired)

## Comments (4)

**?** · 2026-10-17T20:28:31.567637+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `adapter_failed` - `opencode models` timed out after 20s.. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `c79834ab-f1d0-46ce-8b11-645e084212c2`
- Recovery owner: [CEO](/AID/agents/501cb456-b786-4d67-b951-6c71e0f0915d)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**founder** · 2026-10-18T10:33:56.775645+00:00

Desbloqueado e reatribuído ao Founding Product Engineer para abrir o PR das implementações reais de 03_url_shortener e 04_concurrent_task_queue.

**Founding Product Engineer** · 2026-10-18T11:52:00.039295+00:00

# Receipt: AID-5013 Onda 2 — verificação real 03/04 (Node verde + benchmark real) em review via PR #716

Author: Founding Product Engineer (opencode_local, fa8130d5) · Change-id: AID-5013 · Date: 2026-10-18 11:55Z

## Outcome

03_url_shortener e 04_concurrent_task_queue saem de `scaffolded` ("catalog verification is pending") para `implemented` com evidência executável datada. PR **#716** aberto (base main @ `6bd13ed6`): https://github.com/dandpb/aidevschool/pull/716 — merge pendente de countersign de agente DISTINTO (`scripts/merge_pr.sh`, AID-2768).

## What was produced

- Branch `aid5013/onda2-03-04-verify` @ `1e55fbbd` (worktree isolado `/paperclip/storage/worktrees/aid5013-onda2`, criado de origin/main limpo):
  - `curriculum/03_url_shortener/docs/status.md` — matriz factual + verificação datada
  - `curriculum/03_url_shortener/docs/benchmark_results.md` — seção re-verificação 2026-10-18
  - `curriculum/04_concurrent_task_queue/docs/status.md` — idem
  - `curriculum/04_concurrent_task_queue/docs/benchmark_results.md` — idem
  - `curriculum/catalog.md` — 03/04 → Partially implemented + Evidence datada
  - `curriculum/BACKLOG_STATUS.md`, `engines/codexDojo/src/data/{learner,projects}.ts`, `engines/codexdojo-os-prototype/src/data/learner.ts` — regenerados por `python3 -m learner.substrate` (31 projeções, zero hand-edit)
  - `docs/product-readiness/assessments/2026-10-18-6bd13ed6-onda2-03-04.md` — relatório datado (formato wave 1)
- Driver de benchmark: script Node.js single-use em scratch não rastreado (fora da árvore), transcript nesta receipt.

## Verification run (first-hand, same session)

Worktree limpo @ `6bd13ed6`; node v24.18.0 / npm 11.17.0; Linux sandbox:

| Comando | 03_url_shortener | 04_concurrent_task_queue |
| --- | --- | --- |
| `npm install --include=dev --no-audit --no-fund` | exit 0 | exit 0 |
| `npm run lint` | exit 0 | exit 0 |
| `npm run build` (tsc) | exit 0 | exit 0 |
| `npm test` (vitest run) | exit 0; `Test Files 2 passed (2)`, `Tests 8 passed (8)` | exit 0; `Test Files 2 passed (2)`, `Tests 5 passed (5)` |
| Benchmark (driver Node, 50 workers × 1000 req keep-alive) | 50.000 req, 0 erros, 12.566 rps, avg 3,91 / p50 3,58 / p95 7,12 / p99 10,39 ms, RSS (VmHWM) 91,6 MB — `GET /health` | 50.000 req, 0 erros, 14.002 rps, avg 3,50 / p50 3,11 / p95 6,31 / p99 9,44 ms, RSS 93,2 MB — `GET /healthz` |
| Smoke ao vivo (curl → `node dist/main.js`) | shorten → **HTTP 301** p/ URL original → stats com clique + IP hasheado | enqueue → **succeeded** (4 workers) → `/stats` `completed_count:1`, `backpressure: open` |
| `python3 -m learner.substrate` | exit 0, "Generated projections regenerated: 31" | (mesmo run) |

Limites declarados: Node-only (Go/Rust removidos `1b0a309`; linhas históricas marcadas); benchmark N=1 Linux/driver-Node (k6 indisponível), evidência relativa, não publicável como p95/p99; durabilidade in-memory pendente; nenhuma promoção de mastery.

## Clean-tree proof (AID-1516)

- **Worktree da mudança** `/paperclip/storage/worktrees/aid5013-onda2` (branch `aid5013/onda2-03-04-verify` @ `1e55fbbd`, imediatamente após commit): `git status --porcelain` → **0 linhas (vazio)**, observado em primeira mão.
- **Checkout compartilhado `_default`** (branch `aid5004/pg-d03-d04-source-contracts` @ `b3852b2c`, observado 2026-10-18 ~11:36Z, ANTES de qualquer escrita minha neste heartbeat — eu não escrevi nada em `_default`; todo o trabalho ocorreu no worktree): `git status --porcelain` NÃO-vazio com 10 entradas **pré-existentes de outros issues em andamento** (AID-5004/PR #710 pós-merge e estagiamento AID-5011). Como este heartbeat termina em `in_review` (não `done`), o gate de árvore vazia não é acionado; a tabela abaixo documenta que nenhuma entrada é minha.

## Disposition of every untracked/modified path (`_default`)

| Path | Action | Justification |
| --- | --- | --- |
| `M engines/codexdojo-os-prototype/src/domain.ts` | leave (foreign) | Pré-existente; trabalho em andamento de outro issue (AID-5004/5011), não tocado por AID-5013 |
| `M engines/dojoToday/src/types.ts` | leave (foreign) | idem |
| `M learner/substrate/__init__.py` | leave (foreign) | idem |
| `M learner/substrate/scheduling.py` | leave (foreign) | idem |
| `M learner/substrate/schema.yaml` | leave (foreign) | idem |
| `?? .aid5011-staging/` | leave (foreign) | Estagiamento explícito do AID-5011 |
| `?? curriculum/sequencia-dev-guiada/tools/bootstrap-aid5004.mjs` | leave (foreign) | Artefato AID-5004 |
| `?? engines/minimaxDojo/core/fsrs_bridge.py` | leave (foreign) | idem |
| `?? learner/substrate/practice.py` | leave (foreign) | idem |
| `?? learner/substrate/tests/test_practice_gate.py` | leave (foreign) | idem |

Nenhum arquivo criado/modificado por AID-5013 ficou sem commit: o receipt vive neste comentário (durável no issue), a evidência vive no PR #716 + assessment datado, e o driver de benchmark é scratch não rastreado por design (registrado aqui).

## Follow-ups

- **PR #716 aguarda countersign pré-merge de agente DISTINTO** (`scripts/merge_pr.sh`). Ao mergear, AID-5013 pode ir a `done` com a prova de árvore do momento.
- Drift canônico→projeção ressuperficiado pelo sync (`learner/learner_profile.md` Proficient/Analyze da era PR #562 vs projeção competent commitada) está incluído e sinalizado no PR; se o reviewer preferir isolá-lo, splito em PR separado.
- Next-cycle (não bloqueante): durability pass (03/04) e re-run k6 em hardware de benchmark.

**founder** · 2026-10-18T12:21:43.71455+00:00

Retomada gradual (2 agentes ativos por vez): O PR #716 (`aid5013/onda2-03-04-verify`, head `1e55fbbd`) falhou apenas em 1 assert de contagem de backlog em `learner/substrate/tests/test_substrate.py:619` (`TestDashboardSnapshot::test_build_snapshot_picks_up_backlog_counts - AssertionError: 12 != 14`, porque 03 e 04 passaram de backlog para verified, reduzindo o backlog de 14 para 12). Atualize o assert (com trailer `SDLC-ALLOW-TEST-EDIT: AID-5013` no commit), adicione o trailer `Provenance:` no corpo do PR #716 e faça push.

---

