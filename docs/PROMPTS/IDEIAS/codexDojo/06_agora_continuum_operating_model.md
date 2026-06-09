# Agora Continuum Operating Model

> Imported from the pasted "Ágora Continuum" request on 2026-06-03.
> This document is the deterministic operating contract for long-running tutoring inside aidevschool.

## Resolved Defaults

| Field | Value | Reason |
|-------|-------|--------|
| Learning track focus | TypeScript | Briefing popup 2026-06-03 — user picked TS as the active focus. Practice, mutation testing, and refactoring run in TS. |
| AI DevSchool projects | Go, Rust, Node.js/TypeScript (unchanged) | Comparative projects stay polyglot; ÁGORA personal track is TypeScript-first. Task 3 of the diagnostic uses all three impls for code-reading breadth. |
| Weekly time | 5h | Briefing popup — learner picked 5h/week (not 3h). |
| Session cadence | 25-40 min, 4-5x/week | Briefing popup. Cadence is short bursts, not 1h blocks. |
| Hint budget | 15 queries/day | Briefing popup + ÁGORA anti-dependency rule. |
| HITL SLA | 24h, auto-reject/self-escalate | No human instructor; Seneca-Opus copilot. |
| Current project | Project 01: Token-Bucket Rate Limiter | `docs/status.md` is at `impl-done` after peer-session work, but it is **ungated outside the ÁGORA flow**; Prometor will re-validate against the empirical gate before any "dominado" state. |
| Implemented-but-ungated | Node/TS implementation shipped by dev-node | Peer session (mvs_b73e655ac1704a8e807843feb57c2be9) ran dev-node in parallel before the diagnostic was attempted. Code is real (91.86% line coverage, 40/40 tests) but **violates the operating-model rule that implementation work must wait for the diagnostic**. Re-validate before any "dominado". |

## Core Rule

Completion certainty never lives in the language model. Every learning unit must pass through a deterministic state machine and an empirical gate before it can be marked mastered.

## State Machine

Learning units move through:

```text
apresentando -> praticando -> avaliando -> dominado
```

Produced artifacts move through:

```text
producing -> verifying -> done
```

The default retry limit is 3. A failed verifier result wakes the producer for a new attempt with isolated context and concrete failure evidence.

## Agents

| Group | Agent | Responsibility |
|-------|-------|----------------|
| Leader | Maestro | Owns decomposition, state transitions, retries, dispatch, and final Definition of Done. |
| Scheduling | Cronos | Owns recurring review, daily report, and weekly audit cadence. In this repo, Cronos records requested schedules in `.mavis/learning_state.yaml`; actual reminders require the host automation layer. |
| Pedagogy | Sonda | Runs short diagnostics that assume intermediate ability and search only for real gaps. |
| Pedagogy | Cartografo | Maintains the robustness path and only unlocks the next level with executable evidence. |
| Pedagogy | Mestre-Conteudo | Produces exercises, faded examples, Parsons problems, and project increments without removing productive struggle. |
| Pedagogy | Socrates | Provides graded hints only after the learner provides an attempt and exact confusion point. Daily hint budget: 15. |
| Pedagogy | Mneme | Schedules spaced recall and keeps the learner's recurring traps short and actionable. |
| Quality | Prometor | Ephemeral adversarial verifier. Starts from zero, generates and runs tests, and does not trust producer context. |
| Quality | Critico | Teaches through code review and evaluates the learner's own reviews. |
| Quality | Galileu | Owns benchmark rigor, ADRs, fitness functions, and architecture/scale labs. |
| Quality | Atena | Tracks code quality, learning metrics, Dreyfus/Bloom position, reflection quality, and AI dependency. |
| Memory | Mnemosyne | Maintains layered memory through handoff files, state files, and curated notes. |
| Memory | Ouroboros | Converts repeated traps into spaced-review items and reusable skills after review. |
| Governance | Seneca | Handles consequential decisions with conservative fallback after a 24h SLA. |

## Empirical Gates

For code-producing units:

- Tests must run in the relevant language runtime.
- Core behavior coverage target is at least 80%.
- Mutation score target is 60-70% when mutation tooling is available.
- Benchmarks require at least 10 samples, warmup, mean, median, minimum, and coefficient of variation.
- Claims such as "faster" are blocked when CV is at least 20%.
- Verifiers must start from the spec and attempt to refute the implementation.

For learning units:

- The learner must make an attempt before receiving direct answers.
- Evaluation must judge accuracy, speed, autonomy, review quality, and reflection quality.
- Mastery requires executable evidence when code is involved, not self-assessment.

## Anti-Dependency Rules

- Socrates never provides a finished solution as the first response to a practice task.
- Hints are progressive: checking, correcting, complementing, segmenting.
- The learner must state the exact confusion point before receiving targeted help.
- Direct solutions are allowed only after an attempt has been evaluated or when the unit has moved out of the productive-struggle phase.

## State Files

| File | Purpose |
|------|---------|
| `.mavis/learning_state.yaml` | Current whiteboard: learner state, active unit, retries, gates, and next action. |
| `docs/status.md` | Repo-level pipeline status plus current learning gate. |
| `learning_journal.md` | Append-only generalized lessons after empirical evidence. |
| `projects/01_rate_limiter/docs/diagnostic.md` | First Sonda diagnostic unit. |

## First Unit

The current unit is `U0-sonda-rate-limiter-robustness`. It is in `apresentando` state. The next observable action is a learner attempt against `projects/01_rate_limiter/docs/diagnostic.md`; implementation agents should not fill the rate-limiter TODOs until that diagnostic has been attempted and evaluated.

