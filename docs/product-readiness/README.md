<!-- DO NOT EDIT BY HAND: generated from canonical product-readiness sources -->

# Product Readiness

Regenerate with `python3 docs/product-readiness/tools/cli.py render`.
Readiness is a customer-journey claim; it is not learner completion, evidence, verification, or mastery.

| Use case | Surface | Intended tier | Current outcome | Granted tier | Verified at | Revalidate by | Evidence scope | Reasons/gaps | Promise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dojotoday-daily-guidance` | dojoToday | `validated-journey` | `stale` | `-` | `2026-08-20T22:22:00+00:00` | `2026-09-20` | `2026-08-20T21:10:00Z-dojotoday-active-unit-guidance-mixed-c8a961cf`, `2026-08-20T21:10:00Z-dojotoday-read-only-boundary-observed-c8a961cf` | scenario dojotoday-active-unit-guidance source fingerprint is stale; scenario dojotoday-read-only-boundary source fingerprint is stale | Read the current schedule, understand due reviews and the active unit, and follow the documented next action. |
| `literacy-standalone-first-lesson` | literacyDojo | `customer-ready` | `stale` | `-` | `2026-08-22T15:15:00+00:00` | `2026-09-22` | `2026-08-22T15:13:00Z-literacy-happy-path-mixed-da2a1837`, `2026-08-22T15:13:00Z-literacy-retry-mixed-da2a1837`, `2026-08-22T15:13:00Z-literacy-resume-mixed-da2a1837` | scenario literacy-happy-path source fingerprint is stale; scenario literacy-retry source fingerprint is stale; scenario literacy-resume source fingerprint is stale | Complete an assigned lesson, recover from an incorrect attempt, and understand the local result. |
| `minitown-explore-only` | miniTown | `experimental` | `stale` | `-` | `2026-08-20T22:22:00+00:00` | `2026-09-20` | `2026-08-20T21:10:00Z-minitown-explore-only-mixed-c8a961cf` | scenario minitown-explore-only source fingerprint is stale | Explore the local town simulation without a lesson, persistence, progression, evidence, or mastery promise. |
| `os-literacy-guided-mission` | codexDojo OS | `customer-ready` | `stale` | `-` | `2026-08-30T22:25:00+00:00` | `2026-09-29` | `2026-08-30T22:20:52Z-os-literacy-hosted-mission-mixed-0f75dafa`, `2026-08-30T22:20:52Z-os-verification-recovery-mixed-0f75dafa`, `2026-08-30T22:20:52Z-os-literacy-returning-device-mixed-0f75dafa` | scenario os-literacy-hosted-mission source fingerprint is stale; scenario os-verification-recovery source fingerprint is stale; scenario os-literacy-returning-device source fingerprint is stale; scenario os-literacy-returning-device artifact digest does not match: engines/codexdojo-os-prototype/tests/chapter-continuity.smoke.spec.ts | Choose an AI track, complete its hosted LiteracyDojo mission, and understand the host result and next action. |
| `os-returning-learner` | codexDojo OS | `customer-ready` | `stale` | `-` | `2026-08-30T22:25:00+00:00` | `2026-09-29` | `2026-08-30T22:20:52Z-os-onboarding-track-choice-mixed-0f75dafa`, `2026-08-30T22:20:52Z-os-returning-device-mixed-0f75dafa`, `2026-08-30T22:20:52Z-os-returning-recovery-mixed-0f75dafa` | scenario os-onboarding-track-choice source fingerprint is stale; scenario os-returning-recovery source fingerprint is stale; scenario os-returning-device source fingerprint is stale; scenario os-returning-device artifact digest does not match: engines/codexdojo-os-prototype/tests/chapter-continuity.smoke.spec.ts | Resume the supported local OS state on the same device without repeating completed setup. |
| `os-voxel-guided-missions` | codexDojo OS | `customer-ready` | `stale` | `-` | `2026-08-30T22:25:00+00:00` | `2026-09-29` | `2026-08-30T22:20:52Z-os-voxel-hosted-missions-mixed-0f75dafa`, `2026-08-30T22:20:52Z-os-renderer-accessibility-recovery-mixed-0f75dafa`, `2026-08-30T22:20:52Z-os-voxel-returning-device-mixed-0f75dafa` | scenario os-voxel-hosted-missions source fingerprint is stale; scenario os-renderer-accessibility-recovery source fingerprint is stale; scenario os-voxel-returning-device source fingerprint is stale; scenario os-voxel-returning-device artifact digest does not match: engines/codexdojo-os-prototype/tests/chapter-continuity.smoke.spec.ts | Launch each supported hosted voxelDojo mission and receive an accurate host status without a false mastery claim. |
| `pixelquest-evidence-encounter` | PixelQuest | `validated-journey` | `stale` | `-` | `2026-08-20T22:22:00+00:00` | `2026-09-20` | `2026-08-20T21:10:00Z-pixelquest-encounter-evidence-mixed-c8a961cf`, `2026-08-20T21:10:00Z-pixelquest-evidence-recovery-observed-c8a961cf` | scenario pixelquest-encounter-evidence source fingerprint is stale; scenario pixelquest-evidence-recovery source fingerprint is stale | Complete a documented encounter, locate its raw evidence, and hand it to the independent verifier. |
| `voxel-standalone-learning-loop` | voxelDojo | `validated-journey` | `stale` | `-` | `2026-08-20T22:22:00+00:00` | `2026-09-20` | `2026-08-20T21:10:00Z-voxel-standalone-loop-mixed-c8a961cf`, `2026-08-20T21:10:00Z-voxel-accessible-renderer-observed-c8a961cf` | scenario voxel-standalone-loop source fingerprint is stale; scenario voxel-accessible-renderer source fingerprint is stale | Complete the deterministic loop in each declared standalone game and locate raw evidence for independent verification. |

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
