# AI DevSchool — AI learning for everyone

AI DevSchool democratizes AI knowledge and application through short,
practical lessons with a Duolingo-like rhythm. It serves people who want to use
AI without programming and developers who want to build robust software with
AI.

The two audiences use different activities, but share one learning loop:
objective → attempt → feedback → hint/retry → evidence → review. Agents can
propose, explain, and evaluate; deterministic rules and independent verification
decide what the evidence supports.

Guiding principle: **one learner, one curriculum, many engines.**

> **The one rule everything follows:** completion certainty never lives in the language model.
> A concept is marked `mastered` only after the learner attempts it **and** a separate verifier
> accepts evidence appropriate to the declared gate. Programming gates use executable checks;
> the Level 0 no-code gate uses a falsifiable checklist. No explanation, review, or shipped artifact
> shortcuts independent verification.

## Choose your path

| I want to… | Start here | What is true today |
| --- | --- | --- |
| Use AI at work without learning to code | [LiteracyDojo](engines/literacyDojo/README.md) and the [AI Literacy curriculum](curriculum/ai-literacy/README.md) | Guided local route. The linked curriculum owns content status; the engine README owns implementation and release status. |
| Explore the ecosystem without a coding task | [miniTown](engines/miniTown/README.md) | A local, explore-only town simulation. It does not teach the 14 lessons or mark mastery. |
| Learn software engineering with AI | [Programming curriculum](curriculum/catalog.md) and [codexDojo](engines/codexDojo/README.md) | 18 coding projects (01–18), with status and evidence recorded per project. |
| Contribute to the platform | [Documentation map](docs/DOCUMENTATION.md) and [handbook](docs/handbook/README.md) | Engine-local commands and contracts are authoritative. |

There is no public, browser-only learner route yet. All runnable experiences
currently require local setup.

---

## 1. What's in this repo

The root is an **ecosystem umbrella**, not a single application — there is no root `package.json`.
Do not try to `npm install` or `pnpm install` at the root.

| Layer | Path | Purpose |
| --- | --- | --- |
| **Engines and apps** | `engines/` | Each engine is a separate project with its own runtime and package-management surface. |
| **Curriculum (shared)** | `curriculum/` | 19 numbered entries (00–18), including 18 coding projects, plus the separate `ai-literacy` track. |
| **Learner (shared)** | `learner/` | The learner journey: learning gate, profile, pitfalls, journal, pipeline status, and the Python substrate. |
| **Ecosystem docs** | `docs/` | Goal, seed ideas, design ADRs, agent domain docs. |
| **Runtime state** | `.mavis/` | Derived view of `learner/` consumed by the Mavis planner (regenerated, never hand-edited). |

The engine surfaces:

| Engine | Type | What it is |
| --- | --- | --- |
| `engines/literacyDojo/` | **Runnable app** | Local-first AI microlearning for nontechnical people; consumes the generated AI Literacy read model and records at most `completed`. |
| `engines/miniTown/` | **Runnable app** | Cozy, explore-only Level 0 entry surface; no code prerequisite and no mastery writes. |
| `engines/codexDojo/` | **Runnable app** | The user-facing dashboard — a Vite/TypeScript SPA showing learner snapshot, agent roster, the cycle, and the 19-entry roadmap. |
| `engines/codexdojo-os-prototype/` | **Runnable app** | Canonical educational OS experience (React/Vite): desktop labs plus a generated, read-only learner projection. |
| `engines/pixelDojo/` | **Runnable app** | 8-bit teaching games. The canonical game is `pixel-quest/` (Vite + TypeScript + Three.js). One curriculum concept → one arcade mechanic. |
| `engines/voxelDojo/` | **Runnable app** | Three.js teaching simulations; each `game-*` package covers one curriculum concept. |
| `engines/minimaxDojo/` | Agent core | The 14-agent "Ágora Continuum" tutoring core — prompts and docs (not a runnable server). |
| `engines/miniMaxEvolutionEngine/` | Agent core | The Claude Code orchestration motor: the 5-phase loop (`Spec → Implement → Review → Benchmark → Optimize`). |
| `engines/openclaw/` | Checklist runner | File-based, simulate-grade runner for the 5-phase artifact checklist. |

---

## 2. Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| **Node.js** | 20.19+ or 22.12+ | Required by Vite 8 in codexDojo OS; Node 22 LTS is recommended. |
| **pnpm** | 9+ (enable via `corepack enable`) | Package manager for `miniTown`, `codexDojo`, `pixelDojo`, and `voxelDojo`. |
| **Python 3** | 3.10+ | Validates AI Literacy content and regenerates learner-data views. |
| **Go / Rust** | latest stable | Only needed if you want to build/run the polyglot `curriculum/` implementations. |

Enable pnpm once:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

`codexdojo-os-prototype` uses npm and its package lock. Do not replace that
engine-local workflow with a root package manager.

---

## 3. Install & run the micro-lessons (LiteracyDojo)

LiteracyDojo is the guided route for people who want to apply AI without a
programming prerequisite. A contributor or facilitator currently needs to
prepare it locally:

```bash
cd engines/literacyDojo
npm install
npm run gen:content
npm run dev
```

Open **http://127.0.0.1:5173/**. Content status does not certify the consuming
app. Before publishing, use the current release criteria and verification
result in the [engine README](engines/literacyDojo/README.md).

---

## 4. Install & run the dashboard (codexDojo)

`codexDojo` is the primary application — the control surface for the whole school.

```bash
cd engines/codexDojo
pnpm install
pnpm run dev
```

Open **http://127.0.0.1:5173/**.

What you'll see: a sidebar of views — **Overview** (status console, agent topology, next project),
**Learner** (active unit state, Dreyfus/Bloom profile, streak, next reviews), **Agents** (the
14-agent roster with copy-prompt), **Cycle** (the 10-stage loop), and
**Roadmap** (the 19 catalog entries).

> The learner data on the dashboard is **auto-generated**, not hand-written:
> `engines/codexDojo/src/data/learner.ts` is produced by the Python substrate from
> `learner/learning_state.yaml`. Edit the YAML, regenerate (§6), never edit the `.ts` by hand.

---

## 4b. Install & run codexDojo OS

The OS engine provides an educational Linux desktop with a window manager,
terminal, file browser, architecture map, app catalog, Learn Mode, and local
mentor interaction.

```bash
cd engines/codexdojo-os-prototype
npm install
npm run dev
```

When both apps run locally, start the dashboard first on `5173`; Vite places the OS on `5174`,
which is the dashboard bridge's development fallback. Deployed dashboard builds must set
`VITE_CODEXDOJO_OS_URL` to the OS URL.

The top bar and Dojo status consume `src/data/learner.ts`, regenerated from
`learner/learning_state.yaml` by `python3 -m learner.substrate`. Local missions,
catalog, terminal, and mentor interactions do not update canonical state or count as executable
mastery evidence. See the [OS handbook page](docs/handbook/03b_engine_codexdojo-os-prototype.md).

---

## 5. Install & run the game (pixelDojo)

`pixel-quest` is the canonical teaching game (a top-down RPG where each lab is a curriculum concept).

```bash
cd engines/pixelDojo/pixel-quest
pnpm install
pnpm run dev
```

Open **http://127.0.0.1:5173/** (Vite auto-uses **:5174** if the dashboard is already running on 5173).

A cleared level **emits evidence** (NDJSON telemetry via the Playwright contract). The game is the
*attempt surface* — it never marks mastery itself (producer ≠ verifier). Run the evidence contract:

```bash
pnpm run smoke   # Playwright: plays through labs, asserts evidence shape
```

---

## 6. Regenerate learner data (the substrate)

Canonical learner state lives in `learner/learning_state.yaml`. The substrate
regenerates `.mavis/`, the minimaxDojo whiteboard, teaching-game review slices,
and dashboard read models. It also derives `curriculum/BACKLOG_STATUS.md` and
`codexDojo/src/data/projects.ts` from the canonical curriculum catalog.

```bash
# from the repo root
python3 -m pip install -e ".[dev]"                             # pyyaml + fsrs + pytest
python3 -m learner.substrate                                   # regenerates all derived views
```

The substrate validates invariants and reports generated-view drift with
`python3 -m learner.substrate --check`. See `learner/substrate/interface.md` for
the full read/write contract.

---

## 7. Correct usage — the learning workflow

This is a **school**, not a code generator. The workflow preserves *productive struggle*:

1. **The learner attempts the unit** first. The learning gate (`learner/learning_state.yaml`,
   field `gate.implementation_blocked`) blocks AI implementation until a real attempt exists.
2. **Agents generate or review artifacts** (curriculum implementations, reviews, benchmarks).
3. **A separate verifier** (`Prometor`) applies the unit's declared gate from
   zero context and tries to *refute* the work. Programming units use executable
   checks; Level 0 uses the falsifiable no-code checklist in
   [ADR-0004](docs/design/adr/0004-no-code-empirical-gate.md). Run
   `python3 -m learner.gate --dry-run` to inspect a decision, then omit
   `--dry-run` only when the evidence is eligible. The producer never verifies
   its own output.
4. **Metrics and review findings** are recorded (coverage, mutation score, benchmark CV).
5. **Memory** updates the learner profile, journal, pitfalls, and schedules the next review.

### The rules that make it work

- **Attempt before solution.** Direct answers arrive only *after* an attempt is evaluated. Hints
  (Sócrates) are graded and budgeted (15/day); the learner must state the exact confusion point.
- **Evidence appropriate to the gate, not self-report.** A programming unit
  reaches `dominado` only through executable checks such as coverage, mutation
  and stable benchmarks. A Level 0 unit uses an independently checked,
  falsifiable no-code checklist; the two evidence classes remain labeled.
  Spaced-repetition ratings are derived
  **from gate outcomes**, never from how the learner feels.
- **Producer ≠ verifier.** Context isolation is enforced — the verifier sees the spec, not the
  producer's reasoning.
- **The filesystem is the source of truth.** No database, no lock. Derived views are regenerated,
  never hand-edited or back-ported.
- **No mastery from explanation alone.** Documentation, dashboards, and static review are
  `implemented` at the artifact level — they do not count as learning evidence.

### Current learning state

Do not copy the active unit or next action into entry documentation. Read the
canonical [`learner/learning_state.yaml`](learner/learning_state.yaml), especially
`active_unit`, `next_action`, and `units_log`; then regenerate derived views with
`python3 -m learner.substrate`.

---

## 8. Validate

Validate the runnable apps:

```bash
# LiteracyDojo
cd engines/literacyDojo && \
  npm run gen:content && npm run lint && npm run test && npm run build && \
  npm run test:e2e

# miniTown
cd engines/miniTown && \
  pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && \
  pnpm run smoke

# Dashboard
cd engines/codexDojo && pnpm install && pnpm run dev
cd engines/codexDojo && pnpm run lint && pnpm run test && pnpm run build

# codexDojo OS
cd engines/codexdojo-os-prototype && npm install && npm run dev
cd engines/codexdojo-os-prototype && npm run lint && npm run test && npm run build

# game
cd engines/pixelDojo/pixel-quest && pnpm run lint && pnpm run test && pnpm run build
```

Validate the substrate:

```bash
python3 -m unittest learner.substrate.tests.test_substrate   # from the repo root
```

---

## 9. Where to go next

| Need | File |
| --- | --- |
| **Product vision and audiences** | [`docs/VISION.md`](docs/VISION.md) |
| **Shared micro-lesson lifecycle** | [`docs/design/micro-lesson-contract.md`](docs/design/micro-lesson-contract.md) |
| **Nontechnical microlearning app** | [`engines/literacyDojo/README.md`](engines/literacyDojo/README.md) |
| **Documentation map and classification** | [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md) |
| **Full documentation handbook** | [`docs/handbook/`](docs/handbook/README.md) |
| Ecosystem conventions & rules | [`AGENTS.md`](AGENTS.md) |
| Domain language | [`CONTEXT.md`](CONTEXT.md) |
| Requirement → file coverage | [`engines/codexDojo/ecosystem/MANIFEST.md`](engines/codexDojo/ecosystem/MANIFEST.md) |
| Operating architecture | [`engines/codexDojo/ecosystem/OPERATING_MODEL.md`](engines/codexDojo/ecosystem/OPERATING_MODEL.md) |
| Agent prompts | [`engines/codexDojo/ecosystem/AGENT_PROMPTS.md`](engines/codexDojo/ecosystem/AGENT_PROMPTS.md) |
| Deep tutor core | [`engines/minimaxDojo/INDEX.md`](engines/minimaxDojo/INDEX.md) |
| Canonical curriculum | [`curriculum/catalog.md`](curriculum/catalog.md) |
| Canonical learner state | [`learner/learning_state.yaml`](learner/learning_state.yaml) |
| Learner-state contract | [`learner/substrate/interface.md`](learner/substrate/interface.md) |
| Spaced-repetition design | [`docs/design/spaced-repetition-streak/README.md`](docs/design/spaced-repetition-streak/README.md) |
| The original goal | [`docs/PROMPTS/-01_GOAL.md`](docs/PROMPTS/-01_GOAL.md) |
