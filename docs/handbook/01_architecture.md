# Architecture

How the engine roles, shared curriculum, and learner substrate fit together — and why the design
is shaped the way it is.

## 1. The core idea

AI DevSchool is a **school**, not a code generator. It serves nontechnical
learners and programmers through short lessons, while preserving the same
evidence boundary. Its single most important constraint is that
**the certainty of completion never lives in the language model.** A unit of learning is only
`mastered` when two independent things have happened:

1. The **learner attempts** it (productive struggle is preserved).
2. A **separate verifier** applies the declared gate from an isolated context
   and accepts only evidence appropriate to that gate.

Programming units use executable checks such as tests, coverage, mutation and
benchmarks. Level 0 no-code units use the weaker, explicitly labeled
falsifiable-checklist gate in
[ADR-0004](../design/adr/0004-no-code-empirical-gate.md). Neither path allows a
model or producer to verify itself.

Everything in the architecture exists to enforce that constraint: the deterministic state machine,
the producer/verifier separation, the file-based audit trail, and the empirical gates.

## 2. Layered view

The ecosystem is layered. Agents and apps sit on top; the shared substrate sits underneath; the
filesystem is the source of truth for all of it.

```mermaid
flowchart TB
    subgraph surface["Product surface (runnable apps)"]
        codex["codexDojo<br/>dashboard / control surface"]
        os["codexDojo OS<br/>educational desktop bounded context"]
        literacy["LiteracyDojo<br/>nontechnical micro-lessons"]
        town["miniTown<br/>explore-only Level 0 entry"]
        pixel["pixelDojo<br/>8-bit teaching game"]
        voxel["voxelDojo<br/>3D teaching simulations"]
    end
    subgraph orchestration["Orchestration & tutoring (agent cores)"]
        mmee["miniMaxEvolutionEngine<br/>Claude Code 5-phase motor"]
        mmd["minimaxDojo<br/>14-agent tutoring spec"]
        openclaw["openclaw<br/>simulate-grade checklist runner"]
    end
    subgraph substrate["Shared substrate (source of truth)"]
        learner["learner/<br/>learning_state.yaml + substrate"]
        curriculum["curriculum/<br/>19 catalog entries + AI Literacy"]
    end
    derived[".mavis/ + generated views<br/>(regenerated, never hand-edited)"]

    codex -->|reads| learner
    os -->|reads generated projection| learner
    literacy -->|reads generated lesson model| curriculum
    town -.->|explores; no mastery write| curriculum
    pixel -->|reads| learner
    pixel -->|emits evidence| curriculum
    voxel -->|reads| learner
    voxel -->|emits evidence| curriculum
    mmee -->|reads/writes| learner
    mmee -->|produces| curriculum
    mmd -.->|same protocol| mmee
    openclaw -->|reads/writes pipeline status| learner
    openclaw -->|checks artifacts| curriculum
    learner -->|python3 -m learner.substrate| derived
    derived -->|generated learner.ts| codex
    derived -->|generated learner.ts| os
    derived -->|generated reviewSlice.ts| pixel
    derived -->|generated reviewSlice.ts| voxel
```

| Layer | Members | Responsibility |
| --- | --- | --- |
| **Product surface** | `literacyDojo`, `miniTown`, `codexDojo`, `codexdojo-os-prototype`, `pixelDojo`, `voxelDojo` | What a human sees and touches. LiteracyDojo keeps progress local; miniTown is exploration only; the other apps consume engine-local projections. None marks mastery. |
| **Orchestration / tutoring** | `miniMaxEvolutionEngine`, `minimaxDojo`, `openclaw` | Agent logic plus the simulate-grade artifact checklist. The Claude Code motor owns the interactive cycle; OpenClaw does not. |
| **Shared substrate** | `learner/`, `curriculum/` | The single source of truth. Canonical state in human-readable files; derived views regenerated from it. |

## 3. Engine roles

Each engine is a **separate project** with its own machine surface. They share one curriculum and
one learner — never duplicated, only projected into engine-local generated views.

| Engine | Type | One-liner | Detail |
| --- | --- | --- | --- |
| `engines/literacyDojo/` | Runnable app | Local-first AI microlearning for people without a programming prerequisite. Consumes canonical AI Literacy content and records at most `completed`. | [doc](12_engine_literacyDojo.md) |
| `engines/miniTown/` | Runnable app | Cozy, explore-only Level 0 entry. It exposes runtime state for inspection but emits no mastery. | [doc](11_engine_miniTown.md) |
| `engines/codexDojo/` | Runnable app | The user-facing dashboard — a Vite/TypeScript SPA showing the learner snapshot, agent roster, the cycle, and the 19-entry roadmap. | [doc](03_engine_codexDojo.md) |
| `engines/codexdojo-os-prototype/` | Runnable app | The canonical educational OS experience with local apps, Learn Mode, and a generated read-only learner snapshot. | [doc](03b_engine_codexdojo-os-prototype.md) |
| `engines/pixelDojo/` | Runnable app | 8-bit teaching games. The canonical game `pixel-quest/` turns one curriculum concept into one arcade mechanic and emits executable evidence when a level is cleared. | [doc](04_engine_pixelDojo.md) |
| `engines/voxelDojo/` | Runnable apps | Three.js teaching simulations with deterministic, headless simulation cores and browser evidence. | [doc](10_engine_voxelDojo.md) |
| `engines/minimaxDojo/` | Agent core | The 14-agent "Ágora Continuum" tutoring core — the state machine, gates, prompts, governance, and a Python reference implementation. Runs on the MiniMax Agent Team platform. | [doc](05_engine_minimaxDojo.md) |
| `engines/miniMaxEvolutionEngine/` | Agent core | The runnable Claude Code orchestration motor: the 5-phase loop (Spec → Implement → Review → Benchmark → Optimize), implemented as `.claude/` subagents and `/devschool-*` slash commands. | [doc](06_engine_miniMaxEvolutionEngine.md) |
| `engines/openclaw/` | Checklist runner | A file-based, simulate-grade runner that advances the 5-phase cycle when required artifacts pass path and size checks. | [engine README](../../engines/openclaw/README.md) |

### Why two agent cores?

`minimaxDojo` and `miniMaxEvolutionEngine` implement the **same protocol** — the same deterministic
state machine, the same adversarial verifier, the same empirical gate, the same agent roles — on
**different platforms**:

- `minimaxDojo` is the **spec / prompt layer** for the MiniMax Agent Team. "Running" it means pasting
  bootstrap prompts. Its `config/learner.yaml` is the canonical numeric-threshold seam, and it ships
  a Python reference implementation of the state machine + gates under `core/`.
- `miniMaxEvolutionEngine` is the **runnable Claude Code motor**. The 14 roles become `.claude/agents/*.md`
  subagents; the loop becomes 18 `/devschool-*` slash commands plus a PhaseRunner protocol and a
  SessionStart hook.

Both are forbidden from forking global learner state.

## 4. The two loops

The ecosystem runs two interlocking loops. Keeping them distinct is essential to understanding the
system.

### 4.1 The software cycle (5 phases)

Tracked for machines in `learner/pipeline_status.yaml`; `pipeline_status.md` keeps human notes.
Producers create artifacts, and the phase Verifier gates each transition. This role is distinct
from Prometor, the adversarial learning-gate context.

```mermaid
flowchart LR
    spec["1. Spec &<br/>Architecture<br/>(curator)"] --> impl["2. Polyglot<br/>Implementation<br/>(dev-go/rust/node)"]
    impl --> review["3. Review &<br/>Pedagogy<br/>(reviewer)"]
    review --> bench["4. Benchmark &<br/>Profiling<br/>(benchmarker)"]
    bench --> opt["5. Evolution &<br/>Scale<br/>(optimizer)"]
    opt -.next project.-> spec
    verifier{{"verifier gate<br/>(runs between every phase,<br/>from zero context)"}}
    spec -.- verifier
    impl -.- verifier
    review -.- verifier
    bench -.- verifier
    opt -.- verifier
```

| Phase | `phase` value | Producer | Key artifacts |
| --- | --- | --- | --- |
| 1 — Spec & Architecture | `spec-done` | `curator` | `curriculum/NN/docs/spec.md` |
| 2 — Polyglot Implementation | `impl-done` | `dev-go`, `dev-rust`, `dev-node` (parallel) | `curriculum/NN/{go,rust,node}-impl/` |
| 3 — Review & Pedagogy | `review-done` | `reviewer` | `code_review.md`, `learning_notes.md`, `quiz.md` |
| 4 — Benchmark & Profiling | `benchmark-done` | `benchmarker` | `benchmark_results.md`, `benchmarks/results/` |
| 5 — Evolution & Scale | `cycle-complete` | `optimizer` | `evolution_report.md` |

### 4.2 The learning gate (per unit)

Tracked in `learner/learning_state.yaml`. This is the gate that preserves productive struggle.
For programming units, while `gate.implementation_blocked: true`, the AI will
not implement the unit: the learner must attempt the diagnostic first, and that
attempt must be evaluated by `sonda`. An accepted diagnostic unblocks
implementation; it does **not** satisfy the later executable mastery gate. After
implementation, an independent verifier evaluates the programming evidence.
Level 0 has no software-implementation phase and follows the separate no-code
checklist contract from
[ADR-0004](../design/adr/0004-no-code-empirical-gate.md). That branch is a
product requirement, not a current substrate capability: version 2 does not
persist a no-code evidence type yet.

```mermaid
stateDiagram-v2
    [*] --> presenting
    presenting --> practicing: learner accepts / writes first line
    practicing --> evaluating: learner submits (or timeout submits partial)
    evaluating --> mastered: independent verifier PASS on declared gate
    evaluating --> presenting: verifier FAIL, retry budget remains
    evaluating --> [*]: verifier FAIL, retry budget exhausted → escalate to Sêneca
    mastered --> [*]
```

For programming projects, the two loops meet at the **diagnostic**:
`docs/diagnostic.md` is the pre-implementation challenge. The learner writes an
attempt under `learner/attempts/`, the `sonda` agent grades it, and only then
does `implementation_blocked` flip to `false`. A programming unit never becomes
`mastered` from that diagnostic alone; it later requires verifier-backed
executable evidence. Level 0 is specified to reach evaluation through its
no-code activity and the ADR-0004 checklist, but it cannot transition to
`mastered` through the current substrate until that evidence branch is
implemented.

## 5. The programming empirical gate (thresholds)

Programming evidence is executable, concrete and numeric. These thresholds do
not apply to Level 0 no-code units. They live in canonical config seams and are
referenced symbolically here.

| Gate | Threshold | Canonical source |
| --- | --- | --- |
| Core coverage | `⟨config: gates.cobertura_nucleo_min⟩` | `engines/minimaxDojo/config/learner.yaml` |
| Mutation score | `⟨config: gates.mutation_score_min⟩` | `engines/minimaxDojo/config/learner.yaml` |
| Benchmark stability | `⟨config: galileu.cv_max_pct⟩`; samples `⟨config: galileu.samples_min⟩` | `engines/minimaxDojo/config/learner.yaml` |
| Suite green | `⟨config: gates.suíte_verde_min⟩` | `engines/minimaxDojo/config/learner.yaml` |
| Lints | `⟨config: gates.lints_erros_max⟩` | `engines/minimaxDojo/config/learner.yaml` |
| Retry budget | `⟨config: retries.max_por_unidade⟩` | `engines/minimaxDojo/config/learner.yaml` |

Drift tests protect the shared-kernel threshold contract.

The `⟨config: path⟩` convention: prompts and docs reference these numbers symbolically (for
example `⟨config: gates.mutation_score_min⟩`) instead of hardcoding them, so the seam stays in one
place.

## 6. Data flow: one source of truth, many derived views

`learner/learning_state.yaml` is canonical. Everything else that shows learner state is **generated**
from it by the Python substrate. You always edit the canonical YAML, then run a single command to
regenerate the rest.

```mermaid
flowchart LR
    canon["learner/learning_state.yaml<br/>(canonical)"]
    sub["python3 -m learner.substrate<br/>(validate + sync)"]
    canon --> sub
    sub --> mavis[".mavis/learning_state.yaml"]
    sub --> wb["minimaxDojo/whiteboard/<br/>profile.yaml, learner_profile.md, trail.md"]
    sub --> ts["codexDojo generated learner,<br/>projects, agents, cycle"]
    sub --> rs["Pixel and Voxel<br/>reviewSlice.ts fan-out"]
    catalog["curriculum/catalog.md<br/>(canonical catalog)"] --> sub
    sub --> backlog["curriculum/BACKLOG_STATUS.md"]
```

`sync()` validates the canonical state first, then regenerates every registered projection. The
generated TypeScript and Markdown files carry a `DO NOT EDIT BY HAND` header. The full
contract is in [Learner substrate](08_learner_substrate.md) and `learner/substrate/interface.md`.

## 7. Producer ≠ verifier, in practice

This separation shows up at every layer:

- In **codexDojo OS**, learner status is a generated read-only projection. Missions, catalog state,
  terminal actions, and mentor responses are local demonstrations; the OS does not write canonical
  learner state or emit verifier-approved mastery evidence.
- In **pixelDojo**, the game is the *attempt surface*. It produces validated evidence records
  (`window.__pixelQuestEvidence`, plus an `EVIDENCE <json>` console line) and stops. It never writes
  `learning_state.yaml`, never appends `units_log`, never sets `mastered`. The Playwright smoke test
  asserts these absences explicitly.
- In **miniMaxEvolutionEngine**, the `verifier` subagent has **no write tools** and starts from a
  clean context with no producer narrative (anti-anchoring). A second `verifier-haiku` runs the same
  contract at a different model tier; disagreement escalates to `seneca`.
- In **minimaxDojo**, the `PROMĘTOR` verifier runs at a different model tier from the generator and
  never receives the producer's context.

## 8. Conventions that hold everywhere

- **One learner, one curriculum, many engines.** Do not duplicate `curriculum/` or `learner/` inside
  an engine; engines use symlinks or root-relative paths.
- **The filesystem is the source of truth.** No database, no lock file for state. Derived views are
  regenerated, never hand-edited or back-ported.
- **Runnable apps vs cores.** Treat `literacyDojo`, `miniTown`, `codexDojo`,
  `codexdojo-os-prototype`, `pixelDojo`, and `voxelDojo` as runnable web
  surfaces. The OS package owns the educational desktop bounded context;
  `minimaxDojo` is the deeper tutoring core, `miniMaxEvolutionEngine` is the
  interactive motor, and `openclaw` is the simulate-grade checklist runner.
- **Simplify before commit.** Run `/simplify` on the diff, apply, then commit.

## Anti-patterns

- Do not treat the root as a single Node/Rust/Go project.
- Do not claim mastery without independently verified evidence appropriate to
  the gate; do not claim parity, benchmark superiority, or robustness without
  executable evidence.
- Do not bypass the learning gate because implementation files already exist.
- Do not merge `codexDojo` and `minimaxDojo`; they are separate layers.
- Do not scan or edit generated dependency/build output as source (`node_modules`, `dist`, `target`,
  `.mavis/`, `graphify-out/`).
