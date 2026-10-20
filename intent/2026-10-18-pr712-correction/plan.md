# Correct the PR #712 scheduling boundary

Authorization: renewed user request on 2026-10-18 to correct and integrate eligible
PRs. Base: `3298dd0217844d998c0b6555de3c7f30b3e7af26`. Independent execution found
five complexity violations and functional defects in exact-receipt replay,
refresh of custom roots, malformed receipt validation, and receipt files left
behind after a rejected transition.

Extract small validation/transition helpers without weakening complexity limits
or changing the baseline. Require the declared receipt schema/version, reject
malformed verdicts with PracticeReceiptError, and validate persisted receipt
shape as well as its digest. Treat the exact same conclusion digest as idempotent
before any persistence/scheduling update. Refresh only the actual repo-canonical
state path. Validate existing state before persistence and remove a newly owned
receipt if the resulting transition is rejected. Add new negative tests before
the fix; preserve all existing test/fixture bytes and canonical/derived state.

Proof: new regressions red/green; the existing 27 focused practice/integration
tests; the real Python complexity command; independent review of the exact final
delta. The original PR also fails two legacy snapshot tests because it changes
the snapshot contract. This correction does not edit or silently replace those
tests/goldens; their compatibility/authorization decision remains a merge blocker.
No native countersign, producer identity, owner acceptance or protected override
is inferred from this plan. No live resolver or denied service is accessed.

Independent follow-up identified two residual historical cases. Bind each stored
receipt to its own unit/review identity without requiring today's catalog version,
and select the response review by the submitted receipt digest, including replay
of A after a later B. Two additional tests in a new file fail before these fixes.
