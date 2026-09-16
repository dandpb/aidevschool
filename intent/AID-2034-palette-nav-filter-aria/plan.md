# Plan: Palette contextual ARIA labels for codexDojo nav + filters (PR #434)

Change-id: AID-2034-palette-nav-filter-aria · From: intent/AID-2034-palette-nav-filter-aria/intent.md · Status: accepted (decision AID-2034, audit AID-2033; merge gated on QA countersign)

## Files that change

Code (the a11y change itself, by the Palette bot):
- `engines/codexDojo/src/render/nav.ts` (+2/−1) — `aria-label`/`title` = "Ir para <label>", visible text wrapped in `<span aria-hidden="true">`, all interpolations through `escapeHtml`.
- `engines/codexDojo/src/render/roadmap.ts` (+2/−1) — same pattern for `.filter-button` with "Filtrar por <label>".
- `engines/codexDojo/src/render.test.ts` (+1/−1) — strict assertion updated from `>Projeto</button>` to `><span aria-hidden="true">Projeto</span></button>`. Existing-test edit: countersign must confirm it does not weaken the assertion (policy AID-554; trailer below registers owner acceptance).
- `.jules/palette.md` (+4) — dated learning entry consistent with the file's established format.

Removed in the pre-merge record commit (this change, by the CEO as record producer):
- `test_accessibility.ts` (root) — unwired Playwright test (no `@playwright/test` dependency in the repo; not executed by any CI job). Debris; a runnable a11y suite can be re-proposed as scoped follow-up.
- `test_script.sh` (root) — `SDLC_ALLOW_TEST_EDIT=1 scripts/sdlc_guard_check.sh --base origin/main`; a guard-bypass droplet that must not land on main (root-relic precedent AID-1831 `589a1d25`).

Producer record (this file + intent.md) — committed to the PR branch before merge.

## Order of work

1. A11y edits in nav.ts / roadmap.ts / render.test.ts + palette.md entry (Palette bot, original PR commits `6fc3a03b`, `a362e444`).
2. Record commit on the PR branch: intent/ + plan/ + removal of the two root debris files (this commit).
3. QA countersign fresh-context against this plan — verdict on Paperclip ONLY (silent window: no PR comments until merge; clobber class AID-1795).
4. Merge single-writer with `expected_head_sha` = record head; abort to fallback (close + scoped re-proposal) if the head moves.

## Risks

- Bot re-save clobber during verification — mitigated by silent window + QA head-guard + `expected_head_sha` merge guard (race-safe: a clobbered head fails the merge cleanly).
- The `aria` attribute from `currentAttrs`/`pressedAttrs` (aria-pressed/aria-current) coexisting with the new `aria-label` — countersign verifies the composed attribute string first-hand (no duplicate/contradictory aria attributes).
- Double announcement (label + hidden span) — by design per WAI-ARIA: `aria-label` overrides, `aria-hidden` span suppresses the redundant visible text.

## Proof

- CI at bot head `a362e444` (verified first-hand at triage, 2026-09-15 ~20:3xZ): 39 check-runs = 38 success + 1 expected skip (`pixelDojo games/${{ matrix.game.name }}`), incl. `SDLC guardrails (diff)` success, `product readiness (claims)` success, `codexDojo (TS)` success.
- Merge-base of the PR branch = `2e90b64e` = origin/main tip at triage time (anchored, `mergeable_state: clean`).
- After the record commit: same matrix must be green on the new head before merge (hard rule: red does not enter).

## Verification split

QA Lead (Paperclip ca6a3f95) verifies fresh-context against this plan +
intent: (1) diff-boundedness — exactly the 4 bot files + this record, root
clean of `test_accessibility.ts`/`test_script.sh` in the final merge range;
(2) a11y semantics first-hand (composed aria attributes on `.nav-button` and
`.filter-button`, no duplicate aria-label, hidden spans present, escapeHtml
preserved); (3) the render.test.ts edit strengthens rather than weakens the
assertion (flag from audit AID-2033); (4) CI green on the record head
(incl. guard + claims); (5) head stability (re-check headRefOid before the
verdict). Verdict posted on Paperclip ONLY — no PR #434 comments until merge.
Producer (Palette bot authoring; CEO registering + cleaning) ≠ verifier,
never waived.

SDLC-ALLOW-TEST-EDIT: AID-2034
