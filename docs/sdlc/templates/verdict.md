# Verdict / citation templates (countersign comments on GitHub)

Canonical shapes for the agent-posted process comments of the countersign
chain — the QA verdict comment and the citation comment. Both carry the
**provenance trailer** (AID-2493; §Merge protocol item 6 in
`docs/sdlc/README.md`): the shared GitHub credential cannot attribute a
comment, so the trailer is the in-thread attribution record.

Trailer format (one standalone line, keys in this order):

```
Provenance: agent=<slug> task=<AID-ID|GH-n> run=<runId> session=<sessionId>
```

- `agent`: board role slug of the poster (`qa-lead`, `platform-ci`, …);
- `task`: the Paperclip carrier the comment acts on (or `GH-<n>`);
- `run` / `session`: the heartbeat-run id and session executing the work
  (first 8 chars are enough when the full id is unwieldy, as long as the
  value stays non-empty and charset-clean).

The `SDLC guardrails (diff)` check parses the trailer in PR context and
emits an auditable `::notice` with the fields; a process comment without a
valid trailer gets a `::notice` (advisory in the current phase).

## Verdict comment (fresh-context countersign)

```markdown
## Veredito QA countersign fresh-context (PRÉ-merge) — <CONFORME/NÃO CONFORME> @ <head-sha>
<merge GO / NO-GO — gates binding no placar, cada um GO/NÃO>

Countersign <AID-ID> (QA Lead <uuid-curto>, despachado por <issue de despacho/auditoria>).
Head pinado `<sha>` · base `<sha>` · diff: <paths>.

<Métricas de verificação first-hand: comandos, resultados, evidências>

Provenance: agent=qa-lead task=<AID-ID> run=<runId> session=<sessionId>
```

## Citation comment (canonical countersign line)

Post BEFORE the merge (Stage-2 ordering, AID-2428). Include the
GH-resolvable line whenever the Paperclip API token is not wired in CI
secrets (AID-2423 pending):

```markdown
Countersign: <AID-ID> verdict <commentId-ou-SHA>
Countersign: GH-<PR-n> verdict <verdict-comment-id>

Linha 1 (canônica): veredito Paperclip `<ref>` na <AID-ID> (assignee QA) —
<CONFORME/GO> @ `<head>` (<timestamp>).
Linha 2 (CI-resolvível via GitHub API): veredito <comment-id> neste PR.

Provenance: agent=qa-lead task=<AID-ID> run=<runId> session=<sessionId>
```

## Producer registry comment (gate (a) analog)

```markdown
**Registro do producer (<papel> <uuid-curto>, <AID-ID>, <timestamp>).**
Implementação no head `<sha>` (base `<sha>`): <resumo + self-verification>.
Intent/registro: `intent/<change-id>/`.

Provenance: agent=<slug> task=<AID-ID> run=<runId> session=<sessionId>
```
