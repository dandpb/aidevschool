# AI DevSchool — Handbook

The complete documentation set for the `aidevschool` ecosystem. Start here.

> **One rule everything follows:** completion certainty never lives in the language model.
> A concept is marked `mastered` only after the learner attempts it **and** a separate verifier
> produces executable evidence. No amount of explanation, review, or shipped code shortcuts this.

## What this repo is

`aidevschool/` is a continuous, multi-agent software-engineering **school**. It teaches one
learner to write robust, professional code by building real projects, testing them, reviewing
them, comparing languages, measuring outcomes, and updating a living learning plan — all driven
by a team of AI agents that **propose** while a deterministic state machine and executable gates
**dispose**.

Guiding principle: **one learner, one curriculum, many engines.**

The root is an **ecosystem umbrella**, not a single application. There is no root `package.json`;
do not run `npm install` / `pnpm install` at the root.

## Read in this order

| # | Document | Read it when you want to… |
| --- | --- | --- |
| 1 | [Architecture](01_architecture.md) | Understand how the four engines, the curriculum, and the learner substrate fit together, and how data flows between them. |
| 2 | [Onboarding](02_onboarding.md) | Set up your machine, run the apps, and learn the day-to-day workflow and conventions. |
| 3 | [Engine — codexDojo](03_engine_codexDojo.md) | Work on the user-facing dashboard (Vite + TypeScript SPA). |
| 4 | [Engine — pixelDojo](04_engine_pixelDojo.md) | Work on the 8-bit teaching game and its evidence contract. |
| 4b | [Engine — voxelDojo](10_engine_voxelDojo.md) | Work on the 3D teaching simulations (Three.js) and the HASH RING pilot. |
| 5 | [Engine — minimaxDojo](05_engine_minimaxDojo.md) | Understand the 14-agent tutoring core, its state machine and gates. |
| 6 | [Engine — miniMaxEvolutionEngine](06_engine_miniMaxEvolutionEngine.md) | Run the Claude Code orchestration motor (the 5-phase loop). |
| 7 | [Curriculum](07_curriculum.md) | Understand the 18 polyglot projects and how executable evidence works. |
| 8 | [Learner substrate](08_learner_substrate.md) | Understand the learner state schema, the gates, FSRS spaced repetition, and the read/write contract. |
| 9 | [Glossary](09_glossary.md) | Look up a term (especially the Portuguese agent names and state values). |

## The five golden rules

1. **Learning gate.** The learner attempts and is evaluated (executable evidence) before the AI marks anything `mastered`.
2. **Producer ≠ verifier.** Nothing self-verifies; the verifier works from an isolated context.
3. **No claims without evidence** (mastery, parity, benchmark, robustness).
4. **The filesystem is the source of truth.** State is auditable Markdown / YAML / NDJSON. There is no database.
5. **Simplify before commit.** Run `/simplify` on the diff, apply the recommendations, then commit.

## Map of the repository

```text
aidevschool/                       # ECOSYSTEM umbrella (git repo, no root package manager)
├── engines/                       # applications & agent cores — each is a separate project
│   ├── codexDojo/                 # runnable app: user-facing dashboard (Vite/TS SPA)
│   ├── pixelDojo/                 # runnable app: 8-bit teaching games (pixel-quest/)
│   ├── minimaxDojo/               # agent core: 14-agent "Ágora Continuum" tutoring spec
│   └── miniMaxEvolutionEngine/    # agent core: Claude Code motor (5-phase loop)
├── curriculum/                    # SHARED: 18 polyglot challenges + catalog.md
├── learner/                       # SHARED: learner state, profile, pitfalls, journal, substrate
├── docs/                          # ecosystem docs (this handbook, design archive, prompts, ideas)
├── .mavis/                        # derived runtime view of learner/ (regenerated, never hand-edited)
└── .codex/ .omo/ .opencode/ …     # platform / tooling session state
```

Compatibility symlinks at the root keep legacy tooling working: `projects → curriculum`,
`.agora → learner`, `project_proposal.md → curriculum/catalog.md`,
`learning_journal.md → learner/journal.md`.

## Canonical references (outside this handbook)

| Need | File |
| --- | --- |
| Ecosystem conventions & rules | [`AGENTS.md`](../../AGENTS.md) |
| Root quick-start README | [`README.md`](../../README.md) |
| Domain language | [`CONTEXT.md`](../../CONTEXT.md) |
| Generated knowledge base | [`docs/AGENTS.md`](../AGENTS.md) |
| Canonical curriculum list | [`curriculum/catalog.md`](../../curriculum/catalog.md) |
| Canonical learner state | [`learner/learning_state.yaml`](../../learner/learning_state.yaml) |
| Learner-state contract | [`learner/substrate/interface.md`](../../learner/substrate/interface.md) |
| Requirement → file coverage | [`engines/codexDojo/ecosystem/MANIFEST.md`](../../engines/codexDojo/ecosystem/MANIFEST.md) |
| The original goal | [`docs/PROMPTS/-01_GOAL.md`](../PROMPTS/-01_GOAL.md) |

---

_This handbook was generated on 2026-06-28 from a full read of the codebase. When code and docs
disagree, the code wins — please open a fix. Known stale-doc spots are flagged inline as
**Doc note:**._
