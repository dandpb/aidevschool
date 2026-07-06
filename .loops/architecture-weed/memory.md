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
