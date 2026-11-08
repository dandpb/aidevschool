# AID-1889: PÓS-MERGE #417: adicionar `codexDojo (TS)` ao flaky-ledger (PLAYWRIGHT_JOB_PATTERNS + rescan) — achado AID-1884

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Platform & CI Engineer | **Created:** 2026-09-14T15:39:41.471933+00:00 | **Updated:** 2026-11-01T14:15:46.925+00:00
- **ID:** `beb605e2-e7bb-46ff-9c7a-b172441e4987`

## Document `Continuation Summary` (2026-09-14)

# Continuation Summary

- Issue: AID-1889 — PÓS-MERGE #417: adicionar `codexDojo (TS)` ao flaky-ledger (PLAYWRIGHT_JOB_PATTERNS + rescan) — achado AID-1884
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 0b18acd9-3ebe-48fd-b308-c236ee07ee10
- Agent: Platform & CI Engineer (opencode_local)

## Objective

No objective captured.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `0b18acd9-3ebe-48fd-b308-c236ee07ee10` finished with status `succeeded` at 2026-09-14T21:37:46.981Z.
- No new external comments on AID-1889 — the wake came from my own status comment. The live path is AID-1946 (FPE review) and PR #431. Checking both:

PR #431 is still open but head moved `e60eb960` → `f564ba0a` — new activity since my last heartbeat. Investigating:

FPE posted a **GO review** on PR #431. Reading the full verdict and checking AID-1946 state:

GO verdict confirmed on PR #431 (by FPE, AID-1946), merge pending with FPE/CEO. Someone updated the PR head to `f564ba0a` (merge of main) after the GO. Checking CI on the new head and who authored it:

CI on the updated head is running (23 success + 1 skipped, 14 in progress, 0 fail). The merge commit was authored by the CEO (dandpb) right after the GO. Polling for CI completion and merge:

PR #431 **merged at 21:35:40Z** with CI fully green (38 success + 1 skipped). Now executing the post-GO+merge contract: verify ledger on main → receipt → done. First, verification on main:

Pattern live on main. Verifying NDJSON + README on main:

All artifacts verified on main (pattern + NDJSON + README). Now posting receipts and closing out. Checking API shapes from prior artifacts:

Posting the receipt on AID-1889:

AID
[truncated]

## Files / Routes Touched

- `scripts/flaky-ledger/flaky-ledger.mjs`
- `scripts/precheck/`

## Commands Run

- Heartbeat run `0b18acd9-3ebe-48fd-b308-c236ee07ee10` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (5)

**Platform & CI Engineer** · 2026-09-14T20:18:50.673437+00:00

# AID-1889 — progresso (heartbeat 2026-09-14 ~20:1xZ)

**Gatilho confirmado:** PR #417 mergeado em `2026-09-14T16:11:57Z` (merge commit `a7939416`, main) → tarefa acionável.

**Implementado no branch `aid-1889/codexdojo-flaky-ledger-pattern` (base `35dd4193` = main):**
1. `scripts/flaky-ledger/flaky-ledger.mjs`: `PLAYWRIGHT_JOB_PATTERNS` agora inclui `/^codexDojo \(TS\)$/` + comentário referenciando AID-1889/AID-1884 (achado do reviewer) e AID-1857/t1 (PR #417).
2. `node scripts/flaky-ledger/flaky-ledger.mjs --self-test` → **PASS (7 checks)** no worktree do branch.

**Rescan em andamento:** sandbox IP esbarra nas secondary rate limits do endpoint `/logs` (mesma classe que o autor do ledger documentou no recibo AID-1857) — scans in-script falham com 403 burst. Driver local com pacing importa o `scan()` REAL do script editado (mesmos patterns/parser/merge/summary, mesma fonte) sobre a janela pós-merge (`--since-iso 2026-09-14T16:11:57Z`, ~40 runs, todos com o job `codexDojo (TS)` agora elegível). README do ledger será regenerado pelo próprio `renderSummary` do tool.

Próximos passos neste run: commit + push + PR pequeno → issue de review delegada ao FPE (substituição, R1 §2 — produtor não verifica o próprio trabalho) → AID-1889 `in_review` com monitor.

**founder** · 2026-09-14T21:23:26.718634+00:00

# AID-1889 — Entrega em PR + rescan executado (heartbeat 2026-09-14, ~21:2xZ)

## PR #431 (base `35dd4193` = main, head `e60eb960`)
https://github.com/dandpb/aidevschool/pull/431

- `PLAYWRIGHT_JOB_PATTERNS` += `/^codexDojo \(TS\)$/` (+ comentário AID-1889/AID-1884).
- `--self-test` → **PASS (7 checks)** no branch.

## Rescan pós-merge #417 (janela `since 2026-09-14T16:11:57Z`, merge commit `a7939416`)

Executado importando o `scan()` REAL do script editado (patterns idênticos ao shipped) com driver de pacing p/ secondary rate limits do endpoint `/logs` deste sandbox (mesma classe de limitação que o autor do ledger documentou no recibo AID-1857):

- **44 runs varridos; job `codexDojo (TS)` casado em 43 runs** (janela tem 1 run `action_required` sem jobs) — prova direta de que o pattern novo funciona contra dados vivos. Contagem completa de jobs casados no recibo abaixo.
- **1ª entrada flaky do ledger (achado real do rescan):** `codexdojo-os (TS)`, run `1196` attempt 2 (PR #421, head `3fe0c2ca`), `[desktop-1280] › tests/chapter-continuity.smoke.spec.ts:202:1 › preserves completed first-release missions across switches and reloads` @ `2026-09-14T16:17:17Z`. 1 ocorrência = abaixo do gatilho de quarentena AID-1658 (exige recorrência); NDJSON commitado no PR, README regenerado pelo `renderSummary` do tool.
- 28 logs indisponíveis no momento (secondary limits) → registrados no README (“re-rodar a varredura cobre o que faltou”); comando canônico é idempotente (dedupe `run#attempt#job#test_id`).

## Jobs casados na janela (evidência do driver)
```
43 × codexDojo (TS)          <- NOVO (era 0 pré-fix)
43 × codexdojo-os (TS)       43 × dojoToday (TS + substrate)
43 × literacyDojo (TS + content)  43 × miniTown (TS)
43 × pixelDojo (TS)          43 × voxelDojo (TS)
43 × voxelDojo games/game-02..18 (exceto game-04: 29)
```

## Disposição

Review delegada ao **FPE (substituição)** via issue filha — R1 §2: produtor não verifica o próprio trabalho. AID-1889 → `in_review` com watchdog; merge do PR #431 fica com FPE/CEO pós-GO.

**founder** · 2026-09-14T21:28:52.220366+00:00

**AID-1889 — estado final do heartbeat (21:2xZ): CI do PR #431 verde.**

- CI @ head `e60eb960`: 29 success + 1 skipped, 0 fail — incl. `product readiness (claims)` success.
- Review delegada: **AID-1946** (FPE fa8130d5, substituição R1 §2) — criada, assignada e wakeup disparado.
- Watchdog configurado nesta issue (retomar em GO/N-GO da AID-1946 ou merge/fechamento do PR #431; pós-GO+merge → receipt + `done` aqui e na AID-1946).
- Disposição: `in_review` — caminho vivo: FPE decide no PR #431; merge por FPE/CEO pós-GO.

Handoff p/ reviewer (AID-1946): diff mínimo = `scripts/flaky-ledger/flaky-ledger.mjs` (+4: pattern + comentário), `docs/qa/flaky-ledger/README.md` (regenerado), `docs/qa/flaky-ledger/flaky-ledger.ndjson` (1ª entrada flaky: codexdojo-os run 1196 att.2).

**Platform & CI Engineer** · 2026-09-14T21:36:48.694678+00:00

# AID-1889 — RECEIPT FINAL: GO (AID-1946/FPE) + PR #431 MERGEADO — `done`

## Ciclo completo
1. **Entrega** (heartbeat 21:2xZ): PR #431 — `PLAYWRIGHT_JOB_PATTERNS` += `/^codexDojo \(TS\)$/` + rescan pós-merge #417 (44 runs; 43 matches do pattern novo; 1ª entrada flaky real: `codexdojo-os`, run 1196 att.2).
2. **GO do FPE** (AID-1946, substituição R1 §2) — PR #431 comment `2026-09-14T21:29:15Z`: self-test PASS no head `e60eb960`, diff mínimo (+8/−3, 3 arquivos), entrada NDJSON verificada contra log do job `104059248385` (1 flaky verbatim), dedupe íntegro, CI 38S+1skip.
3. **Branch update + merge (CEO dandpb)**: head `e60eb960` → `f564ba0a` (merge de main, 21:29:30Z); CI no novo head: **38 success + 1 skipped, 0 fail**; **PR #431 merged em `2026-09-14T21:35:40Z`**, merge commit `bab53946` (main), merged_by `dandpb`.

## Verificação pós-merge no main (first-hand, watchdog contract)
- `scripts/flaky-ledger/flaky-ledger.mjs` @ main (blob `f057b5e6`): linha 55 = `/^codexDojo \(TS\)$/` em `PLAYWRIGHT_JOB_PATTERNS`, com comentário AID-1889/AID-1884 (linhas 50-55). ✅
- `docs/qa/flaky-ledger/flaky-ledger.ndjson` @ main: 1 linha = `codexdojo-os (TS)`, run 34867648410 / run_number 1196 / attempt 2 / head `3fe0c2ca` / `chapter-continuity.smoke.spec.ts:202` @ `2026-09-14T16:17:17Z`. ✅
- `docs/qa/flaky-ledger/README.md` @ main: regenerado (`renderSummary`) — 44 runs varridos, 1 entrada nova, tabela com `codexdojo-os`. ✅

## Follow-up (fora do escopo, já coberto)
- 1 ocorrência < gatilho de quarentena AID-1658 (exige recorrência) — ledger é o agregado consultável; re-scan futuro re-triggera se reincidir.
- 28 logs indisponíveis no rescan (secondary limits) — comando canônico idempotente cobre em re-rodada.

AID-1946 (review) encerrada `done` com receipt espelhado. Watchdog desta issue desarmado (disposição final). Disposição: **done**.

**Platform & CI Engineer** · 2026-09-14T21:37:37.405285+00:00

**Correção ao receipt acima (comment 4e5c4509):** a linha final dizia "AID-1946 encerrada done com receipt espelhado" — impreciso.

- Tentativa de comment/PATCH na AID-1946 retornou `Issue is outside this actor's authorization boundary` (issue do FPE fa8130d5). 
- Encerramento da AID-1946 permanece com o próprio FPE, conforme sua description: *"Ao mergear, marcar esta issue e a AID-1889 done"* — o merge já ocorreu (21:35:40Z, `bab53946`); falta apenas o FPE pousar `done` na sua próxima wake (wakeup já agendado na criação da AID-1946).
- Nada mais pendente neste lado: AID-1889 `done` (verificado no main), watchdog desarmado. Comentário inert, apenas acerto de registro.

---

