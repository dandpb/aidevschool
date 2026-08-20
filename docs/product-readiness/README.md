<!-- DO NOT EDIT BY HAND: generated from canonical product-readiness sources -->

# Product Readiness

Regenerate with `python3 docs/product-readiness/tools/cli.py render`.
Readiness is a customer-journey claim; it is not learner completion, evidence, verification, or mastery.

| Use case | Surface | Intended tier | Current outcome | Granted tier | Verified at | Revalidate by | Evidence scope | Reasons/gaps | Promise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dojotoday-daily-guidance` | dojoToday | `validated-journey` | `blocked` | `-` | `2026-08-20T18:30:00+00:00` | `2026-09-20` | - | missing promoted result for dojotoday-active-unit-guidance; missing promoted result for dojotoday-read-only-boundary | Read the current schedule, understand due reviews and the active unit, and follow the documented next action. |
| `literacy-standalone-first-lesson` | literacyDojo | `customer-ready` | `blocked` | `-` | `2026-08-20T18:30:00+00:00` | `2026-09-20` | `2026-08-20T15:58:10Z-literacy-happy-path-581913e3`, `2026-08-20T15:58:10Z-literacy-resume-581913e3`, `2026-08-20T15:58:10Z-literacy-retry-581913e3` | scenario literacy-happy-path lacks independent evidence; scenario literacy-retry lacks independent evidence; scenario literacy-resume lacks independent evidence | Complete an assigned lesson, recover from an incorrect attempt, and understand the local result. |
| `minitown-explore-only` | miniTown | `experimental` | `blocked` | `-` | `2026-08-20T18:30:00+00:00` | `2026-09-20` | `2026-08-20T15:58:10Z-minitown-explore-only-581913e3` | scenario minitown-explore-only lacks independent evidence | Explore the local town simulation without a lesson, persistence, progression, evidence, or mastery promise. |
| `os-literacy-guided-mission` | codexDojo OS | `customer-ready` | `blocked` | `-` | `2026-08-20T18:30:00+00:00` | `2026-09-20` | `2026-08-20T15:58:10Z-os-literacy-hosted-mission-581913e3`, `2026-08-20T15:58:10Z-os-verification-recovery-581913e3` | scenario os-literacy-hosted-mission lacks independent evidence; scenario os-verification-recovery lacks independent evidence; missing promoted result for os-literacy-returning-device | Choose an AI track, complete its hosted LiteracyDojo mission, and understand the host result and next action. |
| `os-returning-learner` | codexDojo OS | `customer-ready` | `blocked` | `-` | `2026-08-20T18:30:00+00:00` | `2026-09-20` | `2026-08-20T15:58:10Z-os-onboarding-track-choice-581913e3` | scenario os-onboarding-track-choice lacks independent evidence; missing promoted result for os-returning-recovery; missing promoted result for os-returning-device | Resume the supported local OS state on the same device without repeating completed setup. |
| `os-voxel-guided-missions` | codexDojo OS | `customer-ready` | `blocked` | `-` | `2026-08-20T18:30:00+00:00` | `2026-09-20` | `2026-08-20T15:58:10Z-os-voxel-hosted-missions-581913e3` | scenario os-voxel-hosted-missions lacks independent evidence; missing promoted result for os-renderer-accessibility-recovery; missing promoted result for os-voxel-returning-device | Launch each supported hosted voxelDojo mission and receive an accurate host status without a false mastery claim. |
| `pixelquest-evidence-encounter` | PixelQuest | `validated-journey` | `blocked` | `-` | `2026-08-20T18:30:00+00:00` | `2026-09-20` | `2026-08-20T15:58:10Z-pixelquest-encounter-evidence-581913e3` | scenario pixelquest-encounter-evidence lacks independent evidence; missing promoted result for pixelquest-evidence-recovery | Complete a documented encounter, locate its raw evidence, and hand it to the independent verifier. |
| `voxel-standalone-learning-loop` | voxelDojo | `validated-journey` | `blocked` | `-` | `2026-08-20T18:30:00+00:00` | `2026-09-20` | `2026-08-20T15:58:10Z-voxel-standalone-loop-581913e3` | scenario voxel-standalone-loop lacks independent evidence; missing promoted result for voxel-accessible-renderer | Complete the deterministic loop in each declared standalone game and locate raw evidence for independent verification. |

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
