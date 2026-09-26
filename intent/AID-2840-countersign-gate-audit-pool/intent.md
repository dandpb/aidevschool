# Intent: countersign-gate audit mode — pre-merge citation pool (AID-2840)

Author: Platform & CI Engineer (agent 1e9be0fa), defect reported by QA Lead
(AID-2833 delta-revalidation, filed as AID-2840) · Change-id:
AID-2840-countersign-gate-audit-pool · Status: accepted (producer design
decision, owner of the gate per AID-2768/AID-2763)

> Paperclip carrier: AID-2840 (parent AID-2833, the countersign run for
> PR #545 head 72dd25b8). The QA finding and evidence live there.

## Problem

PR #545 merged legitimately at `2026-09-26T07:21:21Z` (operative citation
AID-2832 @ 07:19:48Z, gate green @ 07:20:29Z, `merge_pr.sh` revalidated live).
One second after the merge, a DUPLICATE countersign comment (GH `5844221458`
@ 07:21:22Z) landed — tasking for the same re-pin had been assigned to three
issues (AID-2832/2833/2834) and a parallel heartbeat posted its citation after
the merge had already happened. Because "operative = LAST citation over ALL
comments" does not filter by `mergedAt`, the post-merge duplicate became
operative in the audit re-run (job `108361537675`): permanent red artifact on
the merged head, with no possible remedy — every citation posted from then on
is post-merge by definition. QA's only mitigation was EDITING the PR comment
to retract the citation line: pressure to rewrite the audit trail, which is
backwards for an audit gate.

Stage-2 of the SDLC guard (`scripts/sdlc_guard_check.sh`, AID-2428) already
has the right semantics on merged PRs: citations with `createdAt >=
mergedAt` are skipped (`continue`), they don't poison the audit. The
countersign-gate docstring even claims "same Stage-2 ordering rule" — but the
implementation made post-merge citations fatal-by-supersession instead.

## Decision (design owner: producer of the gate)

**Audit mode (mergedAt set) restricts the OPERATIVE-CITATION SELECTION pool
to comments posted strictly BEFORE the merge (`createdAt < mergedAt`; comments
without a timestamp are excluded — fail-closed).** Live mode (open PR) is
unchanged: operative = last citation over the whole conversation (F3
self-cite detection).

Rationale:

1. Different question per mode. Live asks "does the CURRENT conversation
   authorize a merge?"; audit asks "was the merge legitimate AT mergedAt?".
   Comments that did not exist at the merge decision cannot change the
   answer in either direction — including making it look worse.
2. Fail-closed is preserved in every direction that matters: no pre-merge
   citation → red; last PRE-merge citation invalid (self-cite/stale
   head/unresolvable) → red; §7 VOID/HELD and reopened checks still scan the
   WHOLE conversation including post-merge comments (retro-VOID keeps the
   audit red); laundering attempt (pre-merge self-cite + post-merge valid
   cite) stays red.
3. Stage-2 parity: same repository, same rule, already battle-tested.
4. Ends the unrecoverable-red class and the edit-history-to-heal pressure:
   the audit becomes a stable function of the merge-time state.

## Non-goals (tracked separately in AID-2840)

- Assignment dedup guard (one open countersign issue per (PR, head)) —
  Platform & Release Engineer (relayed as child issue).
- Monitor/relay guidance is documented in `docs/sdlc/README.md` (merged-PR
  red gate = audit artifact, do not escalate) — no code.
