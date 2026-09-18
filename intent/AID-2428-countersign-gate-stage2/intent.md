# Intent: countersign gate Stage 2 — citation required for EVERY bot/agent PR + pre-merge ordering (fail-closed)

Author: Platform & CI Engineer (agent 1e9be0fa), dispatched as AID-2428 (GO CEO AID-2426/D3) · Change-id: AID-2428-countersign-gate-stage2 · Status: accepted (owner decision recorded in AID-2426/D3)

> Paperclip carrier: AID-2428 (parent AID-2318). The CEO decision text is
> quoted there, not rewritten here.

## Problem

Stage 1 (PR #482, merge `ed12c515`, live 2026-09-18T11:17:45Z) gates only
process-authority paths. The first subsequent bot merge already violated the
citation discipline: PR #495 merged at `ccd42d6f` (11:40:31Z) with zero
`Countersign:` lines in the merge message — the third occurrence of the
missing-canonical-line class (#481 → #491 → #495). Coaching-only follow-up
did not hold the discipline; the only anti-recurrence control that proved
itself in the window was mechanical (the fail-closed guard catching a
credential-shaped `.env.example` in #495). Bot PRs with "bounded engine-only"
diffs (e.g. #483/AID-2333) were exempt from the citation gate even though
producer ≠ verifier is never waived.

## Proposed outcome

The canonical guard check 4 extends its trigger set: in PR context the
`Countersign: <AID-ID> verdict <ref>` citation is required when the diff
touches process-authority paths (Stage 1, unchanged) OR the PR author is a
bot/agent account (Stage 2, ANY diff — the engine-only exemption is gone).
Ordering becomes mechanical: the cited verdict must be posted strictly
BEFORE the merge — on a merged PR only comment citations with
`createdAt < merged_at` count; a body-trailer citation on a merged PR has no
verifiable posting time and fails closed. Valid citations emit an auditable
`::notice` carrying the posting time; everything ambiguous stays red.

## Affected users and systems

`scripts/sdlc_guard_check.sh` (gate), `.github/workflows/ci.yml` (comment
only — gh + permissions already wired by Stage 1), `docs/sdlc/README.md`
(§Merge protocol item 5, one amendment paragraph), this record. All agents
and the founder: every bot/agent PR now needs a posted, resolvable verdict
citation pre-merge.

## Constraints

- Fail-closed in every ambiguity (no context source, no resolver,
  unresolvable id, unverifiable ordering) — same direction as AID-2292.
- Hermetic self-test: no network; AID existence via the stub resolver;
  PR context via SDLC_PR_CONTEXT_FILE (full JSON: author, body, comments
  with createdAt, mergedAt) with the legacy SDLC_COUNTERSIGN_FILE kept for
  Stage-1 scenarios.
- Human/founder PRs without process-authority paths stay out of scope
  (documented behavior, self-test iv) — not expanded in this stage.
- SIGPIPE-safe text handling (AID-2292) preserved: citation TSV is written
  to a file and grepped, never piped through `grep -q`.
- Founder pending `8d741529` (override tightening, carrier AID-2292) is
  explicitly NOT addressed here.

## Open questions

- Stage 3 candidates (not decided here): verifying the cited comment id
  exists in the carrier thread (comment-level verification), and expanding
  the gate to human PRs.
