<!-- DO NOT EDIT BY HAND: generated from canonical product-readiness sources -->

# Product Readiness

Regenerate with `python3 docs/product-readiness/tools/cli.py render`.
Readiness is a customer-journey claim; it is not learner completion, evidence, verification, or mastery.

| Use case | Surface | Intended tier | Current outcome | Granted tier | Verified at | Revalidate by | Evidence scope | Reasons/gaps | Promise |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dojotoday-daily-guidance` | dojoToday | `customer-ready` | `stale` | `-` | `2026-09-14T15:05:00+00:00` | `2026-10-14` | `2026-09-14T15:00:20Z-dojotoday-active-unit-guidance-mixed-e716df98`, `2026-09-14T15:00:20Z-dojotoday-read-only-boundary-observed-e716df98`, `2026-09-14T15:00:20Z-dojotoday-returning-next-day-mixed-e716df98` | scenario dojotoday-active-unit-guidance source fingerprint is stale; scenario dojotoday-read-only-boundary source fingerprint is stale; scenario dojotoday-returning-next-day source fingerprint is stale | Read the current schedule, understand due reviews and the active unit, and follow the documented next action. |
| `literacy-standalone-corridor-mod01-03` | literacyDojo | `customer-ready` | `pass` | `customer-ready` | `2026-09-14T02:30:00+00:00` | `2026-10-14` | `2026-09-14T02:25:30Z-literacy-corridor-grandfathered-return-89040bec`, `2026-09-14T02:25:30Z-literacy-corridor-resume-mid-module-89040bec`, `2026-09-14T02:27:21Z-literacy-corridor-happy-path-mixed-89040bec`, `2026-09-14T02:27:21Z-literacy-corridor-gate-retry-mixed-89040bec`, `2026-09-14T02:27:21Z-literacy-corridor-review-window-mixed-89040bec` | - | Progress continuously through modules 1-3 (11 lessons), pass each module challenge, return for spaced reviews on the [1,7,21] schedule, and understand the local result and next action. |
| `literacy-standalone-first-lesson` | literacyDojo | `customer-ready` | `pass` | `customer-ready` | `2026-09-14T02:30:00+00:00` | `2026-10-14` | `2026-09-14T02:27:21Z-literacy-happy-path-mixed-89040bec`, `2026-09-14T02:27:21Z-literacy-retry-mixed-89040bec`, `2026-09-14T02:27:21Z-literacy-resume-mixed-89040bec` | - | Complete an assigned lesson, recover from an incorrect attempt, and understand the local result. |
| `minitown-explore-only` | miniTown | `experimental` | `stale` | `-` | `2026-09-07T09:35:00+00:00` | `2026-10-07` | `2026-09-07T09:30:00Z-minitown-explore-only-mixed-79bf72c8` | scenario minitown-explore-only source fingerprint is stale | Explore the local town simulation without a lesson, persistence, progression, evidence, or mastery promise. |
| `os-literacy-guided-mission` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-14T03:17:00+00:00` | `2026-10-14` | `2026-09-14T03:16:00Z-os-literacy-hosted-mission-mixed-735b98cd`, `2026-09-14T03:16:00Z-os-verification-recovery-mixed-735b98cd`, `2026-09-14T03:16:00Z-os-literacy-returning-device-mixed-735b98cd` | - | Choose an AI track, complete its hosted LiteracyDojo mission, and understand the host result and next action. |
| `os-returning-learner` | codexDojo OS | `customer-ready` | `pass` | `customer-ready` | `2026-09-14T03:17:00+00:00` | `2026-10-14` | `2026-09-14T03:16:00Z-os-onboarding-track-choice-mixed-735b98cd`, `2026-09-14T03:16:00Z-os-returning-device-mixed-735b98cd`, `2026-09-14T03:16:00Z-os-returning-recovery-mixed-735b98cd` | - | Resume the supported local OS state on the same device without repeating completed setup. |
| `os-voxel-guided-missions` | codexDojo OS | `customer-ready` | `stale` | `-` | `2026-09-14T15:05:00+00:00` | `2026-10-14` | `2026-09-14T15:00:20Z-os-voxel-hosted-missions-mixed-e716df98`, `2026-09-14T15:00:20Z-os-renderer-accessibility-recovery-mixed-e716df98`, `2026-09-14T15:00:20Z-os-voxel-returning-device-mixed-e716df98` | scenario os-voxel-hosted-missions source fingerprint is stale; scenario os-renderer-accessibility-recovery source fingerprint is stale; scenario os-voxel-returning-device source fingerprint is stale | Launch each supported hosted voxelDojo mission and receive an accurate host status without a false mastery claim. |
| `pixelquest-evidence-encounter` | PixelQuest | `customer-ready` | `pass` | `customer-ready` | `2026-09-07T09:35:00+00:00` | `2026-10-07` | `2026-09-07T09:30:00Z-pixelquest-encounter-evidence-mixed-79bf72c8`, `2026-09-07T09:30:00Z-pixelquest-evidence-recovery-observed-79bf72c8`, `2026-09-07T09:30:00Z-pixelquest-returning-evidence-handoff-mixed-79bf72c8` | - | Complete a documented encounter, locate its raw evidence, and hand it to the independent verifier. |
| `voxel-standalone-learning-loop` | voxelDojo | `customer-ready` | `stale` | `-` | `2026-09-14T15:05:00+00:00` | `2026-10-14` | `2026-09-14T15:00:20Z-voxel-standalone-loop-mixed-e716df98`, `2026-09-14T15:00:20Z-voxel-accessible-renderer-observed-e716df98`, `2026-09-14T15:00:20Z-voxel-standalone-return-reentry-mixed-e716df98` | scenario voxel-standalone-loop source fingerprint is stale; scenario voxel-standalone-loop artifact digest does not match: engines/voxelDojo/catalog.json; scenario voxel-accessible-renderer source fingerprint is stale; scenario voxel-standalone-return-reentry source fingerprint is stale | Complete the deterministic loop in each declared standalone game and locate raw evidence for independent verification. |

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
