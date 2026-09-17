# SDLC Quest: stable primary button interaction

## Intent and accepted scope
User requested correction of all findings in the 2026-09-17 QA report. The actionable failure is the mobile campaign advance button stability timeout. Missing external integrations and untested browsers are coverage limits, not promised features. No learner/curriculum authority changes.

## Evidence before fix
Canonical mobile campaign failed twice at tests/playtest.py:171. A third diagnostic records 242 animation frames alternating y=743.75 and y=744.75 with hover true/false and translateY(-1px)/none: `.scratch/sdlc-quest-fix-20260917/trace-3.json`. The existing unchanged campaign test is the regression check.

## Plan
1. Remove geometry-changing hover/active translations from `.primary` in src/style.css, preserving hover color and active shadow feedback.
2. Regenerate sdlc-quest.html using tools/build.cjs. Refresh only affected entries in SHA256SUMS.txt; retain historical evidence unchanged.
3. Run a targeted pointer-boundary experiment and the unchanged mobile campaign. Then run the entire canonical gate in an isolated copy, retaining exact logs and fresh screenshots.
4. Independent verifier reviews the diff under REVIEW.md and re-executes package/build/rules and six browser suites against a fresh copy. Preserve the old failed evidence and publish a new report.

## Acceptance
- Primary button bounds remain stable at pointer boundaries, with reduced motion and normal motion.
- Mobile campaign finishes all 18 challenges without forced clicks, retries, increased timeouts or test changes.
- Full gate exits 0; all six browser journeys pass; inputs remain unchanged during verification.
- Package checksum validation succeeds and generated HTML equals build output.

## Boundaries
No unrelated staged changes, commits, pushes, external integrations or weakening tests. No hand edits to the bundle; regenerate it. Existing reports remain historical; new evidence is scoped to this correction.
