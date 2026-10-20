# Refresh PR #709 against accepted main

The user authorized corrections and branch updates; the renewed delegation
explicitly prioritizes #709. Inspected PR head:
`1286529eea3c928e4665ee71cd3b3311c0c960fb`; accepted main:
`a9906cb3486278067be82e4dd23f4a252a406413`.

Merge accepted main without rewriting history. Preserve the existing fallback
and STACKS fixes, all prior regression tests and the accepted main work. Resolve
any documentation overlap by preserving both contributions; do not alter tests,
thresholds, canonical state, protections or provenance records.

Run the fallback/evidence/late-game test files affected by the integration and
the relevant complexity check. Verify the functional files remain byte-identical
to the inspected PR head. Review/simplify the merge and obtain a distinct
verifier's review of the exact new commit before publication. Re-read remote
head/activity before a normal fast-forward push and confirm the remote result.

The QA AID-5055 citation of `1286529e` is historical after this update. The
cross-wired AID-5061 citation was explicitly VOID; neither is a countersign of
the resulting head. New CI/native countersign and the sole merge door remain
mandatory; no denied external registry access is authorized by this plan.

Producer verification: merge was conflict-free; the two functional source files
and all four existing regression files remain byte-identical to1286529e.
`pytest curriculum/_shared/tests learner/gate/tests/test_late_games_evaluators.py
-q` passed94 tests. The exact CI complexity command (all five configured roots,
frozen baseline, max8) passed. A preliminary narrow scan with the global baseline
was not a valid CI invocation: it reports baseline entries outside that scan as
stale. It also exposes existing curriculum helper complexity outside the CI
scan set; none of those functions changed in this refresh. No baseline changed.
Review/simplification adds no functional code; independent final-commit review
is still required. `/simplify` is unavailable in this environment.
