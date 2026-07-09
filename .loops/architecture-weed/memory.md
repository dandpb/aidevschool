# Loop Memory — `architecture-weed`

Append-only run log. Read this file FIRST at the start of every run before touching substrate.

## Run 2026-07-05T19:48:00-03:00

- mode: ON
- inputs: `docs/FUNDAMENTOS.md` (Accepted 2026-07-05), `docs/PROMPTS/-01_GOAL.md`,
  `AGENTS.md` (root), `docs/AGENTS.md`, `engines/codexDojo/ecosystem/MANIFEST.md`
  (via AGENTS.md reference), `docs/ARCHITECTURE_EVALUATION_2026-07-05.md`,
  `.claude/skills/threejs-dojo/SKILL.md` (convention reference), `learner/`,
  `engines/` outline, `docs/PROMPTS/IDEIAS/`.
- skipped: none (first run — nothing prior to skip).
- rerun: none (single iteration, done-rule met on first pass).
- verification: not yet externally graded — the producer cannot self-grade (F3).
  The run produced the ADR; a fresh-context subagent verifier should score it
  before the run is treated as fully closed. Until then, treat this entry as
  `pending_verification`.
- adr: `docs/design/adr/0001-architecture-weed-loop.md`
- divergences: 1 found, 1 classified, 0 deferred.
  - Found: `docs/FUNDAMENTOS.md` is Accepted by Daniel but not referenced from
    `AGENTS.md` or `engines/codexDojo/ecosystem/MANIFEST.md`, and no ADR formalizes
    the adoption. No process keeps it from drifting.
  - Classified: **spec bug** (substrate is correct in substance, but the link from
    the rest of the canonical docs is missing — F4 violation: not auditable from
    `AGENTS.md`).
  - Decision: ADR-0001 ratifies the doc + adopts the loop in one shot.
- lessons:
  - The user's `docs/FUNDAMENTOS.md` predates the loop and is already better than
    what the producer would have drafted cold. **Always read the repo before
    writing a parallel doc** — drift is the failure mode this loop exists to
    prevent, and the loop's own first run almost produced drift by re-deriving
    fundamentals that already existed.
  - `AGENTS.md` and `engines/codexDojo/ecosystem/MANIFEST.md` need a one-line
    update to point at FUNDAMENTOS.md and the new loop. Tracked as a side-effect
    of this run (see `AGENTS.md` changes in the same commit as this ADR).
  - The first ADR ratifying a doc the user already accepted is a real
    architectural artifact, not busywork — it creates the auditable link (F4)
    and the process owner (the loop).
  - **Next run hint:** GAP 3 from `ARCHITECTURE_EVALUATION_2026-07-05.md`
    (ciclo 01 do `miniMaxEvolutionEngine` parado em `impl-done` desde 2026-06-04)
    is the obvious next consequential divergence. The decision is between
    "completar o ciclo manualmente" vs "completar via openclaw quando
    amadurecer". Both options need a benchmark N≥3 (F6), so the ADR will
    inherit a dependency on GAP 3 being unblocked first.
  - **Verifier reminder:** a real run must spawn a fresh-context subagent
    (per the skill's Verification section) to score this ADR. This memory
    entry's `verification` field is intentionally `pending_verification`
    until that happens — do not graduate Training Mode without a clean
    external PASS.

## Run 2026-07-08T22:05:58-03:00

- mode: ON
- inputs: `docs/FUNDAMENTOS.md`, `docs/PROMPTS/-01_GOAL.md`, `AGENTS.md` (root),
  `docs/AGENTS.md`, `engines/codexDojo/ecosystem/MANIFEST.md`, ADRs 0001/0002,
  `docs/ARCHITECTURE_EVALUATION_2026-07-05.md`, `docs/TECH_DEBT_AUDIT_2026-07-08.md`,
  `learner/pipeline_status.md`, `learner/learning_state.yaml`, `curriculum/BACKLOG_STATUS.md`,
  `learner/substrate/{dashboard_snapshot,adapters/whiteboard,__init__}.py`, voxelDojo/pixelDojo
  evidence surfaces, substrate test suites (drift + voxel slice).
- skipped: Step 1 could not skip (canonical files changed since last run: ADR-0002 + AGENTS.md
  regen @2591bdb). Step 5 skipped — this run records the decision only, does not mutate
  `learner/learning_state.yaml`, so no view regeneration is owed.
- rerun: none — single iteration; ADR passed verification on first pass.
- verification: **9/10 — PASS** — fresh-context verifier confirmed every anchor (bar 9:
  substrate-contract ADR); one post-verify honesty nit ("4 values"→"3 + seed"), details in run-output
  §Verifier verdict.
- adr: `docs/design/adr/0003-aidi-canonical-source.md`
- divergences: 5 found, 5 classified, 3 deferred. GAP 3 + audit items #1/#4/#21 all RESOLVED at
  HEAD (the 2026-07-08 audit is substantially stale — caught only because F3 verification was
  applied to its claims). Chosen: audit #5 (AIDI no canonical source — F2). Deferred: audit #9
  (partial `validate()`), `atomic_write_text` dup, ADR-0002-outside-loop-memory, MANIFEST count
  drift.
- lessons:
  - **Verify the audit before citing it.** `TECH_DEBT_AUDIT_2026-07-08.md` carried 3 high-priority
    items (#1 P32, #4 P24, #21 P24) as `open` that were already fixed by the same-day commit burst
    (`b840234`/`3244a86`/`cc2b618`/`52aaf72`). An audit is a snapshot, not a live source. Any future
    run must re-check audit items against HEAD before treating them as divergences — same F3 rule
    the loop applies everywhere else.
  - **The fresh-context verifier is the loop's keystone** — keep its prompt minimal: Goal +
    Done-Rules + ADR path + principle, never the producer's reasoning.
  - **Raising the threshold to 9/10 for substrate-contract ADRs worked** — ADR-0003 adds a
    `learner/aidi` field, which is a contract change; 9 held comfortably (9/10, confidence high).
  - **Next-run hint (highest value):** execute the ADR-0003 implementation follow-up (steps in
    run-output §Next-run hint); then audit #9 (partial `validate()`) is the next decision-worthy
    divergence.
  - **Training Mode graduation:** clean verifier PASS **#1** (2026-07-05 was
    `pending_verification`); bar is 3 consecutive — do NOT graduate yet.
