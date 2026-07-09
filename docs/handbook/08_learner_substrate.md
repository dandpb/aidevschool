# Learner substrate

**Path:** `learner/` · **Shared** across all engines (never duplicated). This is the single source of
truth for everything about the learner's journey, plus the Python adapter that keeps every derived
view in sync.

## The golden rule

> Edit only the canonical state — `learner/learning_state.yaml` (and `learner/pipeline_status.md` for
> software-cycle state). Then run `python3 -m learner.substrate`. Never write to a derived view and
> back-port the change.

`.mavis/learning_state.yaml`, the minimaxDojo whiteboard, `codexDojo/src/data/learner.ts`, and
`pixelDojo/.../reviewSlice.ts` are all **generated** from the canonical YAML.

## Structure

```text
learner/
├── learning_state.yaml      # CANONICAL state: the learning gate + FSRS history + streak
├── learner_profile.md       # Dreyfus × Bloom matrix, proven prerequisites, gaps
├── pitfalls.md              # append-only recurring-trap memory (spaced-repetition fuel)
├── journal.md               # append-only knowledge base
├── pipeline_status.md       # software-cycle phase + next action (distinct from the learning gate)
├── predictions.yaml         # append-only Polyglot Arena predictions
├── attempts/                # learner diagnostic attempts (append-only learning evidence)
└── substrate/               # the Python validator + derived-view adapters
    ├── __init__.py          # load_canonical / validate / load_and_validate / sync
    ├── __main__.py          # CLI: `python3 -m learner.substrate` → sync()
    ├── interface.md         # the public read/write contract
    ├── schema.yaml          # canonical types + invariants
    ├── scheduling.py        # FSRS spaced repetition + streak/freeze + CURR
    ├── dashboard_snapshot.py# derives codexDojo learner.ts + pixelDojo reviewSlice.ts
    ├── ts_render.py         # TypeScript renderers
    # deps: repo-root pyproject.toml (pyyaml + fsrs)
    ├── adapters/mavis.py        # → .mavis/learning_state.yaml
    ├── adapters/whiteboard.py   # → minimaxDojo/whiteboard/{profile.yaml, learner_profile.md, trail.md}
    └── tests/               # substrate tests
```

## `learning_state.yaml` — the canonical schema

Top: `version: 2`, `system: agora-continuum`. The key blocks:

- **`learner`** — `id`, `level` (`beginner|intermediate|advanced`), `goal`, `active_language`,
  `focus`, `languages`, `weekly_time_hours`, `session_cadence`, `hitl_sla_hours`, and
  `budget.hint_queries_per_day` (15). Reference languages (Go/Rust) are for code-reading breadth;
  practice stays in the active language.
- **`state_machine`** — two enums: `learning_states: [presenting, practicing, evaluating, mastered]`
  and `artifact_states: [producing, verifying, done]`.
- **`active_unit`** — the live gate object: `id`, `project`, `title`, `state`, `retry_count`,
  `retry_limit` (3), `unblock_condition: learner_attempt_evaluated`,
  `required_before_implementation: true`, `diagnostic_file`, a `promotion_gate` list, and an
  `empirical_gate` (`require_executable_evidence: true`, `min_coverage: 0.80`, `mutation_min: 0.60`).
- **`gate`** — `implementation_blocked: <bool>` ← the master gate flag.
- **`agent_ownership`** — the named agents (`leader: Maestro`, `diagnostic: Sonda`, `verifier: Prometor`, …).
- **`empirical_gates`** — `code` (coverage target ≥ 80%, mutation 60–70% when tooling available,
  `verifier_context: isolated`, benchmark rule "≥10 samples plus warmup; block speed claims when
  CV ≥ 20%") and `learning` (`requires_attempt_before_solution: true`, `hint_budget_per_day: 15`,
  `mastery_source: executable_evidence`).
- **`units_log`** — the FSRS input (spaced-repetition review history). Each unit: `unit_id`, `concept`,
  `kind`, `project`, `mastered`, and a `reviews` list. Header comment: "ratings come ONLY from gate
  outcomes, never self-report."
- **`streak`** — `current`, `longest`, `last_gate_date`, `freezes {equipped, max}`. The streak grows
  only when an executable-evidence gate passes.

## State-machine values (the canonical vocabulary)

| Concept | Values |
| --- | --- |
| Learning states | `presenting → practicing → evaluating → mastered` |
| Artifact states | `producing → verifying → done` |
| Mavis derived view (pt, lowercase) | `apresentando / praticando / avaliando / dominado` |
| Whiteboard derived view (pt, UPPERCASE) | `APRESENTANDO / PRATICANDO / AVALIANDO / DOMINADO` |
| `UnitKind` | `concept | smell | architecture | pitfall` |
| `GateOutcome` | `fail | pass_retried | pass_first_try | pass_exceeds` |
| `Rating` (FSRS subset) | `again | hard | good | easy` |

## The read/write contract (`substrate/interface.md`)

**Read surface:**

- `load_canonical(path) -> dict` — load canonical YAML.
- `validate(state) -> list[str]` — list of invariant violations; empty means valid.
- `load_and_validate(path) -> dict` — load + validate; raises `ValueError` on violation.

**Write surface:**

- `sync()` — regenerate every derived view from canonical.
- `derive_mavis_view(state)`, `derive_whiteboard_profile(state)`, `derive_whiteboard_trail(state)`.

**Error modes:** `FileNotFoundError` (missing canonical), `yaml.YAMLError` (malformed),
`ValueError` (invariant violation).

## `validate()` invariants

`validate()` (in `substrate/__init__.py`) returns violations for:

1. `version` present; `system == "agora-continuum"`.
2. `learner.id` non-empty; `learner.level` valid; `learner.active_language ∈ learner.languages`.
3. `active_unit.id` non-empty; `active_unit.state` valid; `retry_count ≤ retry_limit`.
4. `gate.implementation_blocked` is boolean.
5. `empirical_gates.learning.requires_attempt_before_solution is True`.

Plus two helper validators:

- **units_log** — each review's `rating` (if present) must be a valid rating; if a `gate_outcome` is
  present, the `rating` must equal `RATING_FROM_GATE[outcome]` ("the gate is the only rating
  producer"); a unit with `mastered: true` must have ≥ 1 gate review ("mastery requires executable
  evidence, never docs alone").
- **streak** — `current` is a non-negative int; `0 ≤ equipped ≤ max ≤ 2` ("research: 3 freezes
  performed no better than 2").

## `sync()` — what gets regenerated

`sync()` calls `load_and_validate()` first (a sync on invalid state raises), then regenerates four
derived targets from the one canonical file:

1. `.mavis/learning_state.yaml` (Mavis planner view, lowercase pt states).
2. `minimaxDojo/whiteboard/{profile.yaml, learner_profile.md, trail.md}` (consumed by Mnemosyne and
   Cartógrafo).
3. `codexDojo/src/data/learner.ts` (shape locked at `codexDojo/src/domain.ts:LearnerSnapshot`).
4. `pixelDojo/pixel-quest/src/content/reviewSlice.ts`.

For efficiency, `build_snapshot()` runs once and is shared across both TypeScript renderers. Its
inputs (all read-only) include `learning_state.yaml`, `learner_profile.md`, `pitfalls.md`, `journal.md`
(scraped for the AIDI trendline), `curriculum/catalog.md` + `curriculum/BACKLOG_STATUS.md`, and
`predictions.yaml`. The snapshot embeds `nextReviews` (FSRS-derived), `streak`, `curr`, and
`predictions`.

## FSRS spaced repetition (`substrate/scheduling.py`)

The scheduler bridges the executable-evidence gate to concept re-exposure. The non-negotiable rule:
**the rating that feeds the scheduler comes only from gate outcomes, never from learner self-report.**

Gate outcome → FSRS rating (`RATING_FROM_GATE`, the single mapping):

| GateOutcome | FSRS rating |
| --- | --- |
| `fail` | `again` |
| `pass_retried` | `hard` |
| `pass_first_try` | `good` |
| `pass_exceeds` | `easy` |

`rating_from_gate_outcome(outcome)` raises on an unknown outcome — it never guesses, because a wrong
rating poisons the whole schedule.

Scheduler config (Phase 1, `fsrs` v6): `learning_steps=(1 day, 4 days)`,
`relearning_steps=(1 day,)`, `enable_fuzzing=False` (deterministic and testable; day-scale steps
because code concepts aren't flashcards). Per-user parameter personalization is deferred until
`units_log` has enough reviews.

Other scheduling logic:

- **Read-only card reconstruction** — `build_card_from_reviews()` replays a unit's gate-rated reviews
  chronologically through FSRS to reconstruct its `due` date; the canonical truth is the `reviews`
  list, not a persisted card. A unit with only a `presented` event (no gate review) is treated as due
  now.
- **`derive_next_reviews(units_log, pitfalls, today)`** — `today` is injected (never reads the clock
  inside pure logic). A unit surfaces if `due ≤ today`; the top recurring pitfall is appended as a
  `recurring-trap` reason.
- **Streak + freeze (Phase 2)** — `record_gate_outcome(streak, passed, today)`: a passed gate
  increments the streak; a failed gate is a no-op ("the gate, not the attempt, is the scarcity").
  `reconcile_streak(streak, today)`: each missed full day consumes one freeze; once exhausted the
  streak breaks. Freeze cap = 2.
- **CURR (Phase 4)** — `compute_curr(...)` is a Current-user Retention Rate proxy over a trailing
  7-day window. It is explicitly **unvalidated** and must not drive any automated decision
  (scheduling, gating, streaks).

## Gate mechanics, summarized

- **Master gate:** `gate.implementation_blocked: true` blocks AI implementation until the learner's
  diagnostic attempt is evaluated. Flipped to `false` only by the diagnostic agent accepting an
  attempt. Retry budget ≤ 3.
- **Empirical gate (for mastery):** `require_executable_evidence: true`, coverage ≥ 80%, mutation ≥
  60% (when tooling available), benchmark ≥ 10 samples + warmup (CV ≥ 20% blocks speed claims),
  verifier runs in an isolated context.
- **Mastery rule (enforced in `validate`):** `mastered: true` is invalid without ≥ 1 gate review.
  Documentation, dashboards, and static review never count — corroborated by `pitfalls.md` (the
  2026-06-18 pitfall: "claiming mastery from documentation/dashboard work").

## Commands & dependencies

```bash
# install deps (pyyaml>=6.0 + fsrs>=6.0)
python3 -m pip install -e ".[dev]"   # from repo root
# regenerate ALL derived views from canonical state
python3 -m learner.substrate
# run substrate tests
python3 -m unittest discover -s learner/substrate/tests
```

> **Doc note:** there is no `learner/CONTEXT.md`. The overview/contract content lives in
> `learner/README.md` + `learner/AGENTS.md` + `substrate/interface.md`.
