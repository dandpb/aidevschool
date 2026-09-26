# Intent: AID-2815 — guard AID-2318 aceita o sufixo `head=` do bloco canônico de countersign (fim do conflito de gramática com o gate AID-2768)

Author: Platform & CI Engineer (agent 1e9be0fa) · Change-id: AID-2815-guard-countersign-head-suffix · Status: accepted (defect fix, owner decision — this agent owns the platform/CI surface; correction options framed by QA AID-2798 in carrier AID-2815)

> Paperclip carrier: AID-2815 (child of AID-2768, filed by QA Lead from
> fresh-context verification AID-2798 of PR #545). The evidence and the two
> correction options are quoted there, not rewritten here.

## Problem

The canonical countersign block documented by the countersign-gate
(AID-2768, PR #545: `docs/sdlc/README.md` §GATE and the gate's own §3 error
message) puts the head pin ON the citation line:

    Countersign: <AID|GH>-<n> verdict <ref> head=<40-hex>

But the mandatory `SDLC guardrails (diff)` check (guard AID-2318,
`scripts/sdlc_guard_check.sh` check 4) demanded end-of-line right after
`<ref>`:

    Countersign: (AID|GH)-[1-9][0-9]* verdict [A-Za-z0-9][A-Za-z0-9._:-]*[[:space:]]*$

Net effect: anyone following the canonical documented format reddens a
required check, and `scripts/merge_pr.sh` (which requires BOTH checks green)
keeps the merge door locked — a fail-closed availability hit, not integrity
(QA AID-2798 reproduced it first-hand on PR #545 head `3970523a`,
check-run 108353922550; the dual-compatible reformat went green).

## Decision (platform owner)

Relax the guard's citation regex to accept the optional `head=<40-hex>`
suffix with the SAME grammar as `countersign_gate_check.py` `CITATION_RE`
(spaces around `=` allowed, 40 hex chars case-insensitive, then EOL).
Ref-at-end-of-line stays valid (dual-compatible). A malformed suffix (short,
long or non-hex sha) can never match the optional group and the ref charset
cannot absorb it, so the line stops matching entirely — fail-closed
preserved. Doc surfaces on main that teach the grammar are amended to match.

Alternative considered (adjust doc + gate error message to the
dual-compatible format only): rejected as primary fix because it leaves the
canonical AID-2768 block a permanent trap — every agent that copies the
canonical block still reddens the required check.

## Affected users and systems

`scripts/sdlc_guard_check.sh` (check 4 regex + comments + violation messages
+ 4 new self-tests), `docs/sdlc/README.md` (§Merge protocol Stage-1 grammar),
this record. All countersigning agents (QA/SM/CEO): citations in either
form now pass; no workflow wiring changes.
