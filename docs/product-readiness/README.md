<!-- DO NOT EDIT BY HAND: generated from policy.yaml, inventory.yaml, and scenarios/*.yaml -->

# Product Readiness

Regenerate with `python3 docs/product-readiness/tools/cli.py render`.
Readiness is a customer-journey claim; it is not learner completion, evidence, verification, or mastery.

| Use case | Surface | Intended tier | Current status | Promise |
| --- | --- | --- | --- | --- |
| `literacy-standalone-first-lesson` | literacyDojo | `customer-ready` | `unassessed` | Complete an assigned lesson, recover from an incorrect attempt, and understand the local result. |

## Status note

`unassessed` means the intended promise has canonical scenarios and guides but no promoted independent assessment.
A runnable engine or passing producer test does not grant a readiness tier.

## Canonical sources

- `policy.yaml` owns tiers, severity treatment, outcomes, and freshness rules.
- `inventory.yaml` owns intended promises and use-case scope.
- `scenarios/*.yaml` own executable and observed journey contracts.
- `student-guide.md` and `facilitator-guide.md` own audience guidance.
