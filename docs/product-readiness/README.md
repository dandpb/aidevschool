<!-- DO NOT EDIT BY HAND: generated from canonical product-readiness sources -->

# Product Readiness

Regenerate with `python3 docs/product-readiness/tools/cli.py render`.
Readiness is a customer-journey claim; it is not learner completion, evidence, verification, or mastery.

| Use case | Surface | Intended tier | Current status | Promise |
| --- | --- | --- | --- | --- |
| `dojotoday-daily-guidance` | dojoToday | `validated-journey` | `unassessed` | Read the current schedule, understand due reviews and the active unit, and follow the documented next action. |
| `literacy-standalone-first-lesson` | literacyDojo | `customer-ready` | `unassessed` | Complete an assigned lesson, recover from an incorrect attempt, and understand the local result. |
| `minitown-explore-only` | miniTown | `experimental` | `unassessed` | Explore the local town simulation without a lesson, persistence, progression, evidence, or mastery promise. |
| `os-literacy-guided-mission` | codexDojo OS | `customer-ready` | `unassessed` | Choose an AI track, complete its hosted LiteracyDojo mission, and understand the host result and next action. |
| `os-returning-learner` | codexDojo OS | `customer-ready` | `unassessed` | Resume the supported local OS state on the same device without repeating completed setup. |
| `os-voxel-guided-missions` | codexDojo OS | `customer-ready` | `unassessed` | Launch each supported hosted voxelDojo mission and receive an accurate host status without a false mastery claim. |
| `pixelquest-evidence-encounter` | PixelQuest | `validated-journey` | `unassessed` | Complete a documented encounter, locate its raw evidence, and hand it to the independent verifier. |
| `voxel-standalone-learning-loop` | voxelDojo | `validated-journey` | `unassessed` | Complete the deterministic loop in each declared standalone game and locate raw evidence for independent verification. |

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
