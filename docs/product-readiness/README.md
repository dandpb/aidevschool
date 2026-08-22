<!-- DO NOT EDIT BY HAND: generated from canonical product-readiness sources -->

# Product Readiness

Regenerate with `python3 docs/product-readiness/tools/cli.py render`.
Readiness is a customer-journey claim; it is not learner completion, evidence, verification, or mastery.

| Use case | Surface | Intended tier | Current outcome | Granted tier | Verified at | Revalidate by | Evidence scope | Reasons/gaps | Promise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dojotoday-daily-guidance` | dojoToday | `validated-journey` | `stale` | `-` | `2026-08-20T22:22:00+00:00` | `2026-09-20` | `2026-08-20T21:10:00Z-dojotoday-active-unit-guidance-mixed-c8a961cf`, `2026-08-20T21:10:00Z-dojotoday-read-only-boundary-observed-c8a961cf` | scenario dojotoday-active-unit-guidance source fingerprint is stale; scenario dojotoday-active-unit-guidance manual fingerprint is stale; scenario dojotoday-read-only-boundary source fingerprint is stale; scenario dojotoday-read-only-boundary manual fingerprint is stale | Read the current schedule, understand due reviews and the active unit, and follow the documented next action. |
| `literacy-standalone-first-lesson` | literacyDojo | `customer-ready` | `stale` | `-` | `2026-08-21T21:15:00+00:00` | `2026-09-21` | `2026-08-21T21:09:20Z-literacy-happy-path-mixed-58caad9c`, `2026-08-21T21:09:20Z-literacy-retry-mixed-58caad9c`, `2026-08-21T21:09:20Z-literacy-resume-mixed-58caad9c` | scenario literacy-happy-path source fingerprint is stale; scenario literacy-happy-path manual fingerprint is stale; scenario literacy-retry source fingerprint is stale; scenario literacy-retry manual fingerprint is stale; scenario literacy-resume source fingerprint is stale; scenario literacy-resume manual fingerprint is stale | Complete an assigned lesson, recover from an incorrect attempt, and understand the local result. |
| `minitown-explore-only` | miniTown | `experimental` | `stale` | `-` | `2026-08-20T22:22:00+00:00` | `2026-09-20` | `2026-08-20T21:10:00Z-minitown-explore-only-mixed-c8a961cf` | scenario minitown-explore-only source fingerprint is stale; scenario minitown-explore-only manual fingerprint is stale | Explore the local town simulation without a lesson, persistence, progression, evidence, or mastery promise. |
| `os-literacy-guided-mission` | codexDojo OS | `customer-ready` | `stale` | `-` | `2026-08-21T21:20:00+00:00` | `2026-09-21` | `2026-08-21T21:15:27Z-os-literacy-hosted-mission-mixed-b8000a1a`, `2026-08-21T21:15:27Z-os-literacy-returning-device-mixed-b8000a1a`, `2026-08-21T21:15:27Z-os-verification-recovery-mixed-b8000a1a` | scenario os-literacy-hosted-mission source fingerprint is stale; scenario os-literacy-hosted-mission manual fingerprint is stale; scenario os-verification-recovery source fingerprint is stale; scenario os-verification-recovery manual fingerprint is stale; scenario os-literacy-returning-device source fingerprint is stale; scenario os-literacy-returning-device manual fingerprint is stale | Choose an AI track, complete its hosted LiteracyDojo mission, and understand the host result and next action. |
| `os-returning-learner` | codexDojo OS | `customer-ready` | `stale` | `-` | `2026-08-21T21:00:00+00:00` | `2026-09-21` | `2026-08-21T20:59:14Z-os-onboarding-track-choice-mixed-c3cad96b`, `2026-08-21T20:59:14Z-os-returning-device-mixed-c3cad96b`, `2026-08-21T20:59:14Z-os-returning-recovery-mixed-c3cad96b` | scenario os-onboarding-track-choice manual fingerprint is stale; scenario os-returning-recovery manual fingerprint is stale; scenario os-returning-device manual fingerprint is stale | Resume the supported local OS state on the same device without repeating completed setup. |
| `os-voxel-guided-missions` | codexDojo OS | `customer-ready` | `stale` | `-` | `2026-08-21T21:00:00+00:00` | `2026-09-21` | `2026-08-21T20:59:14Z-os-renderer-accessibility-recovery-mixed-c3cad96b`, `2026-08-21T20:59:14Z-os-voxel-hosted-missions-mixed-c3cad96b`, `2026-08-21T20:59:14Z-os-voxel-returning-device-mixed-c3cad96b` | scenario os-voxel-hosted-missions manual fingerprint is stale; scenario os-renderer-accessibility-recovery manual fingerprint is stale; scenario os-voxel-returning-device manual fingerprint is stale | Launch each supported hosted voxelDojo mission and receive an accurate host status without a false mastery claim. |
| `pixelquest-evidence-encounter` | PixelQuest | `validated-journey` | `stale` | `-` | `2026-08-20T22:22:00+00:00` | `2026-09-20` | `2026-08-20T21:10:00Z-pixelquest-encounter-evidence-mixed-c8a961cf`, `2026-08-20T21:10:00Z-pixelquest-evidence-recovery-observed-c8a961cf` | scenario pixelquest-encounter-evidence source fingerprint is stale; scenario pixelquest-encounter-evidence manual fingerprint is stale; scenario pixelquest-evidence-recovery source fingerprint is stale; scenario pixelquest-evidence-recovery manual fingerprint is stale | Complete a documented encounter, locate its raw evidence, and hand it to the independent verifier. |
| `voxel-standalone-learning-loop` | voxelDojo | `validated-journey` | `stale` | `-` | `2026-08-20T22:22:00+00:00` | `2026-09-20` | `2026-08-20T21:10:00Z-voxel-standalone-loop-mixed-c8a961cf`, `2026-08-20T21:10:00Z-voxel-accessible-renderer-observed-c8a961cf` | scenario voxel-standalone-loop source fingerprint is stale; scenario voxel-standalone-loop manual fingerprint is stale; scenario voxel-accessible-renderer source fingerprint is stale; scenario voxel-accessible-renderer manual fingerprint is stale | Complete the deterministic loop in each declared standalone game and locate raw evidence for independent verification. |

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
