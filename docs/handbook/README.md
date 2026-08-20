# AI DevSchool — Handbook

AI DevSchool teaches people to apply AI through short, practical lessons. The
same ecosystem serves nontechnical learners and programmers; the activity and
evidence differ, while the learning loop stays consistent. Start with the route
that matches your goal.

> **One rule everything follows:** completion certainty never lives in the language model.
> A concept is marked `mastered` only after the learner attempts it **and** a separate verifier
> accepts evidence appropriate to its declared gate. Code uses executable checks; Level 0 uses
> the falsifiable no-code checklist defined by ADR-0004.

## What this repo is

`aidevschool/` is a continuous, multi-agent AI learning **school**. A
nontechnical learner practices using and checking AI through short activities;
a programmer builds and verifies robust software through real projects. Agents
propose and explain, while deterministic rules and independent verification
decide what the evidence supports.

Guiding principle: **one learner, one curriculum, many engines.** The product
vision is [documented explicitly](../VISION.md). Lesson players and assessed
attempt surfaces use the
[shared micro-lesson lifecycle](../design/micro-lesson-contract.md); miniTown is
an explore-only orientation surface outside that lifecycle.

The root is an **ecosystem umbrella**, not a single application. There is no root `package.json`;
do not run `npm install` / `pnpm install` at the root.

## The canonical learner entry

`engines/codexdojo-os-prototype/` is the canonical mission-first host. Its root
route opens one onboarding, recommends either **IA Prática** or **Trilha Dev**,
and returns both audiences to the same hub, map, mentor, and progress
explanation. The first-release catalog contains three ready missions per track;
the engine that executes a mission is an implementation detail behind the host.

The host keeps onboarding, mission completion, XP, daily goals, engagement
streaks, achievements, and opaque checkpoints locally in this browser. That
IndexedDB continuity is not canonical mastery and does not synchronize between
devices. Canonical learner state remains the generated, read-only substrate
snapshot; only the independent learner gate can change `mastered`.

The legacy desktop and Engine Hub remain available at `/desktop` as secondary
contributor and engine-inspection tools. They are not the default learner entry,
and launching an engine there does not grant mission, verification, or mastery
authority.

## Choose a route

| Audience | First learner surface | Then read |
| --- | --- | --- |
| Nontechnical learner | [codexdojo OS](03b_engine_codexdojo-os-prototype.md), choosing **IA Prática**; LiteracyDojo runs the bounded lesson activity | [Onboarding](02_onboarding.md) |
| Programmer | [codexdojo OS](03b_engine_codexdojo-os-prototype.md), choosing **Trilha Dev**; voxelDojo runs the first chapter simulations | [Curriculum](07_curriculum.md) |
| Contributor | [Documentation map](../DOCUMENTATION.md) | Architecture, onboarding, then the owning engine guide |

## Read in this order

| # | Document | Read it when you want to… |
| --- | --- | --- |
| 1 | [Architecture](01_architecture.md) | Understand the engine roles, shared curriculum, learner substrate, and data flows. |
| 2 | [Onboarding](02_onboarding.md) | Set up your machine, run the apps, and learn the day-to-day workflow and conventions. |
| 3 | [Engine — codexDojo](03_engine_codexDojo.md) | Work on the user-facing dashboard (Vite + TypeScript SPA). |
| 3b | [Engine — codexdojo-os-prototype](03b_engine_codexdojo-os-prototype.md) | Work on the canonical educational OS experience and its read-only learner projection. |
| 4 | [Engine — pixelDojo](04_engine_pixelDojo.md) | Work on the 8-bit teaching game and its evidence contract. |
| 4b | [Engine — voxelDojo](10_engine_voxelDojo.md) | Work on the 3D teaching simulations (Three.js) and the HASH RING pilot. |
| 4c | [Engine — miniTown](11_engine_miniTown.md) | Explore the cozy town-sim: the level-0 entry surface for the non-technical audience. |
| 4d | [Engine — LiteracyDojo](12_engine_literacyDojo.md) | Work on the local-first microlearning experience for people who do not code. |
| 4e | [Engine — dojoToday](13_engine_dojoToday.md) | Work on the read-only "lesson for today" surface for programmers and its generated substrate read model. |
| 5 | [Engine — minimaxDojo](05_engine_minimaxDojo.md) | Understand the 14-agent tutoring core, its state machine and gates. |
| 6 | [Engine — miniMaxEvolutionEngine](06_engine_miniMaxEvolutionEngine.md) | Run the Claude Code orchestration motor (the 5-phase loop). |
| 6b | [Engine — aiDevschoolMvp](../../engines/aiDevschoolMvp/aidevschool/SKILL.md) | Work on the SKILL.md-based AI-fluency tutor MVP and its installer (agent core; installer tests run under root `make test`). |
| 7 | [Curriculum](07_curriculum.md) | Understand Level 0, the programming track, the AI Literacy track, and their evidence boundaries. |
| 8 | [Learner substrate](08_learner_substrate.md) | Understand the learner state schema, the gates, FSRS spaced repetition, and the read/write contract. |
| 9 | [Glossary](09_glossary.md) | Look up a term (especially the Portuguese agent names and state values). |

> **Non-integrated prototype:** `engines/zai-duolingo-like/` ("Vertical Protocol" — a
> cyberpunk-Tokyo "Duolingo for AI" in Next.js) is a future engine to integrate and a candidate
> for the gamified nontechnical track. It is outside `make test` and not yet part of the
> canonical ecosystem; keep it, but do not treat it as a current surface.

## The five golden rules

1. **Learning gate.** The learner attempts and is evaluated with the evidence class declared by the unit before anything becomes `mastered`.
2. **Producer ≠ verifier.** Nothing self-verifies; the verifier works from an isolated context.
3. **No claims without evidence** (mastery, parity, benchmark, robustness).
4. **The filesystem is the canonical source of truth.** Mastery and evidence authority remain auditable Markdown / YAML / NDJSON; browser IndexedDB stores only local continuity.
5. **Simplify before commit.** Run `/simplify` on the diff, apply the recommendations, then commit.

## Map of the repository

```text
aidevschool/                       # ECOSYSTEM umbrella (git repo, no root package manager)
├── engines/                       # apps, agent cores, and runners — each is a separate project
│   ├── codexDojo/                 # runnable app: user-facing dashboard (Vite/TS SPA)
│   ├── codexdojo-os-prototype/    # runnable app: canonical educational OS (React/Vite)
│   ├── dojoToday/                 # runnable app: read-only "lesson for today" for programmers
│   ├── literacyDojo/              # runnable app: short AI lessons for nontechnical learners
│   ├── miniTown/                  # runnable app: cozy, explore-only Level 0 entry
│   ├── pixelDojo/                 # runnable app: 8-bit teaching games (pixel-quest/)
│   ├── voxelDojo/                 # runnable apps: 3D teaching simulations (game-*)
│   ├── minimaxDojo/               # agent core: 14-agent "Ágora Continuum" tutoring spec
│   ├── miniMaxEvolutionEngine/    # agent core: Claude Code motor (5-phase loop)
│   ├── aiDevschoolMvp/            # agent core: SKILL.md AI-fluency tutor MVP + installer
│   ├── openclaw/                  # file-based checklist runner (simulate mode)
│   └── zai-duolingo-like/         # non-integrated Next.js prototype (future engine)
├── curriculum/                    # SHARED: numbered catalog + ai-literacy lessons
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
| The product vision (central idea) | [`docs/VISION.md`](../VISION.md) |
| Shared micro-lesson contract | [`docs/design/micro-lesson-contract.md`](../design/micro-lesson-contract.md) |
| The original goal | [`docs/PROMPTS/-01_GOAL.md`](../PROMPTS/-01_GOAL.md) |

---

_Last reviewed on 2026-07-25. When an explanation conflicts with a canonical
catalog, contract, learner-state file, or current verification result, the
canonical source wins; open a documentation fix._
