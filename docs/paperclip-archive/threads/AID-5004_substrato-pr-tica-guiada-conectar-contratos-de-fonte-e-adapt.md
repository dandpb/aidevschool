# AID-5004: SUBSTRATO & PRÁTICA GUIADA: Conectar contratos de fonte e adapters de projeção determinística para pg-d03 e pg-d04

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** — | **Created:** 2026-10-17T16:22:01.762554+00:00 | **Updated:** 2026-11-01T14:12:02.632+00:00
- **ID:** `bd1545f7-f0c2-47a4-b1f6-39704a299dd8`

## Description

Na onda PR #657 (`b08e0096`), `pg-d03-decomposicao-em-etapas` e `pg-d04-contexto-e-spec` entraram como pacotes offline sem `*-source-contract.json`. Criar `pg-d03-source-contract.json`, `pg-d04-source-contract.json` e seus adapters em `curriculum/sequencia-dev-guiada/tools/` para projetá-los no catálogo de missões do `codexdojo-os-prototype` (`learner/substrate/mission_catalog_guided_practice.py`).

## Document `Continuation Summary` (2026-10-17)

# Continuation Summary

- Issue: AID-5004 — SUBSTRATO & PRÁTICA GUIADA: Conectar contratos de fonte e adapters de projeção determinística para pg-d03 e pg-d04
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: 9b10cd80-74ee-44ba-85ff-5d51e47c5908
- Agent: Curriculum Content Engineer (opencode_local)

## Objective

Na onda PR #657 (`b08e0096`), `pg-d03-decomposicao-em-etapas` e `pg-d04-contexto-e-spec` entraram como pacotes offline sem `*-source-contract.json`. Criar `pg-d03-source-contract.json`, `pg-d04-source-contract.json` e seus adapters em `curriculum/sequencia-dev-guiada/tools/` para projetá-los no catálogo de missões do `codexdojo-os-prototype` (`learner/substrate/mission_catalog_guided_practice.py`).

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `9b10cd80-74ee-44ba-85ff-5d51e47c5908` finished with status `succeeded` at 2026-10-18T10:50:28.708Z.
- PR #710 with the AID-5004 deliverables is confirmed merged into `main` (`6bd13ed6`). Verifying the merged content and running the smallest proof:

Deliverables confirmed in `main`. Running the smallest verification — the golden adapter tests from the merged PR — in a temp worktree of `origin/main` so I don't disturb the current checkout:

All 56 golden tests pass on `main`, including catalog parity against the real Python loader. One direct check that both missions project into the catalog:

Objective verified end-to-end on merged `main`. Cleaning up and closing the issue via the Paperclip API:

Comment posted. Now setting the final disposition:

AID-5004 closed as **done**.

- **Verification on merged `main`** (`6bd13ed6`, PR #710 head `b3852b2c`): all deliverables present — `pg-d03-source-contract.json`, `pg-d04-source-contract.json`, `pg-d03/pg-d04-source-adapter.mjs` + golden tests (4,150 insertions).
- **Tests**: 56/56 pass in a clean worktree of `main`, including catalog parity against the real Python loader and the hash-pinned pg-d02 prerequisite chain.
- **Projection proof**: `load_guided_practice_catalog` now projects `pg-d03@20b608d64a13` and `pg-d04@7
[truncated]

## Files / Routes Touched

- `scripts/merge_pr.sh`

## Commands Run

- Heartbeat run `9b10cd80-74ee-44ba-85ff-5d51e47c5908` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (9)

**Curriculum Platform Engineer** · 2026-10-17T19:29:38.262405+00:00

**Entregue — PR #710 aberto** (https://github.com/dandpb/aidevschool/pull/710, head `b3852b2c`, base `b08e0096` = main)

**Substrato:** `pg-d03-source-contract.json` (12 arquivos pinados, `pg-d03@20b608d64a13`) + `pg-d04-source-contract.json` (24 pinados, `pg-d04@730ac9dc41c2`) + adapters determinísticos e testes golden em `curriculum/sequencia-dev-guiada/tools/`. O catálogo de missões agora carrega `{pg-d01, pg-d02, pg-d03, pg-d04}`; registros pg-d01/pg-d02 byte-idênticos aos anteriores; `load_mission_catalog` → 40 missões, binding pg-d01 intacto. Nenhuma lição live, binding, engine ou superfície tocada (diff só em `tools/`).

**Evidência local:** node --test 26/26 (pg-d02 regressão) + 27/27 (pg-d03) + 29/29 (pg-d04), incl. probe do loader py real; pytest mission-catalog + crosswalk 31 passed; pacotes byte-idênticos desde o merge (PR #633 @ 353aec42 / PR #643 @ 32888d9f, base PR #620).

**Decisão para olhar do Content Designer (descrita no PR):** pg-d04 pré-requisita a prática pg-d02 sem lição própria no enunciado; a âncora `l16` é resolvida por cadeia do contrato pg-d02 pinado por sha256 (`loadPrerequisiteChain` verifica byte a byte) — zero invenção, sem tocar `learner/` (read-only para CPE).

**Próximos passos (fora do meu escopo):** CI do PR (jobs learner + codexdojo-os exercem o catálogo real) → countersign por agente distinto → merge pelo FPE (R1). Checklist de revisão pronta no corpo do PR.

**Disposição:** in_review — caminho real: PR #710 (CI + countersign + merge FPE).

**Curriculum Platform Engineer** · 2026-10-17T20:45:04.04065+00:00

Retomando. O trabalho em si foi concluído no último heartbeat (PR #710 aberto, trailer verificado, toda a validação local passou); o que ficou pendente foi o registro no lado do paperclip (API estava fora do ar) e a confirmação do CI. Vou verificar ambos agora:

CI is green across all jobs — the only failing check is `countersign-gate`, which is the expected pre-countersign state (it blocks merge until a distinct agent pins the head). Let me confirm the failure mode is "awaiting countersign" and not a provenance defect:

The gate failure is exactly the expected awaiting-countersign state (`no 'Countersign:' line found in any PR comment`) — provenance passed §5, CI all green, PR mergeable. GitHub-side is done. Now the paperclip bookkeeping — retry the API:

API still down. The service woke me (so it's alive internally) but HTTP is unresponsive. Let me check what ports the paperclip process actually listens on:

Port 3100 is listening — the service's event loop is saturated (accepts connections, never responds; same instance runs all concurrent agent sessions). Restarting it would kill other agents' runs — not mine to do. One final short attempt, then close with the blocker recorded:

The API write is definitively blocked this heartbeat (service event-loop saturation — accepts connections, never responds; it's the shared instance running all agents' sessions, and restarting it is outside my boundaries).

Closing this heartbeat with the final state:

**AID-5004 — deliverable complete, in the review pipeline:**

| Item | State |
|---|---|
| Contracts + adapters + tests (6 files) | ✅ committed `b3852b2c`, pushed `aid5004/pg-d03-d04-source-contracts` |
| PR #710 | ✅ OPEN, `MERGEABLE`, provenance trailer verified |
| CI (25 jobs) | ✅ all pass — incl. `Python (learner + curriculum shared)`, `codexdojo-os (TS)` (real catalog load), `dojoToday (TS + substrate)` |
| countersign-gate | ⏳ correctly FAILING pre-countersign: `no 'Countersign:' line found in any PR comment (AID-2768 §1)` — awaiting distinct-agent countersign (QA Lead path), then FPE merge (R1) |
| Real catalog | ✅ `{pg-d01..pg-d04}` load; pg-d01/pg-d02 records unchanged; 40 missions intact |
| Local suites | ✅ 26/26 (pg-d02), 27/27 (pg-d03), 29/29 (pg-d04), 31 py tests |

**Blocker (bookkeeping only):** paperclip issue comment + `in_review` status flip could not be written — the API (external host and `127.0.0.1:3100`) times out service-wide (event-loop saturation; process up, port listening, requests never answered; repeated attempts across two heartbeats). Unblock owner/action: paperclip instance operator service recovery (escalation path: FPE if persistent). I did not restart the service or write to the embedded postgres directly — that would bypass service invariants and kill concurrent runs.

**Next wake:** verify no duplicate comment landed from the timed-out POST, post the evidence comment, set `in_review`; if a countersign/changes-request arrives on PR #710, act on it (bootstrap script for contract regeneration kept untracked in the workspace).

**Curriculum Platform Engineer** · 2026-10-17T20:49:18.540722+00:00

Resuming. The deliverable (PR #710, CI green, awaiting countersign) was completed last run; the only gap is paperclip bookkeeping, which was blocked by API saturation. Checking if the API recovered and the PR state, in parallel:

PR #710 still open, no countersign yet (QA path pending). API still unresponsive. Notably my JWT (exp 17:30Z) is now expired too — but the hang predates that and the server never returns any HTTP status, so it's saturation, not auth. One quick probe to confirm, then close:

Confirmed: `20:26Z`, both probes hang with zero HTTP response — the outage is ~2h old. No further action is possible or appropriate from my side this heartbeat (restarting the shared service or writing to its postgres directly would violate boundaries and kill concurrent runs).

**Final state — AID-5004:**

- **Deliverable:** complete and durable. PR #710 (`b3852b2c` ← `b08e0096` = main) — 6 files in `curriculum/sequencia-dev-guiada/tools/`: frozen source contracts `pg-d03@20b608d64a13` (12 pins) / `pg-d04@730ac9dc41c2` (24 pins), deterministic adapters, golden suites (27+29 tests incl. live py-loader parity probes).
- **Zero regression:** CI 25/25 green (learner+curriculum, codexdojo-os real-catalog prebuild, dojoToday substrate); pg-d01/pg-d02 catalog records byte-identical; 40 missions intact; no `engines/`/`learner/`/bindings touched.
- **Disposition: `in_review`** — live path: PR #710 awaiting distinct-agent countersign (gate correctly failing `AID-2768 §1` pre-countersign) → FPE merge per R1. Checklist + the l16 chain decision for the Content Designer are in the PR body.
- **Bookkeeping blocker (not work blocker):** paperclip API outage (~2h, event-loop saturation; also my run's JWT expired 17:30Z). Unblock owner: paperclip instance operator (escalation FPE). On recovery, next wake: dedup-check comments (one POST may have landed at ~18:45Z), post evidence comment, PATCH `in_review`.

**Curriculum Platform Engineer** · 2026-10-17T22:52:35.848496+00:00

The liveness wake wants concrete action — the right concrete action now is completing the paperclip bookkeeping that the API outage blocked (the work itself is done: PR #710, CI green). Checking if the API recovered:

Still hanging at 22:31Z (~4h outage). Let me check my token freshness and whether the paperclipai CLI offers a non-HTTP path, plus PR activity — in parallel:

Key finding: the token is FRESH (this run's own credentials, not expired) — so the hang is pure server saturation, pre-auth. Retrying both endpoints with the fresh token, and checking the CLI heartbeat subcommand:

Both endpoints hang; the CLI also routes through the same API — no offline write path exists. The one durable, useful write available: a validation receipt comment on PR #710 (the channel the countersigner will use). Also a final integrity check of the pushed branch:

Branch intact: remote head `b3852b2c` = PR head, workspace clean on my branch. Posting the validation receipt on PR #710:

Receipt posted. One last API attempt before closing the heartbeat:

**Heartbeat fechado — AID-5004:**

**Ação concreta desta passagem (durable):**
- Integridade confirmada: branch remoto `aid5004/pg-d03-d04-source-contracts` @ `b3852b2c` = PR head; workspace limpo na minha branch (nenhum arquivo meu solto; WIP estranho do FSRS não tocado).
- PR #710: OPEN, MERGEABLE, CI **25/25 verde**; `countersign-gate` no estado esperado pré-countersign (AID-2768 §1).
- **Recibo de validação publicado no PR** ([issuecomment-6242356927](https://github.com/dandpb/aidevschool/pull/710#issuecomment-6242356927)) com checklist mínima para o countersigner (diff confinado, allowlists, separação do gabarito, decisão da cadeia l16) — o canal que o revisor realmente usa.

**Disposição: `in_review`** — caminho real e vivo: countersign por agente distinto no PR #710 → merge pelo FPE (R1).

**Bloqueio remanescente (só bookkeeping):** API paperclip suspensa há ~4h (saturação do event loop; token novo descartou causa de auth; localhost, host externo e CLI todos roteiam pelo mesmo processo). Unblock owner: operador da instância (escalação FPE). Quando recuperar: dedup-check de comentários na issue → comentário de evidência → PATCH `in_review`. Todo o work product e evidência estão durable no GitHub.

**?** · 2026-10-18T04:14:17.084085+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `adapter_failed` - `opencode models` timed out after 20s.. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `b5c648b5-2146-46da-bb46-813e191bca58`
- Recovery owner: [Curriculum Content Engineer](/AID/agents/93e26ea9-8f2a-4f6f-9b82-3591ebc4255c)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**founder** · 2026-10-18T10:33:50.21877+00:00

PR #710 aberto com contratos de fonte e adapters pg-d03/pg-d04.

**founder** · 2026-10-18T10:46:29.770178+00:00

✅ PR #710 mergeado na `main`! Contratos de fonte e adapters pg-d03/pg-d04 entregues.

**Curriculum Content Engineer** · 2026-10-18T10:50:14.472815+00:00

**Fechamento AID-5004 — verificado em `main` e concluído**

Com o merge do PR #710 (`6bd13ed6`, head `b3852b2c`), confirmado pelo recibo da child AID-5036 (QA APROVADO → countersign `6248732849` → gate Actions `39061388541` PASS), os entregáveis estão integrados e verificados diretamente na `main`:

- `curriculum/sequencia-dev-guiada/tools/fixtures/pg-d03-source-contract.json` (499 linhas)
- `curriculum/sequencia-dev-guiada/tools/fixtures/pg-d04-source-contract.json` (600 linhas)
- `curriculum/sequencia-dev-guiada/tools/pg-d03-source-adapter.mjs` + golden tests
- `curriculum/sequencia-dev-guiada/tools/pg-d04-source-adapter.mjs` + golden tests

**Verificação pós-merge (heartbeat atual, worktree limpo sobre `origin/main` @ `6bd13ed6`):**
1. `node --test` nos dois adapters: **56/56 pass** — incluindo paridade de contentVersion com PR628/PR625, cadeia de pré-requisito pg-d02 pinada por hash (E_ANCHOR_UNTRACED em negativos), e paridade de catálogo contra o loader Python real.
2. Projeção direta no catálogo: `load_guided_practice_catalog(curriculum/sequencia-dev-guiada)` projeta `pg-d01@55882460a2bf`, `pg-d02@920e17baafd5`, `pg-d03@20b608d64a13`, `pg-d04@730ac9dc41c2` — pg-d03 e pg-d04 agora têm contratos de fonte e projeção determinística, encerrando o gap deixado pela onda PR #657.

O bloqueio anterior era apenas infra (`opencode models` timeout no run `584a35b1`); sem pendências de conteúdo. Issue fechada como **done**.

**Curriculum Content Engineer** · 2026-10-18T11:16:44.059262+00:00

Fechamento AID-5004 — pendência de bookkeeping resolvida.

Acknowledging comment `0c982857` ("PR #710 aberto com contratos de fonte e adapters pg-d03/pg-d04", 10:33Z): ela reportava a abertura do PR #710 e já foi superseded pelos eventos seguintes — merge na `main` (`6bd13ed6`, comentário `bd460456`), countersign da child AID-5036 e verificação final (comentário `be642ac4`). Nenhuma ação nova dela decorre.

O run anterior (`9b10cd80`) encerrou com o fechamento intencional, mas o PATCH de status não persistiu (issue voltou a aparecer como `todo`). Este heartbeat completou o bookkeeping com a menor verificação necessária:

- `origin/main` = `6bd13ed6` (merge do PR #710, head `b3852b2c`).
- `git ls-tree 6bd13ed6` confirma os 6 entregáveis: `pg-d03-source-contract.json`, `pg-d04-source-contract.json`, `pg-d03/pg-d04-source-adapter.mjs` + testes golden em `curriculum/sequencia-dev-guiada/tools/`.
- Evidência de teste do run anterior permanece válida: 56/56 golden tests em worktree limpo de `main`, paridade do catálogo contra o loader Python real, projeção de `pg-d03@20b608d64a13` e `pg-d04@730ac9dc41c2` confirmada.

Disposição final: **done** (status `done`, completedAt 2026-10-18T11:15:59Z). Sem follow-ups abertos.

---

