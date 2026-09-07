# Intent: validate.py treats tier elevation natively (auto-superseded history)

Author: Paperclip AID-1000 (product debt from the AID-988 countersign discovery, comment
353b7244 in AID-994) · Change-id: AID-1000-validate-elevation-supersession
· Status: accepted (scope and acceptance criteria in the AID-1000 issue body; owner FPE,
priority low/backlog)

> One source of truth: the AID-1000 issue body. Done = "Bump de intendedTier em 1 use case
> não requer migração manual para o CI fechar verde" + "Trilha auditável preservada
> (runIds/results.ndjson intactos; motivo de supersessão visível)".

## Problem

`validate_domain` (`docs/product-readiness/tools/validate.py`) checked every historical
assessment decision against the use case's CURRENT `intendedTier`. After the AID-987/T1
elevation (PR #290), pre-bump `pass`/`validated-journey` decisions in v4/v26/v28/v33
became permanent `grants the wrong tier` errors, so closing CI green required a manual
data-only migration (`outcome: stale`, `grantedTier: null`, supersession reason) executed
in the v34 sweep (commit `4407546`). History is append-only evidence; the validator was
forcing QA to rewrite it on every elevation.

## Proposed outcome

The current-claim tier gate binds only the LATEST assessment decision per use case (by
`verifiedAt`; ties both count as latest, fail-closed). Strictly earlier decisions covering
the same use case are superseded history: they keep every integrity rule (outcome/tier
coherence, known run references, duplicate/unknown checks) but no longer must equal the
current intended tier. A tier bump plus a fresh re-grant at the new tier therefore closes
green with no migration; a bump WITHOUT a re-grant still fails closed, with exactly one
precise error on the latest decision.

## Affected users and systems

`docs/product-readiness/tools/validate.py` and a new test file only. No inventory, policy,
scenarios, guides, assessments, or generated views change (fingerprints do not cover
`tools/`; `cli.py check` stays in sync untouched).

## Constraints

- New test file only (no edits to existing tests) → no `SDLC-ALLOW-TEST-EDIT` trailer.
- Fail-closed preserved: elevation without re-grant must stay red; supersession exempts
  only the tier-equality rule, never coherence or audit-trail links.
- Producer ≠ verifier: FPE implements; QA Lead countersigns the PR before merge.

## Open questions

None. The acceptance replay (below) restores the real pre-migration v4/v26/v28/v33 from
git history and validates the 40-assessment domain with zero errors.
