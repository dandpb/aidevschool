# Onboarding

Get a working setup, run the apps, and learn the day-to-day workflow. A lesson
targets 3–5 minutes; local installation is still a separate contributor step.

## 1. Choose your route

### I want to use AI without programming

LiteracyDojo is the guided lesson player. It currently runs locally, so a
facilitator or contributor must prepare it. Follow the
[LiteracyDojo quick start](../../engines/literacyDojo/README.md); that engine
guide owns the exact install, generation, and development commands.

The [AI Literacy curriculum](../../curriculum/ai-literacy/README.md) owns
content status. The [LiteracyDojo README](../../engines/literacyDojo/README.md)
owns implementation status and the complete release criteria; check both before
publishing. See also [Engine — LiteracyDojo](12_engine_literacyDojo.md).

For an explore-only introduction, follow the
[miniTown quick start](../../engines/miniTown/README.md). Its engine guide owns
the exact setup command and prerequisites. miniTown does not contain the AI
Literacy lesson track and never marks learning as mastered.

### I want to learn software engineering with AI

Continue with the prerequisites below, then run codexDojo, the educational OS,
or a teaching game. The canonical catalog owns the programming-project list and
current status.

## 2. Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 20.19+ or 22.12+ | Required by Vite 8 in codexDojo OS; Node 22 LTS is recommended. |
| pnpm | 9+ (`corepack enable`) | Package manager for `miniTown`, `codexDojo`, `pixelDojo`, and `voxelDojo`. |
| Python 3 | 3.10+ | Regenerating learner-data views (the substrate). |
| Go / Rust | latest stable | Only if you build/run the polyglot `curriculum/` implementations. |

Enable pnpm once:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

The codexDojo OS engine uses npm and its own `package-lock.json`. Keep package-manager commands
inside the target engine.

> The repository root has **no** `package.json`. Never run `npm install` or `pnpm install` at the
> root — install inside an individual engine instead.

## 3. Run the dashboard (codexDojo)

The primary application — the control surface for the whole school.

```bash
cd engines/codexDojo
pnpm install
pnpm run dev
# open http://127.0.0.1:5173/
```

You'll see a sidebar of views: **Painel** (Overview), **Learner**, **Agentes** (Agents),
**Ciclo** (Cycle), and **Roadmap**. The learner data shown is auto-generated from the substrate —
see §7.

## 4. Run codexDojo OS

This standalone Vite/React app owns the educational Linux desktop and contextual learning UI.

```bash
cd engines/codexdojo-os-prototype
npm install
npm run dev
```

The app reads its learner status from generated `src/data/learner.ts`. Run
`python3 -m learner.substrate` after canonical learner changes. Missions, catalog, terminal, and
mentor interactions remain local React UI state and do not count as executable mastery evidence.
See the [OS engine doc](03b_engine_codexdojo-os-prototype.md) for the boundary.

## 5. Run the game (pixelDojo)

`pixel-quest` is the canonical teaching game (a top-down RPG where each lab is a curriculum concept).

```bash
cd engines/pixelDojo/pixel-quest
pnpm install
pnpm run dev
# open http://127.0.0.1:5173/  (Vite uses :5174 if the dashboard already holds :5173)
```

Clearing a level **emits evidence** (a validated record on `window.__pixelQuestEvidence` plus an
`EVIDENCE <json>` console line). The game is the attempt surface — it never marks mastery itself.
Run the evidence contract:

```bash
pnpm run smoke   # Playwright: plays through labs, asserts evidence shape, asserts no mastery side-effects
```

## 6. Run the Claude Code motor (miniMaxEvolutionEngine)

This engine is driven from Claude Code, not a dev server.

```text
1. Open Claude Code rooted at engines/miniMaxEvolutionEngine/
2. /devschool-status        # see pipeline + gate state
3. /devschool-diagnose      # if the gate is blocked, run the diagnostic (sonda)
4. /devschool-cycle         # run the full 5-phase loop once unblocked
```

See [the engine doc](06_engine_miniMaxEvolutionEngine.md) for the full command list.

## 7. Regenerate learner data (the substrate)

Canonical learner state lives in `learner/learning_state.yaml`. The dashboard's `learner.ts`, the
game's `reviewSlice.ts`, the `.mavis/` view, and the minimaxDojo whiteboard are all **regenerated**
from it. Always edit the canonical YAML first, then sync.

```bash
# from the repo root
python3 -m pip install -e ".[dev]"                             # pyyaml + fsrs + pytest
python3 -m learner.substrate                                   # regenerate all derived views
```

The substrate validates invariants (state machine, retry limits, FSRS rating consistency) and raises
on violation. After regenerating, rebuild the affected app (`pnpm run build`). Full contract:
`learner/substrate/interface.md` and [Learner substrate](08_learner_substrate.md).

## 8. The learning workflow

This is a school, and the workflow preserves productive struggle:

1. **The learner attempts the unit first.** The learning gate
   (`learner/learning_state.yaml`, field `gate.implementation_blocked`) blocks AI implementation
   until a real attempt exists.
2. **Agents generate or review artifacts** (specs, polyglot implementations, reviews, benchmarks).
3. **A separate verifier** (`Prometor` / `verifier`) checks the declared evidence from zero
   context — executable checks for programming units or the falsifiable ADR-0004 checklist for a
   Level 0 no-code unit. The producer never verifies its own output.
4. **Evidence and review findings** are recorded: code metrics where applicable, or checklist
   results for the no-code gate.
5. **Memory** updates the learner profile, journal, and pitfalls, and schedules the next review.

The rules that make it work:

- **Attempt before solution.** Direct answers arrive only after an attempt is evaluated. Hints
  (`Sócrates`) are graded and budgeted by `⟨config: socrates.quota_dia⟩`; the learner must state
  the exact confusion point.
- **Gate evidence, not self-report.** Spaced-repetition ratings derive from independently verified
  gate outcomes, never from how the learner feels.
- **Producer ≠ verifier.** The verifier sees the spec, not the producer's reasoning.
- **The filesystem is the source of truth.** Derived views are regenerated, never hand-edited.

## 9. Validate your changes

Runnable apps:

```bash
# nontechnical micro-lessons
cd engines/literacyDojo && \
  npm run gen:content && npm run lint && npm run test && npm run build && \
  npm run test:e2e
# explore-only Level 0 town
cd engines/miniTown && \
  pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && \
  pnpm run smoke
# dashboard
cd engines/codexDojo               && pnpm run lint && pnpm run test && pnpm run build
# codexDojo OS
cd engines/codexdojo-os-prototype  && npm run lint && npm run test && npm run build
# game
cd engines/pixelDojo/pixel-quest   && pnpm run lint && pnpm run test && pnpm run build && pnpm run smoke
```

The substrate:

```bash
python3 -m unittest discover -s learner/substrate/tests   # from the repo root
```

The minimaxDojo Python core (state machine, gates, memory) — run from the repo root, because the
tests import via absolute paths (`engines.minimaxDojo.core...`):

```bash
python3 -m unittest discover -s engines/minimaxDojo/tests -t .
```

A representative curriculum implementation (Project 01):

```bash
cd curriculum/01_rate_limiter/node-impl && npm run lint && npm run test && npm run build
cd curriculum/01_rate_limiter/go-impl   && go test -race -cover ./...
cd curriculum/01_rate_limiter/rust-impl && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
```

## 10. Where to find what

| Task | Location |
| --- | --- |
| Change learner state | `learner/learning_state.yaml` → then `python3 -m learner.substrate` |
| Change the learner-state adapters | `learner/substrate/` |
| Change project specs / evidence | `curriculum/<NN_project>/` |
| Add or edit a curriculum project | start from `curriculum/catalog.md` (canonical list) |
| Edit nontechnical AI lessons | `curriculum/ai-literacy/` → validate and regenerate the read model |
| Work on the nontechnical lesson player | `engines/literacyDojo/` |
| Work on the explore-only Level 0 town | `engines/miniTown/` |
| Work on the dashboard | `engines/codexDojo/` |
| Work on the educational OS | `engines/codexdojo-os-prototype/` |
| Work on the game | `engines/pixelDojo/pixel-quest/` |
| Work on the tutor core | `engines/minimaxDojo/` (start at `INDEX.md`) |
| Run Claude Code orchestration | `engines/miniMaxEvolutionEngine/` |
| Update product-facing contracts | `engines/codexDojo/ecosystem/MANIFEST.md` |
| Look up a term | [Glossary](09_glossary.md) |

## 11. Tooling roots (the dot-directories)

Most `.X/` directories at the root are platform/session state, not source:

- `.mavis/` — canonical derived runtime view; regenerated by `learner/substrate/`. Never hand-edit.
- `.codex/`, `.omo/`, `.opencode/`, `.playwright-mcp/`, `.serena/`, `.commandcode/`, `.compozy/` —
  per-tool session state.
- `.codegraph` / `graphify-out/` — generated code-graph references, not source.

Durable shared state belongs in `learner/`, `curriculum/`, or `.mavis/`. Document any new `.X/`
root in `CONTEXT.md` first.
