# Plan: AID-1000-validate-elevation-supersession

Status: approved (small-fix fast path; self-verification below, QA countersign pending) ·
Implements `intent.md` in this directory.

## Files that change

1. `docs/product-readiness/tools/validate.py` — add `_latest_decision_time(domain)`:
   per use case, the newest `verifiedAt` among assessments deciding it. In the decision
   loop, a decision whose assessment time is strictly earlier is `superseded`; the
   `granted_tier is not intended_tier` error fires only when `not superseded`. All other
   rules unchanged.
2. `docs/product-readiness/tests/test_elevation_supersession.py` (NEW) — four tests:
   elevation + re-grant needs no migration; bump without re-grant fails closed on exactly
   the latest decision; superseded decisions keep outcome/tier coherence; superseded
   decisions keep run-reference integrity.
3. `intent/AID-1000-validate-elevation-supersession/` — this record.

## Order of work

Attempt-first: wrote the tests against the unfixed validator (2 failed: both elevation
tests), then applied the validate.py change (4 passed).

## Proof (executed 2026-09-07)

- Pre-fix, new tests: `2 failed, 2 passed`.
- Post-fix, full suite: `36 passed` (32 pre-existing + 4 new).
- Canonical CLI: `python3 docs/product-readiness/tools/cli.py check` →
  "Product-readiness sources and generated matrix are valid and in sync." (rc=0, no
  re-render needed; no generated file drifted).
- Acceptance replay (incident reproduction): restored the REAL pre-migration
  v4/v26/v28/v33 assessment files from `4407546^` into the current 40-assessment domain
  and ran `validate_domain`: pre-fix 10 `grants the wrong tier` errors (the exact AID-988
  finding), post-fix 0 errors. runIds/results.ndjson untouched (in-memory swap only).
- Fail-closed: bumping `dojotoday-daily-guidance` intended tier to `validated-journey`
  without a newer re-grant yields exactly 1 wrong-tier error, naming v35 (the latest).

## Risks

- Equal `verifiedAt` on two assessments deciding the same use case: neither supersedes
  the other, so both face the current-tier gate (deterministic, fail-closed).
- A superseded decision that granted a tier inconsistent with the intent of its own time
  is no longer flagged: history is treated as immutable evidence, and the live claim is
  governed solely by the latest decision + `enforce` freshness/fingerprint gates
  (inventory.yaml is inside every `source_fingerprint`, so a bump still auto-stales the
  current claim until re-granted). Accepted trade-off; recorded in intent.md.

## Addendum (AID-1001 acceptance, 2026-09-07)

AID-1001 requires the elevation convention documented in `docs/product-readiness/README.md`.
That README is a generated projection (`render.py` → `cli.py render`), so the canonical
path is a static section in `tools/render.py` (`## Tier elevation and supersession`)
followed by regeneration; `cli.py check` confirms sources and matrix in sync. Full suite
re-run after the change: 36 passed.
