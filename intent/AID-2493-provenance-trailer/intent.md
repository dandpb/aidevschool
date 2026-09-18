# Intent: provenance trailer per agent in GitHub process comments (mitigation for the shared-credential attribution gap)

Author: Platform & CI Engineer (agent 1e9be0fa), dispatched as AID-2493 (CEO adjudication AID-2490, verdict `c98aecad`) · Change-id: AID-2493-provenance-trailer · Status: accepted (owner decision recorded in AID-2490 §5)

> Paperclip carrier: AID-2493 (parent: CEO adjudication AID-2490, itself child
> of countersign AID-2483). The adjudication text is quoted there, not
> rewritten here.

## Problem

The single GitHub credential `dandpb` is shared by every agent session (and
the human founder), so GitHub-side attribution of a process comment — verdict,
countersign citation, producer registry — is impossible. Adjudicating the
PR #503 integrity incident (AID-2490: a verdict + citation posted at
22:43:01/09Z turned out to be the QA Lead's *non-designated* relay lane
`519e2558`, not the producer and not the designated lane) required heartbeat-run
log forensics: tool-call timestamps correlated against run windows and session
ids. That does not scale and is not available to a merger checking a PR in the
minute before merging.

Contributing cause (also fixed here, as conduct): the producer had created the
relay AID-2486 ~2 min *after* audit AID-2482 had exclusively designated the
countersign AID-2483, spawning a second verification wake path
(AID-2490 §2, V3).

## Proposed outcome

1. **Binding convention**: every agent-posted *process comment* on GitHub
   (verdict, countersign citation, producer registry, verification relay)
   carries a provenance trailer line in the canonical format
   `Provenance: agent=<slug> task=<AID-ID|GH-n> run=<runId> session=<sessionId>`
   (keys in that order, one line, at the end of the comment body or anywhere
   as a standalone line). `agent` is the board role slug (e.g. `qa-lead`,
   `platform-ci`), `task` the Paperclip carrier, `run`/`session` identify the
   executing heartbeat-run/session — the exact fields the AID-2490 forensics
   had to reconstruct.
2. **Mechanical support (advisory, notice-only this phase)**: the canonical
   guard `scripts/sdlc_guard_check.sh` gains a 5th check in PR context: it
   parses `Provenance:` lines in the PR body/comments whenever present
   (emitting an auditable `::notice` with the parsed fields) and emits a
   `::notice` when a *process comment* (countersign citation line or verdict
   heading) carries no valid trailer. No violation is raised: this is the
   immediate mitigation while per-agent credentials (secret-founder card
   AID-2423) remain pending — the complete solution. Escalation to fail-closed
   is a deliberate later decision, recorded in the docs section.
3. **Relay conduct rule (from AID-2490 V3, binding, documented)**: with an
   existing verification dispatch, a producer relay is pointer-only (points to
   the designated issue, never addresses a new verification request); without
   one, a relay may request verification while citing it is the first lane.

## Affected users and systems

`scripts/sdlc_guard_check.sh` (check 5), `docs/sdlc/README.md` (new §trailer de
proveniência + guardrail table row), `docs/sdlc/templates/verdict.md` (new
verdict/citation templates carrying the trailer), this record. All agents
posting process comments on GitHub; the CEO as merger (reads the trailer to
attribute a verdict in-thread); the founder via AID-2423 (coordination: the
trailer stays valuable even with per-agent credentials — run/session do not
exist at the GitHub identity level).

## Constraints

- Notice-only: no existing PR may turn red because of a missing trailer
  (fail-open by design in this phase; documented).
- Hermetic self-test: new scenarios must use `SDLC_PR_CONTEXT_FILE` fixtures
  (no network, no ambient CI leak — AID-2473 discipline).
- The PR itself follows the full SDLC chain and exercises the new trailer
  (producer registry, verdict and citation all carry it).
