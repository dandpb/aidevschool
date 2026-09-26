# Plan: AID-2840 countersign-gate audit-mode pre-merge pool

Author: Platform & CI Engineer (agent 1e9be0fa) · Change-id:
AID-2840-countersign-gate-audit-pool · Status: approved (small-fix scope,
defect fix on own gate; QA countersign required to merge as always)

## Files that change

1. `scripts/countersign_gate_check.py`
   - `evaluate()`: when `mergedAt` is set, build the citation pool from
     comments with `createdAt AND createdAt < mergedAt` before the
     operative=last loop; new no-citation message for audit mode names
     mergedAt and the pre-merge-only rule;
   - docstring contract §1/§6/§7 updated (pool rule + whole-conversation
     VOID/HELD scan);
   - self-test: +4 cases (21–24): post-merge duplicate ignored (the exact
     AID-2840 scenario), post-merge-only citation fails, post-merge VOID
     still reddens, pre-merge self-cite stays operative despite post-merge
     valid cite. Existing 20 cases unchanged (case 17 keeps rc=1 via the new
     no-pre-merge-citation path).
2. `docs/sdlc/README.md` — §GATE pré-merge mecânico: new subsection
   "Modo auditoria pós-merge (AID-2840)" (pool rule, fail-closed matrix,
   monitoring guidance: merged-PR red = audit artifact, not an escalation);
   item 6 of the acceptance contract cross-references it.
3. `intent/AID-2840-countersign-gate-audit-pool/` — this record.

## Verification

- `scripts/countersign_gate_check.py --self-test` → 24/24 (was 20/20).
- Live-data regression matrix on PR #545 (hermetic `--context`):
  - old code × original timeline (duplicate post-merge citation present,
    reconstructed from QA's pre-retraction capture) → FAIL, byte-identical
    message to the production red artifact (job 108361537675);
  - new code × same timeline → PASS (operative = AID-2832 pre-merge);
  - new code × current live timeline (post-retraction) → PASS (no
    regression);
  - old code × current live timeline → PASS (no regression).
- No workflow change (`.github/workflows/countersign-gate.yml` untouched).
