# AI DevSchool — ecosystem

`aidevschool/` is a continuous, multi-agent software-engineering **school**. It teaches one
learner to write robust, professional code by building real projects, testing them, reviewing
them, comparing languages, measuring outcomes, and updating a living learning plan — all driven
by a team of AI agents that **propose** while a deterministic state machine and executable gates
**dispose**.

Guiding principle: **one learner, one curriculum, many engines.**

> **The one rule everything follows:** completion certainty never lives in the language model.
> A concept is marked `mastered` only after the learner attempts it **and** a separate verifier
> produces executable evidence. No amount of explanation, review, or shipped code shortcuts this.

---

## 1. What's in this repo

The root is an **ecosystem umbrella**, not a single application — there is no root `package.json`.
Do not try to `npm install` or `pnpm install` at the root.

| Layer | Path | Purpose |
| --- | --- | --- |
| **Engines (apps)** | `engines/` | Each engine is a separate project. Two are runnable apps (see below); two are agent/prompt cores. |
| **Curriculum (shared)** | `curriculum/` | 18 polyglot coding challenges + `catalog.md` (the canonical list). |
| **Learner (shared)** | `learner/` | The learner journey: learning gate, profile, pitfalls, journal, pipeline status, and the Python substrate. |
| **Ecosystem docs** | `docs/` | Goal, seed ideas, design ADRs, agent domain docs. |
| **Runtime state** | `.mavis/` | Derived view of `learner/` consumed by the Mavis planner (regenerated, never hand-edited). |

The four engines:

| Engine | Type | What it is |
| --- | --- | --- |
| `engines/codexDojo/` | **Runnable app** | The user-facing dashboard — a Vite/TypeScript SPA showing learner snapshot, agent roster, the cycle, and the 18-project roadmap. |
| `engines/pixelDojo/` | **Runnable app** | 8-bit teaching games. The canonical game is `pixel-quest/` (Vite + TypeScript + Three.js). One curriculum concept → one arcade mechanic. |
| `engines/minimaxDojo/` | Agent core | The 14-agent "Ágora Continuum" tutoring core — prompts and docs (not a runnable server). |
| `engines/miniMaxEvolutionEngine/` | Agent core | The Claude Code orchestration motor: the 5-phase loop (`Spec → Implement → Review → Benchmark → Optimize`). |

---

## 2. Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| **Node.js** | 18.18+ (20 or 22 LTS recommended) | Required by Vite 7, used by both runnable apps. |
| **pnpm** | 9+ (enable via `corepack enable`) | Package manager for both apps. All commands in this repo use `pnpm`. |
| **Python 3** | 3.10+ | Only needed to regenerate learner-data views (the substrate). |
| **Go / Rust** | latest stable | Only needed if you want to build/run the polyglot `curriculum/` implementations. |

Enable pnpm once:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

---

## 3. Install & run the dashboard (codexDojo)

`codexDojo` is the primary application — the control surface for the whole school.

```bash
cd engines/codexDojo
pnpm install
pnpm run dev
```

Open **http://127.0.0.1:5173/**.

What you'll see: a sidebar of views — **Overview** (status console, agent topology, next project),
**Learner** (active unit state, Dreyfus/Bloom profile, streak, next reviews), **Agents** (the
14-agent roster with copy-prompt), **Cycle** (the 10-stage loop), and **Roadmap** (the 18 projects).

> The learner data on the dashboard is **auto-generated**, not hand-written:
> `engines/codexDojo/src/data/learner.ts` is produced by the Python substrate from
> `learner/learning_state.yaml`. Edit the YAML, regenerate (§5), never edit the `.ts` by hand.

---

## 4. Install & run the game (pixelDojo)

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

## 5. Regenerate learner data (the substrate)

Canonical learner state lives in `learner/learning_state.yaml`. Derived views — `.mavis/learning_state.yaml`,
the minimaxDojo whiteboard, and `engines/codexDojo/src/data/learner.ts` — are **regenerated** from it.
Always edit the canonical YAML first, then sync.

```bash
# from the repo root
python3 -m pip install -r learner/substrate/requirements.txt   # pyyaml + fsrs (first time only)
python3 -m learner.substrate                                   # regenerates all derived views
```

The substrate validates invariants (state machine, retry limits, FSRS rating consistency) and will
raise on violations. See `learner/substrate/interface.md` for the full read/write contract.

---

## 6. Correct usage — the learning workflow

This is a **school**, not a code generator. The workflow preserves *productive struggle*:

1. **The learner attempts the unit** first. The learning gate (`learner/learning_state.yaml`,
   field `gate.implementation_blocked`) blocks AI implementation until a real attempt exists.
2. **Agents generate or review artifacts** (curriculum implementations, reviews, benchmarks).
3. **A separate verifier** (`Prometor`) runs executable checks starting from zero context — it
   tries to *refute* the work. The producer never verifies its own output.
4. **Metrics and review findings** are recorded (coverage, mutation score, benchmark CV).
5. **Memory** updates the learner profile, journal, pitfalls, and schedules the next review.

### The rules that make it work

- **Attempt before solution.** Direct answers arrive only *after* an attempt is evaluated. Hints
  (Sócrates) are graded and budgeted (15/day); the learner must state the exact confusion point.
- **Executable evidence, not self-report.** A unit reaches `dominado` only via a passing gate
  (core coverage ≥ 80%, mutation ≥ 60%, benchmark CV < 20%). Spaced-repetition ratings are derived
  **from gate outcomes**, never from how the learner feels.
- **Producer ≠ verifier.** Context isolation is enforced — the verifier sees the spec, not the
  producer's reasoning.
- **The filesystem is the source of truth.** No database, no lock. Derived views are regenerated,
  never hand-edited or back-ported.
- **No mastery from explanation alone.** Documentation, dashboards, and static review are
  `implemented` at the artifact level — they do not count as learning evidence.

### Current learning state

- Active unit: `U0-sonda-rate-limiter-robustness` (Project 01, token-bucket robustness), state
  `apresentando`, **gate blocked** — awaiting a learner attempt.
- Project 01 has a Node/TS implementation shipped *outside* the gate; it is `impl (parcial)` and
  must be re-validated by the verifier before anything becomes `mastered`.

---

## 7. Validate

Validate the runnable apps:

```bash
# dashboard
cd engines/codexDojo      && pnpm run lint && pnpm run test && pnpm run build

# game
cd engines/pixelDojo/pixel-quest && pnpm run lint && pnpm run test && pnpm run build
```

Validate the substrate:

```bash
python3 -m unittest learner.substrate.tests.test_substrate   # from the repo root
```

---

## 8. Where to go next

| Need | File |
| --- | --- |
| Ecosystem conventions & rules | [`AGENTS.md`](AGENTS.md) |
| Multi-context index | [`CONTEXT-MAP.md`](CONTEXT-MAP.md) |
| Requirement → file coverage | [`engines/codexDojo/ecosystem/MANIFEST.md`](engines/codexDojo/ecosystem/MANIFEST.md) |
| Operating architecture | [`engines/codexDojo/ecosystem/OPERATING_MODEL.md`](engines/codexDojo/ecosystem/OPERATING_MODEL.md) |
| Agent prompts | [`engines/codexDojo/ecosystem/AGENT_PROMPTS.md`](engines/codexDojo/ecosystem/AGENT_PROMPTS.md) |
| Deep tutor core | [`engines/minimaxDojo/INDEX.md`](engines/minimaxDojo/INDEX.md) |
| Canonical curriculum | [`curriculum/catalog.md`](curriculum/catalog.md) |
| Canonical learner state | [`learner/learning_state.yaml`](learner/learning_state.yaml) |
| Learner-state contract | [`learner/substrate/interface.md`](learner/substrate/interface.md) |
| Spaced-repetition design | [`docs/design/spaced-repetition-streak/README.md`](docs/design/spaced-repetition-streak/README.md) |
| The original goal | [`docs/PROMPTS/-01_GOAL.md`](docs/PROMPTS/-01_GOAL.md) |
