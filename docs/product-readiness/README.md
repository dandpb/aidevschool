<!-- DO NOT EDIT BY HAND: generated from canonical product-readiness sources -->

# Product Readiness

Regenerate with `python3 docs/product-readiness/tools/cli.py render`.
Readiness is a customer-journey claim; it is not learner completion, evidence, verification, or mastery.

| Use case | Surface | Intended tier | Current outcome | Granted tier | Verified at | Revalidate by | Evidence scope | Reasons/gaps | Promise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dojotoday-daily-guidance` | dojoToday | `customer-ready` | `pass` | `customer-ready` | `2026-09-07T08:55:00+00:00` | `2026-10-07` | `2026-09-07T08:05:00Z-dojotoday-active-unit-guidance-mixed-581ea330`, `2026-09-07T08:05:00Z-dojotoday-read-only-boundary-observed-581ea330`, `2026-09-07T08:05:00Z-dojotoday-returning-next-day-mixed-581ea330` | - | Read the current schedule, understand due reviews and the active unit, and follow the documented next action. |
| `literacy-standalone-corridor-mod01-03` | literacyDojo | `customer-ready` | `pass` | `customer-ready` | `2026-09-07T08:55:00+00:00` | `2026-10-07` | `2026-09-07T08:22:18Z-literacy-corridor-grandfathered-return-581ea330`, `2026-09-07T08:22:18Z-literacy-corridor-resume-mid-module-581ea330`, `2026-09-07T08:05:00Z-literacy-corridor-happy-path-mixed-581ea330`, `2026-09-07T08:05:00Z-literacy-corridor-gate-retry-mixed-581ea330`, `2026-09-07T08:05:00Z-literacy-corridor-review-window-mixed-581ea330` | - | Progress continuously through modules 1-3 (11 lessons), pass each module challenge, return for spaced reviews on the [1,7,21] schedule, and understand the local result and next action. |
| `literacy-standalone-first-lesson` | literacyDojo | `customer-ready` | `pass` | `customer-ready` | `2026-09-07T08:55:00+00:00` | `2026-10-07` | `2026-09-07T08:05:00Z-literacy-happy-path-mixed-581ea330`, `2026-09-07T08:05:00Z-literacy-retry-mixed-581ea330`, `2026-09-07T08:05:00Z-literacy-resume-mixed-581ea330` | - | Complete an assigned lesson, recover from an incorrect attempt, and understand the local result. |
| `minitown-explore-only` | miniTown | `experimental` | `pass` | `experimental` | `2026-09-07T08:55:00+00:00` | `2026-10-07` | `2026-09-07T08:05:00Z-minitown-explore-only-mixed-581ea330` | - | Explore the local town simulation without a lesson, persistence, progression, evidence, or mastery promise. |
| `os-literacy-guided-mission` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-07T08:55:00+00:00` | `2026-10-07` | `2026-09-07T08:05:00Z-os-literacy-hosted-mission-mixed-581ea330`, `2026-09-07T08:05:00Z-os-verification-recovery-mixed-581ea330`, `2026-09-07T08:05:00Z-os-literacy-returning-device-mixed-581ea330` | - | Choose an AI track, complete its hosted LiteracyDojo mission, and understand the host result and next action. |
| `os-returning-learner` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-07T08:55:00+00:00` | `2026-10-07` | `2026-09-07T08:05:00Z-os-onboarding-track-choice-mixed-581ea330`, `2026-09-07T08:05:00Z-os-returning-device-mixed-581ea330`, `2026-09-07T08:05:00Z-os-returning-recovery-mixed-581ea330` | - | Resume the supported local OS state on the same device without repeating completed setup. |
| `os-voxel-guided-missions` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-07T08:55:00+00:00` | `2026-10-07` | `2026-09-07T08:05:00Z-os-voxel-hosted-missions-mixed-581ea330`, `2026-09-07T08:05:00Z-os-renderer-accessibility-recovery-mixed-581ea330`, `2026-09-07T08:05:00Z-os-voxel-returning-device-mixed-581ea330` | - | Launch each supported hosted voxelDojo mission and receive an accurate host status without a false mastery claim. |
| `pixelquest-evidence-encounter` | PixelQuest | `customer-ready` | `pass` | `customer-ready` | `2026-09-07T08:55:00+00:00` | `2026-10-07` | `2026-09-07T08:05:00Z-pixelquest-encounter-evidence-mixed-581ea330`, `2026-09-07T08:05:00Z-pixelquest-evidence-recovery-observed-581ea330`, `2026-09-07T08:05:00Z-pixelquest-returning-evidence-handoff-mixed-581ea330` | - | Complete a documented encounter, locate its raw evidence, and hand it to the independent verifier. |
| `voxel-standalone-learning-loop` | voxelDojo | `customer-ready` | `pass` | `customer-ready` | `2026-09-07T08:55:00+00:00` | `2026-10-07` | `2026-09-07T08:05:00Z-voxel-standalone-loop-mixed-581ea330`, `2026-09-07T08:05:00Z-voxel-accessible-renderer-observed-581ea330`, `2026-09-07T08:05:00Z-voxel-standalone-return-reentry-mixed-581ea330` | - | Complete the deterministic loop in each declared standalone game and locate raw evidence for independent verification. |

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
