# Engine — miniMaxEvolutionEngine

**Path:** `engines/miniMaxEvolutionEngine/` · **Type:** agent core (runnable motor) · **Platform:**
Claude Code.

## Purpose

The **runnable Claude Code motor** for the school's file-based protocol: the 5-phase software loop +
adversarial verifier + learning gate. Claude Code is treated as just one orchestration platform
(alongside OpenClaw, Mavis, OpenCode, Codex) all driving the **same** file-based system —
"don't reinvent the protocol; it already exists in `docs/`."

Here the **main Claude Code loop is the Orchestrator (Maestro / Mavis)**: it delegates to specialized
subagents and runs the verifier gate between phases. It never writes implementation code in the loop
itself.

## How to run it

```text
1. Open Claude Code rooted at engines/miniMaxEvolutionEngine/
2. (SessionStart hook is intended to inject pipeline + gate state — see Doc note below)
3. /devschool-status                 # see pipeline_status + learning gate
4. /devschool-diagnose               # if gate blocked: run the diagnostic (sonda)
5. /devschool-cycle                  # run the full 5-phase loop once unblocked
```

For continuous operation, schedule `/devschool-cycle` or `/devschool-diagnose` (runs on Anthropic
cloud — billed, requires explicit confirmation). Before any commit: run `/simplify` on the diff,
apply, then commit.

## The 5-phase loop

Machine state lives in `learner/pipeline_status.yaml`; `pipeline_status.md` is human narrative only.
The **verifier gate runs between every producer phase**;
status advances to the next phase only after the verifier returns `PASS`. On `FAIL`, the orchestrator
"wakes" the producer with concrete feedback and retries (respecting `retry_limit`).

| Phase | `phase` value | Producer subagent | Artifact |
| --- | --- | --- | --- |
| 1 — Spec & Architecture | `spec-done` | `curator` | `curriculum/NN/docs/spec.md` |
| 2 — Polyglot Implementation | `impl-done` | `dev-go`, `dev-rust`, `dev-node` (parallel) | `curriculum/NN/{go,rust,node}-impl/` |
| 3 — Review & Pedagogy | `review-done` | `reviewer` | `code_review.md`, `learning_notes.md`, `quiz.md` |
| 4 — Benchmark & Profiling | `benchmark-done` | `benchmarker` | `benchmark_results.md`, `benchmarks/results/` |
| 5 — Evolution & Scale | `cycle-complete` | `optimizer` | `evolution_report.md` |

Root globals: `learner/pipeline_status.yaml` (machine pipeline state), `learner/pipeline_status.md`
(human narrative), and `learner/journal.md` (append-only).

## The verifier + gate

**`verifier`** (`.claude/agents/verifier.md`, model opus, tools Read/Grep/Glob/Bash — **no write
tools by design**) is the ephemeral adversarial gate. Mandate of refutation: try to break the work.
It starts in a clean context with no producer narrative (anti-anchoring), re-runs builds/tests/
benchmarks for real, and returns a structured `VEREDICTO: PASS | FAIL` with `file:line` / command
evidence. PASS only if **all** checks pass. Canonical `verify_prompt`s per phase live in
`.mavis/plans/plan.yaml`.

**`verifier-haiku`** (model haiku) is a cross-model auditor running the **same contract** at a
different tier, sampled at `audit_sample_rate` (default 0.2). Disagreement with the standard verifier
escalates to `seneca`.

## The learning gate (skill `agora-continuum`)

Per-unit deterministic machine: `presenting → practicing → evaluating → mastered` (with
`retry_count` / `retry_limit`). State in `learner/learning_state.yaml`. While
`gate.implementation_blocked: true` and `required_before_implementation: true`, **the AI does not
implement the unit** — first `sonda` diagnoses, the learner attempts, and the attempt is evaluated
with executable evidence (`unblock_condition: learner_attempt_evaluated`). The empirical gate:
coverage ≥ `min_coverage` (0.80), mutation ≥ `mutation_min` (0.60) when applicable. Errors →
`learner/pitfalls.md`; wins → `learner/journal.md`; mastery updates append to `units_log` with
`{id, mastered_at, evidence}`. This skill must not be skipped.

## The 17 subagents (`.claude/agents/`)

Model tier in parentheses. The first 15 mirror the shared protocol; the last 2 are arena-only.

`sonda` (sonnet), `socrates` (sonnet), `cronos` (haiku), `mneme` (haiku), `mnemosyne` (sonnet),
`seneca` (opus), `curator` (opus — Phase 1), `dev-go` / `dev-rust` / `dev-node` (sonnet — Phase 2,
parallel), `reviewer` (opus — Phase 3), `benchmarker` (sonnet — Phase 4), `optimizer` (opus —
Phase 5), `verifier` (opus), `verifier-haiku` (haiku).

Arena extras (ADR-005, "Polyglot Comparison Arena"): `fairness-auditor` (opus — judges, before
benchmark, whether the three implementations were at equal effort budget, so the benchmark measures
languages and not unequal producer effort) and `arena-narrator` (opus — writes the pedagogical
`arena_report.md` narrative).

**Model-routing rule:** deep reasoning (curator/reviewer/optimizer/verifier) → opus; high-volume
generation (devs/benchmarker/sonda) → sonnet; the verifier runs a different tier from producers for
cross-model diversity. Subagents never call other subagents — the orchestrator chains them, and the
three `dev-*` are dispatched in one message to run in parallel.

## The 18 slash commands (`.claude/commands/devschool/`)

| Group | Commands |
| --- | --- |
| Workflow | `/devschool-status`, `/devschool-diagnose`, `/devschool-socratic`, `/devschool-recall`, `/devschool-mnemosyne-compact`, `/devschool-cron-list`, `/devschool-decide` |
| Phases | `/devschool-spec`, `/devschool-implement`, `/devschool-review`, `/devschool-benchmark`, `/devschool-optimize`, `/devschool-verify` |
| Loops | `/devschool-cycle` (full 5-phase loop), `/devschool-audit` (cross-model sampling), `/devschool-next` (close cycle → pick next catalog project) |
| Arena | `/devschool-arena` (3 impls + fairness audit + benchmark + narrative + verifier → `arena_report.md`) |
| Internal | `/devschool-phaserunner` (not user-invoked) |

### The PhaseRunner seam

`phaserunner.md` defines a **protocol, not a subagent**, that collapses the repeated
`read-state → check-gate → dispatch producer → dispatch verifier → update status → retry` dance into a
single `run_phase(spec)` interface. `spec` fields: `phase`, `producer` (str|list), `verifier_phase`,
`next_status`, optional `pre_condition`, `parallel`, `learning_gate_check`, `retry_limit`, `artefact`,
`project`. It is backed by a real test: `.claude/commands/devschool/tests/test_phaserunner.py`.
`cycle.md` declares each phase as a YAML `spec` block and calls `run_phase(...)` per declaration.

## Directory map

| Path | Role |
| --- | --- |
| `CLAUDE.md` | Authoritative orchestrator doc: phases, gate, subagents, commands, model routing, security. |
| `AGENTS.md` | Terse "where to look" + conventions + anti-patterns. |
| `.claude/agents/*.md` | 17 subagent definitions (YAML frontmatter: name/description/tools/model/color). |
| `.claude/commands/devschool/*.md` | 18 slash commands + a `tests/` subdir. |
| `.claude/skills/agora-continuum/SKILL.md` | The learning-gate protocol skill. |
| `.claude/hooks/briefing.sh` | SessionStart hook — injects `pipeline_status.yaml` + `learning_state.yaml`. |
| `curriculum → ../../curriculum` | Symlink to the shared curriculum. |
| `learner → ../../learner` | Symlink to the shared learner substrate. |
| `docs → ../../docs` | Symlink to the shared ecosystem docs. |
| `.mavis → ../../.mavis` | Symlink to the Mavis plan / derived view. |

`.claude/settings.json` registers `briefing.sh` as a `SessionStart` hook, so opening Claude Code in
this engine injects the pipeline + gate state automatically.

## Relationship to minimaxDojo

Both implement the **identical protocol** (deterministic state machine + adversarial verifier +
empirical learning gate + the same 14 agent roles + the same model-routing rule), differing only in
platform and form. minimaxDojo is the prompt/spec layer for the MiniMax Agent Team (with a Python
reference implementation under `core/`); miniMaxEvolutionEngine is the runnable Claude Code motor that
turns those roles into `.claude/agents/*.md` subagents and the loop into `/devschool-*` commands. It
adds the two arena agents + the arena command (ADR-005). Both reference the **same** root `learner/`
and `curriculum/` and are forbidden from forking global learner state.

## Conventions & anti-patterns

- Never replace the symlinks with copied directories — the root stays the source of truth.
- Never advance `pipeline_status.yaml` before the verifier returns PASS; do not parse the Markdown
  narrative as a cold-start fallback.
- Never create recurring cloud schedules without explicit user confirmation (they are billed).
- Builds/tests (go/cargo/npm, docker) run sandboxed; the benchmarker must flag macOS Docker CPU
  throttling and never declare a winner on a <10% difference under noise.
