# AID-3722: Recorrência Provenance-at-open (6ª) — body de PR de agente sem trailer Provenance na abertura

- **Status:** backlog | **Priority:** medium | **Origin:** manual
- **Assignee:** Platform & Release Engineer | **Created:** 2026-10-01T23:37:13.208118+00:00 | **Updated:** 2026-10-18T11:36:54.812+00:00
- **ID:** `bc21c64c-9bfb-4e7c-9e6c-5d690d30caa2`

## Description

**Classe recorrente (auditoria SM AID-3721/row #307, flagada desde #302):** PRs abertos por lanes de agente (conta única `dandpb`) seguem sem a linha `Provenance: agent=<slug> task=<AID-ID|GH-n> run=<runId> session=<sessionId>` no body NA ABERTURA — o trailer (norma AID-2493 p/ comentários de processo) é adicionado só depois de pedido (PO 20:11 em #638) ou coaching pós-review.

**Ocorrências:** #644, #645, #646, #647, #638 (corrigidas pós-hoc in-window 19:5x–20:1x, audits #302/#303) e agora **#653 (AID-3714, aberto 22:56:03Z — 6ª, sem trailer até 23:3xZ)**.

**Impacto (baixo, mas vivo):** a adjudicação produtor/verificador por lane continua dependendo de forense de heartbeat-runs quando o body é a única superfície (classe que motivou AID-2493); cada ocorrência gera um ciclo extra de coaching/correção pós-abertura.

**Decisão pedida ao CEO/merge-writer (uma das, ou combinação):**
- (a) item de checklist no PR template do repo (`Provenance:` no body na abertura — mecânico, zero processo novo);
- (b) `::notice` advisory no check `SDLC guardrails (diff)` para PR de agente sem trailer no body (paralelo ao parse de comentários, notice-only);
- (c) manter coaching-only e aceitar a recorrência documentada.

**Critério checkable:** próxima auditoria SM conta ocorrências desde #653; meta = 0 novas aberturas sem trailer após a decisão aplicada (ou decisão (c) registrada fechando a classe).

**Dono:** CEO (merge-writer; se (b), delegar implementação ao Platform eng via child). **Origem:** auditoria AID-3721 (row #307). Sem polling — esta issue espera a decisão do dono.

## Document `Continuation Summary` (2026-10-17)

# Continuation Summary

- Issue: AID-3722 — Recorrência Provenance-at-open (6ª) — body de PR de agente sem trailer Provenance na abertura
- Status: in_review
- Priority: medium
- Current mode: review
- Last updated by run: 70ef7673-d677-4fb5-8eed-f96a2dcdb039
- Agent: Platform & Release Engineer (opencode_local)

## Objective

**Classe recorrente (auditoria SM AID-3721/row #307, flagada desde #302):** PRs abertos por lanes de agente (conta única `dandpb`) seguem sem a linha `Provenance: agent=<slug> task=<AID-ID|GH-n> run=<runId> session=<sessionId>` no body NA ABERTURA — o trailer (norma AID-2493 p/ comentários de processo) é adicionado só depois de pedido (PO 20:11 em #638) ou coaching pós-review.

**Ocorrências:** #644, #645, #646, #647, #638 (corrigidas pós-hoc in-window 19:5x–20:1x, audits #302/#303) e agora **#653 (AID-3714, aberto 22:56:03Z — 6ª, sem trailer até 23:3xZ)**.

**Impacto (baixo, mas vivo):** a adjudicação produtor/verificador por lane continua dependendo de forense de heartbeat-runs quando o body é a única superfície (classe que motivou AID-2493); cada ocorrência gera um ciclo extra de coaching/correção pós-abertura.

**Decisão pedida ao CEO/merge-writer (uma das, ou combinação):**
- (a) item de checklist no PR template do repo (`Provenance:` no body na abertura — mecânico, zero processo novo);
- (b) `::notice` advisory no check `SDLC guardrails (diff)` para PR de agente sem trailer no body (paralelo ao parse de comentários, notice-only);
- (c) manter coaching-only
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `70ef7673-d677-4fb5-8eed-f96a2dcdb039` finished with status `failed` at 2026-10-18T11:09:19.471Z.
- No adapter-provided result summary was captured for this run.
- Latest run error (adapter_failed): `opencode models` timed out after 20s.

## Files / Routes Touched

- `scripts/countersign_assign.sh`
- `scripts/sdlc_guard_check.sh`

## Commands Run

- Heartbeat run `70ef7673-d677-4fb5-8eed-f96a2dcdb039` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- Latest run ended with `failed`; inspect the error before continuing.

## Next Action

- Wait for reviewer feedback or approval before continuing executor work.

## Comments (6)

**founder** · 2026-10-17T16:21:54.388609+00:00

🚀 Automatizar injeção/validação de trailer `Provenance:` no template/helper de abertura de PR.

**Platform & Release Engineer** · 2026-10-17T18:22:32.609494+00:00

Resuming: implementation and PR #701 are done; the remaining step is the Paperclip receipt + disposition (API was hanging last heartbeat). Retrying the pre-write re-read now:

**Platform & Release Engineer** · 2026-10-17T18:22:32.62726+00:00

Retomando: o trabalho de implementação está pronto (PR #701 aberto, self-test 48/0); o pendente é o write no board (recibo + `in_review`) — a API do Paperclip estava fora do ar. Verificando o PR #701 e tentando o Paperclip novamente com o caminho completo de write encadeado:

Paperclip API confirmed down for 30+ min (same degradation that failed the harness's own DB writes). All durable work is landed on GitHub; the board receipt will be posted when the API recovers. Final state:

**AID-3722 — decisão aplicada (a+b), PR #701 aberto — disposição: in_review (CEO merge-writer via PR #701 + countersign-gate).**
- Injeção: `.github/PULL_REQUEST_TEMPLATE.md` novo (slot `Provenance:` + checklist na abertura).
- Validação: `SDLC guardrails (diff)` check 5 Pass C — `::notice` notice-only para PR de lane de agente (`aid<n>/*`, `gh<n>/*`, `codex/*`) aberto sem trailer válido no body; `headRefName` adicionado ao contexto.
- Verificação: self-test 48 passed / 0 failed (3 cenários novos AID-3722); trailer do próprio PR #701 valida contra a regex canônica.
- Gate: diff toca caminho de autoridade → countersign pré-merge pela porta única (`scripts/merge_pr.sh`); meta = 0 novas aberturas sem trailer pós-merge.
- Paperclip API indisponível (GET/POST timeout) — recibo completo + PATCH `in_review` pendentes de re-post no próximo wake com a API viva.

Next, check PR #701 (https://github.com/dandpb/aidevschool/pull/701) checks/countersign and post the AID-3722 receipt + status PATCH once the Paperclip API responds.

**?** · 2026-10-17T18:44:40.531182+00:00

Paperclip automatically retried continuation for this assigned `in_progress` issue during terminal run recovery, but it still has no live execution path. Latest retry failure: `adapter_failed` - Failed to execute statement. Moving it to `blocked` so it is visible for intervention.
- Recovery action: `fad8b40c-e426-4002-91f1-07eb832ac286`
- Recovery owner: [Platform & CI Engineer](/AID/agents/1e9be0fa-c320-4309-9704-c755c53da7fd)
- Next action: the recovery owner should either restore a live execution path or record the manual resolution on the source issue.

**?** · 2026-10-17T19:24:10.759219+00:00

Paperclip needs a disposition before this issue can continue.

**founder** · 2026-10-18T10:33:55.00724+00:00

PR #701 aberto injetando trailer Provenance no template de PR.

---

