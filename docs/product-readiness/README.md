<!-- DO NOT EDIT BY HAND: generated from canonical product-readiness sources -->

# Product Readiness

Regenerate with `python3 docs/product-readiness/tools/cli.py render`.
Readiness is a customer-journey claim; it is not learner completion, evidence, verification, or mastery.

| Use case | Surface | Intended tier | Current outcome | Granted tier | Verified at | Revalidate by | Evidence scope | Reasons/gaps | Promise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dojotoday-daily-guidance` | dojoToday | `customer-ready` | `pass` | `customer-ready` | `2026-09-18T20:50:09+00:00` | `2026-10-18` | `2026-09-18T20:48:00Z-dojotoday-active-unit-guidance-mixed-4858feab`, `2026-09-18T20:48:00Z-dojotoday-read-only-boundary-observed-4858feab`, `2026-09-18T20:48:00Z-dojotoday-returning-next-day-mixed-4858feab` | - | Read the current schedule, understand due reviews and the active unit, and follow the documented next action. |
| `literacy-standalone-corridor-mod01-03` | literacyDojo | `customer-ready` | `pass` | `customer-ready` | `2026-09-18T20:50:09+00:00` | `2026-10-18` | `2026-09-18T20:46:53Z-literacy-corridor-grandfathered-return-4858feab`, `2026-09-18T20:46:53Z-literacy-corridor-resume-mid-module-4858feab`, `2026-09-18T20:48:00Z-literacy-corridor-happy-path-mixed-4858feab`, `2026-09-18T20:48:00Z-literacy-corridor-gate-retry-mixed-4858feab`, `2026-09-18T20:48:00Z-literacy-corridor-review-window-mixed-4858feab` | - | Progress continuously through modules 1-3 (11 lessons), pass each module challenge, return for spaced reviews on the [1,7,21] schedule, and understand the local result and next action. |
| `literacy-standalone-first-lesson` | literacyDojo | `customer-ready` | `pass` | `customer-ready` | `2026-09-18T20:50:09+00:00` | `2026-10-18` | `2026-09-18T20:48:00Z-literacy-happy-path-mixed-4858feab`, `2026-09-18T20:48:00Z-literacy-retry-mixed-4858feab`, `2026-09-18T20:48:00Z-literacy-resume-mixed-4858feab` | - | Complete an assigned lesson, recover from an incorrect attempt, and understand the local result. |
| `minitown-explore-only` | miniTown | `experimental` | `pass` | `experimental` | `2026-09-16T23:00:00+00:00` | `2026-10-16` | `2026-09-16T22:55:00Z-minitown-explore-only-mixed-cabdc4a1` | - | Explore the local town simulation without a lesson, persistence, progression, evidence, or mastery promise. |
| `os-literacy-guided-mission` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-18T20:50:09+00:00` | `2026-10-18` | `2026-09-18T20:48:00Z-os-literacy-hosted-mission-mixed-4858feab`, `2026-09-18T20:48:00Z-os-verification-recovery-mixed-4858feab`, `2026-09-18T20:48:00Z-os-literacy-returning-device-mixed-4858feab` | - | Choose an AI track, complete its hosted LiteracyDojo mission, and understand the host result and next action. |
| `os-returning-learner` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-18T02:35:00+00:00` | `2026-10-18` | `2026-09-18T02:30:00Z-os-onboarding-track-choice-mixed-3aca4d5d`, `2026-09-18T02:30:00Z-os-returning-device-mixed-3aca4d5d`, `2026-09-18T02:30:00Z-os-returning-recovery-mixed-3aca4d5d` | - | Resume the supported local OS state on the same device without repeating completed setup. |
| `os-voxel-guided-missions` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-19T22:05:00+00:00` | `2026-10-19` | `2026-09-19T22:05:00Z-os-voxel-hosted-missions-mixed-0e54d88d`, `2026-09-19T22:05:00Z-os-renderer-accessibility-recovery-mixed-0e54d88d`, `2026-09-19T22:05:00Z-os-voxel-returning-device-mixed-0e54d88d` | - | Launch each supported hosted voxelDojo mission and receive an accurate host status without a false mastery claim. |
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
