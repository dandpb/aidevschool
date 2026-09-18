# Intent: mechanical anti-3rd-occurrence gate — 'Countersign:' citation required by the CI guard for process-authority paths

Author: CEO gate AID-2316 item (c), dispatched as AID-2318 (FPE) · Change-id: AID-2318-countersign-gate · Status: accepted (owner decision recorded in AID-2316)

> Paperclip carrier: AID-2318 (parent AID-2316, audit AID-2312). The CEO
> decision text is quoted there, not rewritten here.

## Problem

Two merges of the class "shipped without pre-merge verdict" already happened
(#460/AID-2201 → amendment AID-2219; #478/AID-2292 → escalation AID-2316).
The existing controls (checklist §Merge protocol item 4, update-branch,
required contexts) are procedural: a merge-writer can pass through them
without posting an independent verdict, and nothing in CI notices. A third
occurrence would be a process failure with no mechanical backstop.

## Proposed outcome

The canonical CI guard (`SDLC guardrails (diff)`, a required context on every
PR) turns red when a PR-context diff touches process-authority paths and the
PR carries no resolvable `Countersign: <AID-ID> verdict <ref>` citation
(Paperclip comment id or SHA of the verdict). A valid citation emits an
auditable `::notice`. Because the check is required pre-merge, a green run is
mechanical evidence that the citation existed before the merge. The §Merge
protocol doc records the binding rules (merge-writer set; merge-commit
citation) that the gate partially enforces.

## Affected users and systems

`scripts/sdlc_guard_check.sh` (guard), `scripts/sdlc_aid_resolve.sh` (new
resolver), `.github/workflows/ci.yml` (wiring: gh + Paperclip board key),
`docs/sdlc/README.md` (§Merge protocol item 5). All agents and the founder:
any PR touching `scripts/sdlc_guard_check.sh`, `scripts/sdlc_aid_resolve.sh`,
`docs/sdlc/**`, `.github/workflows/**`, `intent/README.md`.

## Constraints

- Fail-closed everywhere (no citation source, no resolver, unresolvable id
  ⇒ red), consistent with AID-2292 direction. Push runs of main are not gated
  (the pre-merge required context already ran).
- Hermetic self-test: no network; AID existence via stub resolver; citation
  source via SDLC_COUNTERSIGN_FILE.
- Stage 2 (gate every bot/agent PR) is explicitly OUT of scope; the founder
  pending 8d741529 (override tightening) stays in carrier AID-2292.
- SIGPIPE-safe text handling (AID-2292): grep reads from files, never
  `printf | grep -q`.

## Open questions

- Stage 2 timing and shape (decide after Stage 1 observed — CEO, AID-2318).
- Whether the resolver should also verify the cited comment id exists in the
  carrier thread (Stage 1 verifies the AID; comment-level verification is a
  candidate Stage 2 hardening).
