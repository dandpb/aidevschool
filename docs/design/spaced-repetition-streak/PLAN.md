# Implementation Plan: Spaced-Repetition + Streak Layer

**Source spec:** `docs/design/spaced-repetition-streak/README.md` (ADR)
**Research basis:** `/deep-research` run `wf_f154f0ca-00a`; memory `duolingo-coding-gamification-research.md`
**Date:** 2026-06-21

## Status (loop `0c87c095`)

- **Phase 0: IMPLEMENTED & VERIFIED** (2026-06-21). 49 substrate tests pass, `python3 -m learner.substrate` regenerates cleanly, codexDojo lint/test(55)/build green. The `_next_reviews()` stub is deleted; reviews derive from real `units_log`. My Phase-0 files (`scheduling.py`, `__init__.py` validate extensions, `schema.yaml` types, `learning_state.yaml` seed, `domain.ts` "due" reason, 3 new test classes) are all intact and correct.
- **Phase 1: IMPLEMENTED & VERIFIED** (2026-06-21). FSRS wired into `scheduling.py` (`build_card_from_reviews`, `apply_gate_review`, FSRS-backed `derive_next_reviews`); `Scheduler` tuned (day-scale learning steps, **fuzzing off** for determinism). Deps declared (`learner/substrate/requirements.txt`: pyyaml + fsrs; **correction: the PyPI package is `fsrs` v6.3.1, NOT `py-fsrs` as the ADR said — `py-fsrs` 404s on PyPI**). 54 substrate tests pass (FSRS + determinism tests added; naive-interval tests rewritten for FSRS). codexDojo lint/test(55)/build green. Negative criterion: SR layer clean (no hearts/leagues/gems/R-value).
- **Plan adjustment:** the `nextReviews.reason` union gained `"due"` in Phase 0 (not Phase 1 Task 7) because the Phase-0 derivation already emits it — `tsc` requires it now.
- **⚠️ Incident (process lesson):** the adversarial-verification workflow `wf_0eba4e96-807` was given write-capable agents that MUTATED `dashboard_snapshot.py` and reorganized test classes instead of only verifying. It was stopped mid-run; tree recovered to green. **Process fix: never give write tools to verification agents.**
- **Phase 2 (streak/freeze): IMPLEMENTED & VERIFIED** (2026-06-21). `record_gate_outcome` + `reconcile_streak` in `scheduling.py` (pass=increment, missed-day+freeze=absorb, missed-day+0=break, failed-attempt=no-op). Streak seeded honestly (`current:0`, no gates passed yet). Surfaced to dashboard: `domain.ts` `streak` field + `_streak_view` (reconciled) + `renderStreak`. 62→67 tests pass; codexDojo lint/test(55)/build green.
- **Phase 4 (CURR): IMPLEMENTED & VERIFIED** (2026-06-21). `compute_curr` in `scheduling.py` (gate-review activity in trailing 7d ÷ units-with-gate; 0.0 when no gate history). Surfaced with an explicit "proxy não validado" label; drives NO automation. 67 substrate tests pass; codexDojo green. (Done ahead of Phase 3 since it's the same dashboard-render pattern.)
- **Phase 3 (pixelDojo surface): IMPLEMENTED & VERIFIED** (2026-06-21). Substrate now generates a READ-ONLY `engines/pixelDojo/pixel-quest/src/content/reviewSlice.ts` (data-only; `ReviewSlice` type owned by pixel-quest) via `sync_pixel_review_slice()`, wired into `python3 -m learner.substrate`. `createReviewTrack()` reads the slice instead of returning hardcoded/fake values (streak went from fake `3/5` to real `0/0`). Grep-verified: pixelDojo never writes streak/mastery/units_log — it emits evidence only (`GameNeverMarksMastery` / `evidence_only` hold). 70 substrate tests pass; codexDojo green; pixel-quest build+test(15) green (Phase-3 files lint-clean; one pre-existing unused-import in an untracked pre-session file `PixelQuestApp.ts` is out of scope).
- **🎯 ALL 5 PHASES COMPLETE.** Substrate 70 tests · codexDojo lint/55 tests/build · pixel-quest build/15 tests — all green. Negative criterion clean (no hearts/leagues/gems/R-value anywhere in the SR layer). Plan fully implemented; loop `0c87c095` has no remaining work.

---

## Overview

Replace the hardcoded `_next_reviews()` stub in `learner/substrate/dashboard_snapshot.py` with a real FSRS-backed spaced-repetition layer and a gate-anchored streak/freeze layer, both in the Python substrate. codexDojo and pixelDojo only render the derived snapshot. The streak resets only on a missed **executable-evidence gate**, never a calendar lapse; hearts/leagues/gems and R-value tuning are excluded (refuted).

## Architecture Decisions

- **FSRS in the Python substrate (`py-fsrs`)**, not the TS app. One scheduler; engines render. Matches rule #4 (filesystem = source of truth) and producer-≠-verifier.
- **Rating fed to FSRS comes only from gate outcomes**, never learner self-report (research: learners misjudge spaced practice).
- **The gate is the only scarcity.** No hearts/lives/leagues (refuted in research).
- **CURR reuses the existing `learning_states` machine**; labeled unvalidated.
- **Vertical slicing:** each task leaves `python3 -m learner.substrate` + `pnpm run build` green.

---

## Dependency Graph

```
schema invariants + validate()
        │
   units_log data model + gate→rating map
        │
   ┌────┴────────────────────┐
   │                         │
delete _next_reviews()    py-fsrs dep + scheduler (Phase 1)
derive naive reviews            │
(Phase 0)                       │
   │                            │
domain.ts snapshot shape ◄──────┘
   │
   ├── codexDojo render (nextReviews) ── Phase 1 checkpoint
   ├── streak + freeze layer ── Phase 2
   ├── pixelDojo surface (evidence_only) ── Phase 3
   └── CURR metric ── Phase 4
```

---

## Task List

### Phase 0: Foundation — log, don't schedule

#### Task 1: Extend schema invariants for streak, freeze, and rating-source
**Description:** Add the `Streak` type and invariants to `learner/substrate/schema.yaml`, and extend `validate()` in `learner/substrate/__init__.py` to enforce them. This is the contract every later task codes against.
**Acceptance criteria:**
- [ ] `schema.yaml` declares `Streak` type and invariant `0 <= streak.freezes.equipped <= streak.freezes.max <= 2`
- [ ] `validate()` returns an error when `freeze.max > 2` or `equipped > max`
- [ ] `validate()` returns an error when a review record's `rating` is present but not one of `{again, hard, good, easy}`
- [ ] Existing tests still pass (no regression to `test_validate_*`)
**Verification:** `python3 -m unittest discover -s learner/substrate/tests`
**Dependencies:** None
**Files:** `learner/substrate/schema.yaml`, `learner/substrate/__init__.py`, `learner/substrate/tests/test_substrate.py`
**Scope:** S (3 files)

#### Task 2: Define the `units_log` review-record model and populate one seed record
**Description:** Promote `units_log` from `[]` to carrying real review records (the FSRS input of Phase 1). Define the record shape in `schema.yaml` and write one seed record for the current active unit into `learning_state.yaml`, sourced from the existing gate state (no invented history).
**Acceptance criteria:**
- [ ] `schema.yaml` documents the review-record shape (`unit_id`, `concept`, `kind`, `reviews[]`, `mastered`)
- [ ] `learning_state.yaml` `units_log` has ≥1 record for `U0-sonda-rate-limiter-robustness`
- [ ] `load_and_validate()` accepts the populated state (no invariant violations)
- [ ] `test_no_mastered_state_in_canonical` still passes
**Verification:** `python3 -m unittest discover -s learner/substrate/tests`
**Dependencies:** Task 1
**Files:** `learner/substrate/schema.yaml`, `learner/learning_state.yaml`
**Scope:** S (2 files)

#### Task 3: Gate-outcome → FSRS-rating mapping (pure function, no scheduler yet)
**Description:** Add a pure function `rating_from_gate_outcome(outcome)` mapping gate results to `{again, hard, good, easy}` per the ADR table. Unit-test it in isolation. This is the rule the research anchors ("rating comes only from the gate").
**Acceptance criteria:**
- [ ] Function maps `{fail→again, pass+retried→hard, pass-first-try→good, pass+exceeds-target→easy}`
- [ ] Property test: output is always in the 4-value set for any input
- [ ] Function is importable from the substrate package surface
**Verification:** new unittest case in `test_substrate.py`
**Dependencies:** Task 1
**Files:** `learner/substrate/__init__.py` (or new `learner/substrate/scheduling.py`), `learner/substrate/tests/test_substrate.py`
**Scope:** S (2 files)

#### Task 4: Delete the `_next_reviews()` stub; derive naive reviews from `units_log`
**Description:** Remove the hardcoded `_next_reviews()` in `dashboard_snapshot.py` and replace it with a derivation from `units_log` using a naive `+N days` interval (no FSRS yet — that's Phase 1). This makes the snapshot evidence-driven and unblocks the TS surface.
**Acceptance criteria:**
- [ ] No hardcoded `"overdue 2d"` / `"U-005"` strings remain in `dashboard_snapshot.py`
- [ ] `nextReviews` is derived from `units_log` (overdue = `due < today`; interleaving/recurring-trap from kind/last-seen)
- [ ] `test_build_snapshot_reflects_canonical_state` updated and passes
- [ ] `python3 -m learner.substrate` regenerates `data/learner.ts` cleanly
**Verification:** `python3 -m unittest discover -s learner/substrate/tests` then `python3 -m learner.substrate`
**Dependencies:** Tasks 2, 3
**Files:** `learner/substrate/dashboard_snapshot.py`, `learner/substrate/tests/test_substrate.py`
**Scope:** M (2 files, non-trivial logic)

### Checkpoint: Phase 0 — foundation
- [ ] All substrate unittests pass
- [ ] `python3 -m learner.substrate` succeeds
- [ ] `_next_reviews()` stub gone; reviews derived from `units_log`
- [ ] **Review with human before introducing `py-fsrs` dependency**

---

### Phase 1: Real FSRS scheduling

#### Task 5: Declare Python dependencies for the substrate
**Description:** The substrate has **no deps file** (runs on stdlib + undeclared pyyaml). Establish one (e.g. `learner/substrate/requirements.txt` or repo-root `pyproject.toml`) declaring both `pyyaml` (currently implicit) and `py-fsrs`. Document the install step in the substrate README.
**Acceptance criteria:**
- [ ] A deps file exists and pins `pyyaml` + `py-fsrs`
- [ ] `pip install -r <deps>` makes `import fsrs` succeed
- [ ] Substrate README documents the install step before `python3 -m learner.substrate`
- [ ] Existing tests still pass after install
**Verification:** fresh `python3 -c "import fsrs, yaml"` succeeds; unittests pass
**Dependencies:** None (parallel-safe with Phase 0)
**Files:** new deps file, `learner/substrate/README.md`
**Scope:** S (2 files)

#### Task 6: FSRS scheduler integration in the substrate
**Description:** Wire `py-fsrs` into the review derivation. On each review record, maintain FSRS `Card` state (`stability`, `difficulty`, `due`, `last_review`); compute `nextReviews` from `due` dates instead of naive `+N`. Seed scheduler state from the Phase-0 `units_log`.
**Acceptance criteria:**
- [ ] A `rating=again` review produces `due ≤ tomorrow`; `rating=easy` produces a longer interval (asserted)
- [ ] FSRS `Card` fields are persisted back into `units_log[].fsrs`
- [ ] `nextReviews` ordering is by `due` ascending
- [ ] Scheduler is pure/deterministic given the same `units_log` (testable without `Date.now`-style nondeterminism — use injected "today")
**Verification:** new `TestFSRSScheduling` unittest cases
**Dependencies:** Tasks 4, 5
**Files:** `learner/substrate/scheduling.py`, `learner/substrate/dashboard_snapshot.py`, `learner/substrate/tests/test_substrate.py`
**Scope:** M (3 files)

#### Task 7: Extend `LearnerSnapshot` TS type + renderer for FSRS `nextReviews`
**Description:** Update `engines/codexDojo/src/domain.ts` `nextReviews.reason` to add `"due"`, and update `dashboard_snapshot.py` `render_ts` to emit it. Per the existing contract, change **both** together. Keep `pnpm run build` green.
**Acceptance criteria:**
- [ ] `nextReviews.reason` type includes `"due"`
- [ ] `render_ts` emits `due` reason for FSRS-due items
- [ ] `pnpm run lint && pnpm run test && pnpm run build` pass in codexDojo
- [ ] `test_render_ts_is_well_formed_typescript` updated and passes
**Verification:** `cd engines/codexDojo && pnpm run lint && pnpm run test && pnpm run build`
**Dependencies:** Task 6
**Files:** `engines/codexDojo/src/domain.ts`, `learner/substrate/dashboard_snapshot.py`, `learner/substrate/tests/test_substrate.py`
**Scope:** S (3 files, small edits)

### Checkpoint: Phase 1 — FSRS live on dashboard
- [ ] codexDojo dashboard shows FSRS-scheduled `nextReviews`
- [ ] All substrate + codexDojo tests pass; both builds green
- [ ] Negative check: `git diff` contains no hearts/leagues/gems/R-value code

---

### Phase 2: Streak + freeze

#### Task 8: Streak/freeze state model + gate-driven transitions
**Description:** Add the `streak:` block to `learning_state.yaml` and a pure `update_streak(state, gate_outcome, today)` function in the substrate. Streak increments on a passed gate; a missed gate-day consumes a freeze (cap 2) or breaks the streak. Calendar idleness alone never breaks it.
**Acceptance criteria:**
- [ ] Passed gate → `streak.current += 1`, `last_gate_date = today`
- [ ] Missed gate-day with `equipped > 0` → `equipped -= 1`, streak preserved
- [ ] Missed gate-day with `equipped == 0` → `current = 0`
- [ ] `equipped <= 2` enforced (Task 1 invariant holds)
- [ ] Property tests for each transition
**Verification:** new `TestStreak` unittest cases
**Dependencies:** Task 1
**Files:** `learner/substrate/scheduling.py`, `learner/learning_state.yaml`, `learner/substrate/tests/test_substrate.py`
**Scope:** M (3 files)

#### Task 9: Render streak on codexDojo dashboard
**Description:** Add `streak` to `LearnerSnapshot` (`domain.ts`) and render it in `render/learner.ts`. Compute `daysToBreak` (null when a freeze absorbs the next miss). Update renderer.
**Acceptance criteria:**
- [ ] `LearnerSnapshot.streak` shape matches ADR (`current`, `longest`, `freezesEquipped`, `freezesMax`, `daysToBreak`)
- [ ] Dashboard shows current streak + freezes
- [ ] `pnpm run lint && pnpm run test && pnpm run build` pass
**Verification:** codexDojo lint/test/build
**Dependencies:** Tasks 7, 8
**Files:** `engines/codexDojo/src/domain.ts`, `learner/substrate/dashboard_snapshot.py`, `engines/codexDojo/src/render/learner.ts`, `learner/substrate/tests/test_substrate.py`
**Scope:** M (4 files)

### Checkpoint: Phase 2 — streak loop complete
- [ ] Streak increments on gate pass, survives a freeze, breaks correctly
- [ ] Dashboard renders streak; all tests + builds green

---

### Phase 3: pixelDojo surface

#### Task 10: Expose `nextReviews` slice to pixelDojo (respect `evidence_only`)
**Description:** pixelDojo arcade quests should be able to *be* a scheduled review. Per the Allium spec (`GameNeverMarksMastery`, `evidence_only: true`), the game **emits evidence only** — it never marks mastery or mutates the streak directly. Add a read-only projection of `nextReviews`/`streak` that a quest can display; gate resolution still flows through the verifier.
**Acceptance criteria:**
- [ ] pixelDojo can read the `nextReviews` slice from the snapshot (read-only)
- [ ] No pixelDojo code path writes to `streak` or marks a unit `mastered`
- [ ] Allium invariant `GameNeverMarksMastery` still holds (spec-level: game surface unchanged)
**Verification:** grep pixelDojo for any `streak`/`mastered` writes (none); existing pixelDojo tests pass
**Dependencies:** Task 9 (snapshot shape stable)
**Files:** TBD pixelDojo content pack / snapshot read path
**Scope:** M (defer detailed file list until snapshot shape lands)

---

### Phase 4: CURR metric

#### Task 11: Compute and render CURR (labeled unvalidated)
**Description:** Compute CURR from `learning_states` (share of `practicing`/`evaluating` units advancing within a 7-day window). Surface as `curr` on the dashboard, **explicitly labeled "unvalidated proxy."**
**Acceptance criteria:**
- [ ] `curr` computed in substrate from `units_log` + `learning_states`
- [ ] Dashboard renders `curr` with visible "unvalidated proxy" label
- [ ] No automated decision (gating, streak, scheduling) depends on `curr`
**Verification:** substrate unittest for the CURR computation; codexDojo build green
**Dependencies:** Task 6 (units_log populated)
**Files:** `learner/substrate/dashboard_snapshot.py`, `engines/codexDojo/src/domain.ts`, `engines/codexDojo/src/render/learner.ts`
**Scope:** M (3 files)

### Checkpoint: Complete
- [ ] All Phase 0–4 acceptance criteria met
- [ ] Negative acceptance: `git diff` grep for `heart|life|league|gem|R-value|R = sqrt` returns nothing
- [ ] ADR `## Acceptance criteria` checklist all green
- [ ] Ready for review

---

## Parallelization

- **Parallel-safe with Phase 0:** Task 5 (deps declaration) — independent.
- **Parallel-safe after Task 7 lands the snapshot shape:** Task 9 streak-render vs Task 11 CURR can both extend the snapshot — coordinate so the shape is set once, then fan out.
- **Strictly sequential:** Tasks 1→2→4 (schema → data → stub removal); Tasks 5→6 (deps → FSRS).
- **Needs coordination:** any two tasks editing `domain.ts` / `dashboard_snapshot.py` simultaneously — land the shape in the lowest-numbered task.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| No Python deps file exists; pyyaml itself is undeclared | High | Task 5 establishes deps before any FSRS code; pin both `pyyaml` + `py-fsrs` |
| Scheduler nondeterminism (dates) makes tests flaky | Med | Inject "today" into scheduler functions; never call bare `date.today()` in pure scheduling logic |
| `test_build_snapshot_*` pins current values (masteredCount=1, scaffoldedCount=17, current=0.34) | Med | Update those assertions alongside the snapshot changes in the same task |
| Snapshot shape churn blocks parallel render work | Med | Freeze the shape at Task 7; later tasks only add fields |
| CURR proxy treated as authoritative | Med | Hard rule: no automation depends on `curr`; ship the "unvalidated" label as an acceptance criterion |

## Open Questions

- Should FSRS parameters be personalized per-learner from the start, or ship defaults until `units_log` has enough reviews? (Recommend: defaults first; personalize after ~20 reviews/learner — matches FSRS guidance.)
- Where exactly does pixelDojo read the snapshot from (bundled TS like codexDojo, or a generated content pack)? Resolve at Task 10 kickoff.
- Does `streak.last_gate_date` live in hand-edited `learning_state.yaml` or only in a generated view? Prefer the YAML (source of truth) so it's auditable.
