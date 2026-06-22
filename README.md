# AI DevSchool — ecosystem

`aidevschool/` is a continuous multi-agent software-engineering school (the **ecosystem**). It teaches by building real projects, testing them, reviewing them, comparing technologies, measuring outcomes, and updating a living learning plan. Principle: **one learner, one curriculum, many engines.**

| Layer | Path | Purpose |
| --- | --- | --- |
| Engines (apps) | `engines/` | Agent-team implementations, each a separate project: `miniMaxEvolutionEngine` (Claude Code), `minimaxDojo` (14-agent core), `codexDojo` (pnpm app), `pixelDojo` (8-bit teaching-game engine with Playwright evidence contract). The polyglot arena design material is archived at `docs/design/polyglot-arena/` (proposal-stage, was `engines/polyglotEvolutionArena/` until 2026-06-21). |
| Curriculum (shared) | `curriculum/` | Real coding challenges plus `catalog.md`. |
| Learner (shared) | `learner/` | Learner journey: learning gate, profile, pitfalls, journal, pipeline status. |
| Platform tooling | `.mavis/`, `.opencode/`, `.Codex/`, `docs/` | Orchestration plans, platform adapters, ecosystem docs/ideas. |

## Start Here

| Need | File |
| --- | --- |
| Requirement coverage | `engines/codexDojo/ecosystem/MANIFEST.md` |
| Completion audit | `engines/codexDojo/ecosystem/COMPLETION_AUDIT.md` |
| Operating model | `engines/codexDojo/ecosystem/OPERATING_MODEL.md` |
| Agent prompts | `engines/codexDojo/ecosystem/AGENT_PROMPTS.md` |
| Roadmap | `engines/codexDojo/ecosystem/ROADMAP.md` |
| Curriculum scope | `engines/codexDojo/ecosystem/CURRICULUM_SCOPE.md` |
| Memory model | `engines/codexDojo/ecosystem/MEMORY_MODEL.md` |
| Evaluation models | `engines/codexDojo/ecosystem/EVALUATION_MODELS.md` |
| OpenClaw/Hermes runbook | `engines/codexDojo/ecosystem/OPENCLAW_HERMES_RUNBOOK.md` |
| Deep tutor core index | `engines/minimaxDojo/INDEX.md` |

## Run The Dashboard

```bash
cd engines/codexDojo
pnpm install
pnpm run dev
```

Open `http://127.0.0.1:5173/`.

## Validate The Dashboard

```bash
cd engines/codexDojo
pnpm run lint
pnpm run test
pnpm run build
```

## Current Learning State

The active learning gate is stored in `learner/learning_state.yaml` (mirrored in `.mavis/learning_state.yaml`).

The current implementation project is `curriculum/01_rate_limiter/`. Some implementation work has already happened outside the learning gate; the verifier must re-check it before any mastery claim.

## Operating Principle

The system is only useful if it preserves productive struggle:

1. The learner attempts the unit.
2. Agents generate or review artifacts.
3. A separate verifier runs executable checks.
4. Metrics and review findings are recorded.
5. Memory updates the learner profile and next challenge.

No agent should mark a concept mastered from explanation alone.
