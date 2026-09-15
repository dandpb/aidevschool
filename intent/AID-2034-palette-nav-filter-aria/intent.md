# Intent: Palette contextual ARIA labels for codexDojo nav + filters (PR #434)

Author: google-labs-jules[bot] (Palette, a11y) on founder login · Change-id: AID-2034-palette-nav-filter-aria · Status: accepted-with-cleanup (merge gated on QA countersign; silent-window protocol)

> Originates from Paperclip triage AID-2034 (audit dispatch AID-2033,
> 2026-09-15 19:4xZ→20:4xZ window). Producer record registered by the CEO per
> docs/sdlc/README.md §PRs automatizados (fast path, antes do merge): an open
> bot PR is not a delivery; producer ≠ verifier is never waived.

## Problem

PR #434 (opened 2026-09-15T20:14:55Z) wraps the generic visible text of
`.nav-button` and `.filter-button` in codexDojo with
`<span aria-hidden="true">` and adds contextual `aria-label` + `title`
("Ir para <label>" / "Filtrar por <label>"). Generic terms like "Painel" and
"Todos" lack context when announced out of the visual flow by screen readers.
CI at bot head `a362e444` was green first-hand (39 check-runs = 38 success +
1 expected skip, incl. `SDLC guardrails (diff)` and `product readiness
(claims)`), but the PR carried no Paperclip chain and two root-level debris
files: `test_accessibility.ts` (35-line Playwright test with no
`@playwright/test` dependency anywhere in the repo and no CI wiring — inert at
root) and `test_script.sh` (single line re-running the SDLC diff guard with
`SDLC_ALLOW_TEST_EDIT=1`, a guard-bypass droplet that must not land on main;
root-relic removal precedent: AID-1831, commit `589a1d25`).

## Proposed outcome

Nav and filter buttons in codexDojo announce fully contextual labels to
assistive tech on both surfaces first-hand; the visible text stays unchanged;
`render.test.ts` asserts the new structure; the Palette learning entry
(`.jules/palette.md`) records the pattern; repo root stays clean (both debris
files removed in the pre-merge record commit); no other behavior change.

## Affected users and systems

`engines/codexDojo/src/render/nav.ts` (+2/−1), `roadmap.ts` (+2/−1),
`render.test.ts` (1+1 — existing-test edit, flagged for countersign),
`.jules/palette.md` (+4 learning entry). Removed pre-merge (this record):
root `test_accessibility.ts`, root `test_script.sh`.

## Constraints

Code delta bounded to the two render helpers + the one assertion line;
escapeHtml applied to every interpolated attribute value (bot already did);
merge single-writer with `expected_head_sha` = record head; silent window on
the PR until merge (comment-triggered bot re-save/clobber class, AID-1795);
red does not enter — the full matrix must be green on the record head before
merge.
