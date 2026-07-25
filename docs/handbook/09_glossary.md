# Glossary

The repo is bilingual: the UI and many domain terms are Portuguese, while most documentation is
English. This glossary maps the terms you'll meet.

## Core concepts

| Term | Meaning |
| --- | --- |
| **Ecosystem / umbrella** | The repo root. A collection of engines sharing one curriculum and one learner — not a single app. No root package manager. |
| **Engine** | A separate project under `engines/`, such as a runnable learner surface, agent core, or orchestration runner. See the architecture handbook for the current inventory. |
| **Ágora Continuum** | The name of the 14-agent tutoring system / protocol. |
| **Learning gate** | The block (`gate.implementation_blocked`) that prevents AI implementation until the learner attempts and is evaluated. |
| **Empirical gate** | The declared, independently verifiable pass/fail bar for mastery. Programming units use executable checks and metrics; Level 0 no-code units use the falsifiable ADR-0004 checklist. |
| **Producer ≠ verifier** | The rule that nothing verifies its own output; the verifier works from an isolated context. |
| **Executable evidence** | Real test, coverage, mutation, or benchmark output: the evidence class required by programming gates. |
| **No-code gate evidence** | A falsifiable application checklist independently reviewed under ADR-0004; local completion or self-report alone is insufficient. |
| **Substrate** | `learner/substrate/` — the Python validator + adapters that keep derived views in sync with canonical state. |
| **Derived view** | A generated file (`.mavis/`, whiteboard, `learner.ts`, `reviewSlice.ts`) regenerated from canonical state; never hand-edited. |
| **Diagnostic** | A project's `docs/diagnostic.md` — the learning-gate challenge the learner attempts. |
| **Polyglot** | Implemented in Go, Rust, and Node/TypeScript from one shared spec. |
| **Polyglot Arena** | The exercise of predicting then comparing the three languages' benchmarks; gated until the learner commits predictions. |
| **AIDI / `ai_dependency_index`** | A metric tracking how dependent the learner is on the AI; lower is better. |
| **FSRS** | Free Spaced Repetition Scheduler — the spaced-repetition algorithm; ratings come only from gate outcomes. |
| **CURR** | Current-user Retention Rate proxy (7-day window). Explicitly unvalidated; drives no automated decision. |
| **Streak / freeze** | Consecutive days with a passing gate; equipped freezes absorb missed days up to canonical `streak.freezes.max`. |
| **Dreyfus × Bloom** | The two-axis model used to classify the learner's level per concept (skill acquisition × cognitive depth). |

## State-machine values

| Learning state (English) | Mavis (pt, lowercase) | Whiteboard (pt, UPPERCASE) | Meaning |
| --- | --- | --- | --- |
| `presenting` | `apresentando` | `APRESENTANDO` | The unit is being presented. |
| `practicing` | `praticando` | `PRATICANDO` | The learner is attempting it. |
| `evaluating` | `avaliando` | `AVALIANDO` | The verifier is judging the work. |
| `mastered` | `dominado` | `DOMINADO` | Passed the declared gate with appropriate independently verified evidence. |
| — | — | `FALHA_BLOQUEIO` | Failure block after `⟨config: retries.max_por_unidade⟩` retries → escalated to governance. |

Artifact states: `producing → verifying → done` (the empirical-gate sub-machine).

## The agents

Portuguese names are used throughout the prompts and the dashboard. In the Claude Code engine
(`miniMaxEvolutionEngine`) several have anglicized subagent ids (shown in parentheses).

| Agent (pt) | Subagent id | Role |
| --- | --- | --- |
| **Maestro** | (orchestrator loop) | Leader; runs the state machine; coordinates, doesn't produce. |
| **Cronos** | `cronos` | Scheduler of recurring tasks. |
| **Sonda** | `sonda` | Short diagnostic; classifies Dreyfus × Bloom; grades the gate attempt. |
| **Cartógrafo** | (curator) | Builds the robustness trail; unlocks by proven prerequisite. |
| **Mestre-Conteúdo** | `curator` | Generates exercises; withholds solutions. |
| **Sócrates** | `socrates` | Socratic tutor; demands an attempt + confusion point first; hint quota from `⟨config: socrates.quota_dia⟩`. |
| **Mneme** | `mneme` | Spaced-repetition micro-reviews. |
| **Prometor** | `verifier` | The adversarial verifier / empirical gate; starts from zero. |
| **Crítico** | `reviewer` | Pedagogical code reviewer (explains the *why*). |
| **Galileu** | `benchmarker` / `optimizer` | Benchmarks with statistical rigor; architecture/ADRs. |
| **Atena** | (metrics) | Metrics panel over new code; AIDI; forbidden DORA-as-skill-proxy. |
| **Mnemosyne** | `mnemosyne` | Memory keeper (3 layers); curates the whiteboard. |
| **Ouroboros** | (optimizer) | Continuous self-improvement loop; turns wins into Skills. |
| **Sêneca** | `seneca` | Human-in-the-loop governance; SLA from `⟨config: seneca.sla_horas⟩`; conservative on expiry. |
| — | `dev-go` / `dev-rust` / `dev-node` | The three parallel polyglot implementers. |
| — | `verifier-haiku` | Cross-model auditor; disagreement escalates to Sêneca. |
| — | `fairness-auditor` | Arena: checks the three impls were at equal effort budget. |
| — | `arena-narrator` | Arena: writes the pedagogical comparison narrative. |

## Tooling roots

| Directory | What it is |
| --- | --- |
| `.mavis/` | Canonical derived runtime view of `learner/`; regenerated by the substrate. |
| `.codex/`, `.omo/`, `.opencode/`, `.serena/`, `.commandcode/`, `.compozy/` | Per-tool session state. |
| `.playwright-mcp/` | Playwright MCP session state. |
| `.codegraph`, `graphify-out/` | Generated code-graph references, not source. |

## Common abbreviations

| Abbr. | Expansion |
| --- | --- |
| ADR / MADR | Architecture Decision Record / Markdown ADR format. |
| CV | Coefficient of variation (benchmark stability; the blocking threshold is `⟨config: galileu.cv_max_pct⟩`). |
| DLQ | Dead-letter queue. |
| DoD | Definition of Done. |
| HITL | Human-in-the-loop. |
| RACI | Responsible / Accountable / Consulted / Informed matrix. |
| SLA | Service-level agreement (Sêneca's decision window is `⟨config: seneca.sla_horas⟩`). |
| NDJSON | Newline-delimited JSON (the evidence/event log format). |
