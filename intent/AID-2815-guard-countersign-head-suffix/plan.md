# Plan: AID-2815 guard countersign head suffix

Author: Platform & CI Engineer (agent 1e9be0fa) · Change-id: AID-2815-guard-countersign-head-suffix · Status: approved (small-fix scope, defect with workaround — recorded per playbook)

## Files that change

1. `scripts/sdlc_guard_check.sh`:
   - check 4 `citation_re`: append optional group
     `([[:space:]]+head[[:space:]]*=[[:space:]]*[0-9a-fA-F]{40})?` before the
     trailing `[[:space:]]*$` — mirrors `countersign_gate_check.py`
     `CITATION_RE` grammar; both forms (ref-at-EOL, ref+head pin) parse;
   - header + check-4 comments and the two countersign violation messages
     updated to the dual grammar `[head=<40-hex>]` (AID-2815 noted);
   - +4 self-tests (Stage-1 authority-path source, stub resolver AID-9006):
     canonical `head=<40-hex lowercase>` → pass; `head = <40-hex UPPERCASE>`
     (spaced `=`) → pass; short 7-hex suffix → fail; long 41-hex suffix →
     fail. 41 → 45 expected.
2. `docs/sdlc/README.md` — §Merge protocol, Stage-1 enforcement paragraph:
   grammar now `Countersign: <AID-ID> verdict <ref> [head=<40-hex>]` with the
   equivalence note (AID-2815).
3. `intent/AID-2815-guard-countersign-head-suffix/` — this record.

## Verification

- `bash scripts/sdlc_guard_check.sh --self-test` hermetic: 45/45 expected
  (no network; stub resolver);
- targeted ERE probe outside the self-test: both citation forms match the
  new `citation_re`; `head=3970523` (short) and 41-hex do NOT match.

## Sequencing constraint (recorded decision)

Branch cut from `origin/main` ONLY — never from `aid-2768/countersign-gate`
(push would move PR #545's head `3970523a` and invalidate the pinned
countersign). Merge order: AFTER PR #545 (update-branch then re-countersign
is the designed fail-closed path, not a defect). On this PR's own
`SDLC guardrails (diff)` run, the workflow copy comes from this branch —
the fixed regex validates the very citation that unblocks it (dogfooding).

## Rollout

Producer (platform-ci) ≠ verifier (QA countersign, canonical form) ≠ merger
(SM via `scripts/merge_pr.sh`). After merge, the workaround noted in PR #545
(head pin as bare SHA on its own line) becomes unnecessary; both citation
surfaces green with the canonical block.
