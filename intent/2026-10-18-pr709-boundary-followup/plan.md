# PR #709: remaining canonical-boundary checks

The user renewed authorization to correct and integrate eligible PRs on 2026-10-18.
Base inspected: `d514021ee5800ecfc830157322d6b2d1214bcd28`.
Independent review reproduced three gaps in the canonical fallback: producer
records rejected by the existing evidence validator can yield PASS; attempt paths
rejected by the canonical attempt resolver can yield PASS; and the last failed
gate can yield PASS from a contradictory receipt.

Plan: reuse `validate_teaching_evidence_structure` and `secure_attempt_path`, and
reject a PASS receipt that does not agree with a recognized passing gate outcome.
Preserve digest/ownership/NDJSON compatibility, actual FAIL and the existing
challenge ledger precedence. Add regression tests before the correction, then run
the fallback, evidence and nearby gate tests; request independent final-diff
review. No existing test, threshold, generated view, canonical learner state or
gate policy will change. The old local #689 patch remains unpublished; its
protected-test authorization is still pending and is not supplied by this task.

Publication requires a stable current head, accurate contribution metadata,
independent review, and the normal native countersign/merge gates. This plan does
not invent a native run/session or remove the external gate blocker.
