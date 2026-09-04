<!-- DO NOT EDIT BY HAND: generated from canonical product-readiness sources -->

# Product Readiness

Regenerate with `python3 docs/product-readiness/tools/cli.py render`.
Readiness is a customer-journey claim; it is not learner completion, evidence, verification, or mastery.

| Use case | Surface | Intended tier | Current outcome | Granted tier | Verified at | Revalidate by | Evidence scope | Reasons/gaps | Promise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dojotoday-daily-guidance` | dojoToday | `validated-journey` | `pass` | `validated-journey` | `2026-09-04T03:00:00+00:00` | `2026-10-04` | `2026-09-04T02:55:00Z-dojotoday-active-unit-guidance-mixed-289cdbd8`, `2026-09-04T02:55:00Z-dojotoday-read-only-boundary-observed-289cdbd8` | - | Read the current schedule, understand due reviews and the active unit, and follow the documented next action. |
| `literacy-standalone-first-lesson` | literacyDojo | `customer-ready` | `pass` | `customer-ready` | `2026-09-04T19:35:00+00:00` | `2026-10-04` | `2026-09-04T19:31:30Z-literacy-happy-path-mixed-0a2f94f8`, `2026-09-04T19:31:30Z-literacy-retry-mixed-0a2f94f8`, `2026-09-04T19:31:30Z-literacy-resume-mixed-0a2f94f8` | - | Complete an assigned lesson, recover from an incorrect attempt, and understand the local result. |
| `minitown-explore-only` | miniTown | `experimental` | `pass` | `experimental` | `2026-09-03T08:46:00+00:00` | `2026-10-03` | `2026-09-03T08:45:00Z-minitown-explore-only-mixed-0b8148e5` | - | Explore the local town simulation without a lesson, persistence, progression, evidence, or mastery promise. |
| `os-literacy-guided-mission` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-04T19:35:00+00:00` | `2026-10-04` | `2026-09-04T19:31:30Z-os-literacy-hosted-mission-mixed-0a2f94f8`, `2026-09-04T19:31:30Z-os-verification-recovery-mixed-0a2f94f8`, `2026-09-04T19:31:30Z-os-literacy-returning-device-mixed-0a2f94f8` | - | Choose an AI track, complete its hosted LiteracyDojo mission, and understand the host result and next action. |
| `os-returning-learner` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-03T08:46:00+00:00` | `2026-10-03` | `2026-09-03T08:45:00Z-os-onboarding-track-choice-mixed-0b8148e5`, `2026-09-03T08:45:00Z-os-returning-device-mixed-0b8148e5`, `2026-09-03T08:45:00Z-os-returning-recovery-mixed-0b8148e5` | - | Resume the supported local OS state on the same device without repeating completed setup. |
| `os-voxel-guided-missions` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-03T08:46:00+00:00` | `2026-10-03` | `2026-09-03T08:45:00Z-os-voxel-hosted-missions-mixed-0b8148e5`, `2026-09-03T08:45:00Z-os-voxel-returning-device-mixed-0b8148e5`, `2026-09-03T08:45:00Z-os-renderer-accessibility-recovery-mixed-0b8148e5` | - | Launch each supported hosted voxelDojo mission and receive an accurate host status without a false mastery claim. |
| `pixelquest-evidence-encounter` | PixelQuest | `validated-journey` | `pass` | `validated-journey` | `2026-09-03T08:46:00+00:00` | `2026-10-03` | `2026-09-03T08:45:00Z-pixelquest-encounter-evidence-mixed-0b8148e5`, `2026-09-03T08:45:00Z-pixelquest-evidence-recovery-observed-0b8148e5` | - | Complete a documented encounter, locate its raw evidence, and hand it to the independent verifier. |
| `voxel-standalone-learning-loop` | voxelDojo | `validated-journey` | `pass` | `validated-journey` | `2026-09-03T08:46:00+00:00` | `2026-10-03` | `2026-09-03T08:45:00Z-voxel-standalone-loop-mixed-0b8148e5`, `2026-09-03T08:45:00Z-voxel-accessible-renderer-observed-0b8148e5` | - | Complete the deterministic loop in each declared standalone game and locate raw evidence for independent verification. |

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
