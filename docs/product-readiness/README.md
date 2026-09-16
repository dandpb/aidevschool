<!-- DO NOT EDIT BY HAND: generated from canonical product-readiness sources -->

# Product Readiness

Regenerate with `python3 docs/product-readiness/tools/cli.py render`.
Readiness is a customer-journey claim; it is not learner completion, evidence, verification, or mastery.

| Use case | Surface | Intended tier | Current outcome | Granted tier | Verified at | Revalidate by | Evidence scope | Reasons/gaps | Promise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dojotoday-daily-guidance` | dojoToday | `customer-ready` | `downgraded` | `-` | `2026-09-16T20:55:00+00:00` | `2026-10-16` | `2026-09-16T17:05:00Z-dojotoday-active-unit-guidance-mixed-8eb0ada0`, `2026-09-16T17:05:00Z-dojotoday-read-only-boundary-observed-8eb0ada0`, `2026-09-16T17:05:00Z-dojotoday-returning-next-day-mixed-8eb0ada0` | mechanical stale window: grant 2026-09-16-8eb0ada0-claims-regrant-v83 (pass/customer-ready @ 8eb0ada0, verified 2026-09-16T17:05:00Z) predates PR 460 merge 58098bb5 (2026-09-16T20:35:27Z) which changed engines/dojoToday/src/main.ts under this use case's sourcePaths; CI first-hand: product readiness (claims) STALE-WINDOW for the 3 scenarios (source fingerprint stale) on main push run 35147464091 @ 58098bb5; re-grant deliberately withheld pending mutation guard AID-2205 (numeric-fields escapeHtml, chain 262/264/265 precedent requires the guard landed before independent re-validation); no pass/customer-ready without independently accepted evidence on the current tree | Read the current schedule, understand due reviews and the active unit, and follow the documented next action. |
| `literacy-standalone-corridor-mod01-03` | literacyDojo | `customer-ready` | `pass` | `customer-ready` | `2026-09-16T23:00:00+00:00` | `2026-10-16` | `2026-09-16T20:43:52Z-literacy-corridor-grandfathered-return-cabdc4a1`, `2026-09-16T20:43:52Z-literacy-corridor-resume-mid-module-cabdc4a1`, `2026-09-16T22:55:00Z-literacy-corridor-gate-retry-mixed-cabdc4a1`, `2026-09-16T22:55:00Z-literacy-corridor-happy-path-mixed-cabdc4a1`, `2026-09-16T22:55:00Z-literacy-corridor-review-window-mixed-cabdc4a1` | - | Progress continuously through modules 1-3 (11 lessons), pass each module challenge, return for spaced reviews on the [1,7,21] schedule, and understand the local result and next action. |
| `literacy-standalone-first-lesson` | literacyDojo | `customer-ready` | `pass` | `customer-ready` | `2026-09-16T23:00:00+00:00` | `2026-10-16` | `2026-09-16T22:55:00Z-literacy-happy-path-mixed-cabdc4a1`, `2026-09-16T22:55:00Z-literacy-resume-mixed-cabdc4a1`, `2026-09-16T22:55:00Z-literacy-retry-mixed-cabdc4a1` | - | Complete an assigned lesson, recover from an incorrect attempt, and understand the local result. |
| `minitown-explore-only` | miniTown | `experimental` | `pass` | `experimental` | `2026-09-16T23:00:00+00:00` | `2026-10-16` | `2026-09-16T22:55:00Z-minitown-explore-only-mixed-cabdc4a1` | - | Explore the local town simulation without a lesson, persistence, progression, evidence, or mastery promise. |
| `os-literacy-guided-mission` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-16T23:00:00+00:00` | `2026-10-16` | `2026-09-16T22:55:00Z-os-literacy-hosted-mission-mixed-cabdc4a1`, `2026-09-16T22:55:00Z-os-literacy-returning-device-mixed-cabdc4a1`, `2026-09-16T22:55:00Z-os-verification-recovery-mixed-cabdc4a1` | - | Choose an AI track, complete its hosted LiteracyDojo mission, and understand the host result and next action. |
| `os-returning-learner` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-16T23:00:00+00:00` | `2026-10-16` | `2026-09-16T22:55:00Z-os-onboarding-track-choice-mixed-cabdc4a1`, `2026-09-16T22:55:00Z-os-returning-device-mixed-cabdc4a1`, `2026-09-16T22:55:00Z-os-returning-recovery-mixed-cabdc4a1` | - | Resume the supported local OS state on the same device without repeating completed setup. |
| `os-voxel-guided-missions` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-16T23:00:00+00:00` | `2026-10-16` | `2026-09-16T22:55:00Z-os-renderer-accessibility-recovery-mixed-cabdc4a1`, `2026-09-16T22:55:00Z-os-voxel-hosted-missions-mixed-cabdc4a1`, `2026-09-16T22:55:00Z-os-voxel-returning-device-mixed-cabdc4a1` | - | Launch each supported hosted voxelDojo mission and receive an accurate host status without a false mastery claim. |
| `pixelquest-evidence-encounter` | PixelQuest | `customer-ready` | `pass` | `customer-ready` | `2026-09-16T23:00:00+00:00` | `2026-10-16` | `2026-09-16T22:55:00Z-pixelquest-encounter-evidence-mixed-cabdc4a1`, `2026-09-16T22:55:00Z-pixelquest-evidence-recovery-observed-cabdc4a1`, `2026-09-16T22:55:00Z-pixelquest-returning-evidence-handoff-mixed-cabdc4a1` | - | Complete a documented encounter, locate its raw evidence, and hand it to the independent verifier. |
| `voxel-standalone-learning-loop` | voxelDojo | `customer-ready` | `pass` | `customer-ready` | `2026-09-16T23:00:00+00:00` | `2026-10-16` | `2026-09-16T22:55:00Z-voxel-accessible-renderer-observed-cabdc4a1`, `2026-09-16T22:55:00Z-voxel-standalone-loop-mixed-cabdc4a1`, `2026-09-16T22:55:00Z-voxel-standalone-return-reentry-mixed-cabdc4a1` | - | Complete the deterministic loop in each declared standalone game and locate raw evidence for independent verification. |

## Status note

`unassessed` means the intended promise has canonical scenarios and guides but no promoted independent assessment.
Published decisions can also be `pass`, `conditional-follow-up`, `downgraded`, `blocked`, or `stale`.
A runnable engine or passing producer test does not grant a readiness tier.

## Canonical sources

- `policy.yaml` owns tiers, severity treatment, outcomes, and freshness rules.
- `inventory.yaml` owns intended promises and use-case scope.
- `scenarios/*.yaml` own executable and observed journey contracts.
- `evidence/results.ndjson` owns append-only promoted scenario facts.
- `assessments/*.yaml` own immutable independent decisions.
- `student-guide.md` and `facilitator-guide.md` own audience guidance.

## Tier elevation and supersession

The current-tier gate in `tools/validate.py` binds only the latest decision per use case (newest `verifiedAt`).
After an intended-tier elevation, strictly older decisions are superseded history: they still obey every
integrity rule (outcome/tier coherence, known runs, duplicate protection) and are exempt only from equality
with the current `intendedTier`, so the gate closes with the new assessment alone — no manual rewrite of past
assessments. Decisions sharing the newest `verifiedAt` all face the gate (fail-closed). A bump without a newer
re-grant stays red with exactly one wrong-tier error on the latest decision, and the claim stales until
re-granted via `enforce`.
