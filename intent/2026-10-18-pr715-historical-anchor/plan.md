# Preserve the historical source anchor in PR #715

Authorized scope: the user renewed correction/review of the repository PRs on
2026-10-18. Inspected head: `37ed8717ab0b38e9ac8d376a4707d0cf32831567`.
Independent inspection reproduced that SEQUENCIA.md's source table explicitly
refers to base `d9dbdd5c504ef76a42d3f7944392dccee3eb6351`, whose l28 blob starts
`386c27fe1a6b`. The PR substituted a newer blob in that historical table.

Restore the historical pin and add a separate dated source-note file separating the current l28 v3
anchor (`e88dc1192433`) used by the pg-d03 erratum. Verify both git objects and
that no lesson, rubric, frozen source contract or existing test is modified by
this corrective delta. Request independent review of that exact diff.

This correction does not reconcile #710's frozen pg-d03/pg-d04 contracts with
#715. That requires semantic extraction/anchor/version review and the specific
protected-test authorization described in the independent composition report;
it must not be replaced with silent hash repinning. Native countersign and
normal merge gates remain mandatory.
