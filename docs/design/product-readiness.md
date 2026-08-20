# Product Readiness Contract

## Authority and scope

Product readiness is a claim about a supported customer journey. It is separate from learner state and does not change `learner/learning_state.yaml`, `learner/gate/`, or `learner/substrate/`. Browser completion, raw evidence, and producer test results cannot grant readiness or mastery.

Canonical readiness sources live in `docs/product-readiness/`:

- `policy.yaml` owns tier requirements, gap treatment, outcomes, and freshness rules.
- `inventory.yaml` owns intended use-case promises, entries, boundaries, and owners.
- `scenarios/*.yaml` own executable and observed journey contracts.
- future promoted results and assessments own dated evidence and independent decisions.
- `README.md` is a generated current matrix; audience guides remain hand-authored.

## Tiers

| Tier | Claim |
| --- | --- |
| `customer-ready` | A supported learner can complete the full promise with facilitator-operable recovery. |
| `validated-journey` | The documented entry-to-outcome journey works within stated prerequisites and boundaries. |
| `experimental` | The bounded exploration promise works without inheriting completion or readiness claims. |

An intended tier is not a granted tier. Until an independent assessment binds current scenario facts to policy, the generated status is `unassessed`.

## Gap and decision rules

Critical and high gaps always block the intended claim. Medium and low gaps require an explicit owner and disposition before a conditional decision. Published outcomes are `pass`, `conditional-follow-up`, `downgraded`, `blocked`, `stale`, or `unassessed`.

Readiness evidence is scoped and time-bounded. Changes to an entry route, onboarding, persistence, evidence semantics, recovery, accessibility, or facilitator procedure require revalidation. Engine CI remains necessary producer evidence but is never an independent readiness decision.

## Ownership

Engine suites own executable behavior and engine READMEs own local setup. The readiness domain references those sources instead of duplicating them. Student guidance owns learner goals, visible outcomes, local-state limits, recovery, and next actions. Facilitator guidance owns preparation, observation, safe recovery, escalation, evaluation, and revalidation.
