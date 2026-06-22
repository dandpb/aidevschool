# PIXELDOJO

> 8-bit arcade games that **teach the curriculum subjects**. Each game encodes ONE concept as a
> playable mechanic, and the playthrough becomes the **executable evidence** the learning gate needs.
> This is the agent-facing playbook (canonical). `CLAUDE.md` is a thin pointer to this file.
> Engine name is cosmetic — rename the folder freely.

## OVERVIEW

`pixelDojo/` is a separate engine in the `aidevschool` ecosystem. It is an **adaptation of the
"Create browser-based games" playbook** (originally written for Codex + `$playwright-interactive` /
`$imagegen` / `$openai-docs`) to the tools actually available here and to this repo's golden rules.

The product is not "a game." It is a **repeatable workflow** that turns any subject in
`../../curriculum/` into a small 8-bit arcade game whose win condition demonstrates understanding of
the underlying concept — and emits evidence to `../../learner/`.

Per the ecosystem rule **one learner, one curriculum, many engines**: `curriculum/` and `learner/`
live only at the root. Read them root-relative (`../../curriculum/...`, `../../learner/...`). **Never
copy them into this engine.**

## MISSION

- **Concept → mechanic.** Every game targets exactly one concept from one curriculum project and
  maps it to a single arcade mechanic the player must operate correctly to win.
- **The playthrough is the evidence.** A cleared level is observable proof the player applied the
  concept (sized a bucket, throttled to a rate, resolved a conflict). The game records that telemetry.
- **Producer ≠ verifier.** The game (and whoever built it) emits **raw evidence only**. A separate
  verifier reads it and decides mastery. The game never writes `mastered`.

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Define a game before building | `PLAN.md` | Template + one fully worked example (Rate Limiter). Fill it first. |
| Reusable 8-bit asset prompts | `.prompts/8bit-style.md` | MiniMax prompts: palette, sprites, tiles, chiptune. Save every new prompt here. |
| Work log / decisions | `.logs/` | Append-only NDJSON-ish notes per session; reference when iterating. |
| Adaptation summary + tool map | `README.md` | Codex→Cowork mapping and the 12-subject game concept seeds. |
| The subjects to teach | `../../curriculum/catalog.md` | 12-project progression (only `01_rate_limiter` exists on disk). |
| The learning gate (state of truth) | `../../learner/learning_state.yaml` | `active_unit`, `empirical_gate`, `units_log: []`. |
| Journal to append generalizations | `../../learner/journal.md` | Append-only; format defined in its header. |

## TECH STACK (adapted from the playbook's Next.js + Phaser + Fastify + Postgres + Redis + OpenAI)

- **Vite + TypeScript** — matches `../codexDojo` (strict TS, fast HMR). Not Next.js: a canvas game
  needs no SSR/routing.
- **Phaser 3** for rendering, input, scenes, and audio. Enforce crisp pixels:
  `pixelArt: true`, integer `zoom`, nearest-neighbor scaling. A plain Canvas2D loop is the
  "go lighter" option for the simplest games.
- **No backend by default.** Single-player teaching games run fully client-side. Add **Fastify +
  SQLite/Postgres** only when a game genuinely needs leaderboards or cross-device progress
  (e.g. the distributed-systems subjects).
- **Evidence is not `localStorage`.** The game produces an evidence payload; the agent harness
  writes it to the filesystem substrate (`../../learner/...`). Filesystem is the source of truth.
- **AI assets via MiniMax**; **docs via WebSearch / web_fetch**.

## TOOLS — Codex skill → what this environment actually has

MCP tools are prefixed `mcp__MCP_DOCKER__` (browser) and `mcp__MiniMax__` (assets).

| Playbook token | Use here instead |
| --- | --- |
| `$playwright-interactive` | **Playwright MCP**: `browser_navigate`, `browser_take_screenshot`, `browser_snapshot`, `browser_click`, `browser_press_key`, `browser_evaluate`, `browser_console_messages`, `browser_wait_for`. Open the dev server, play the game, screenshot, read console errors, iterate. (Claude-in-Chrome tools are an alternative.) |
| `$imagegen` | **MiniMax**: `text_to_image` (sprites, tiles, backgrounds), `music_generation` (chiptune BGM), `text_to_audio` (SFX / narration), `generate_video` (trailer / cutscene). The `canvas-design` skill is good for title cards and promo art. |
| `$openai-docs` | **WebSearch** + **web_fetch** for Phaser / MDN Canvas docs. Optional: add a docs MCP (e.g. Context7) via `mcp__MCP_DOCKER__mcp-add` if you want pinned framework docs. |
| `/plan` slash command | Plan mode, or just fill the `PLAN.md` template shipped here. |
| `AGENTS.md` | This file (canonical) + a thin `CLAUDE.md` pointer — matches the repo pattern. |
| `.logs/` `.prompts/` | Kept exactly as the playbook prescribes. |

## WORKFLOW

1. **Plan first.** Copy `PLAN.md`'s template, fill the *concept → mechanic* and *learning-gate*
   sections before scaffolding anything. A vague "make a game" produces a vague game.
2. **Scaffold** Vite + Phaser with `pixelArt: true`.
3. **Build the core loop**, then verify with **Playwright MCP** after every feature — navigate to the
   dev server, send key inputs, screenshot, read the console. Iterate if it doesn't feel right.
4. **Generate assets with MiniMax.** Every time you make a batch, **save the exact prompts** to
   `.prompts/` so later batches stay visually consistent.
5. **Wire the learning gate** (see below). Emit evidence to `../../learner/`. Never self-mark mastery.
6. **Log** decisions and dead-ends under `.logs/`.

## LEARNING-GATE WIRING (the ecosystem-specific part the playbook lacks)

The gate is `../../learner/learning_state.yaml` (system: `agora-continuum`). Contract: the **learner
attempts and is evaluated on executable evidence before a unit is mastered**; `units_log` is
currently `[]` — closing the first loop (appending one real unit) is the project MVP.

- The game is the **attempt / diagnostic surface** for `active_unit` (e.g.
  `U0-sonda-rate-limiter-robustness`, project `01_rate_limiter`). It is the `presenting → practicing`
  stage made playable.
- On level clear, the game emits an **evidence record** (NDJSON) describing what the player did and
  the measured outcome (admit rate vs target, burst handling, etc.). Write it under
  `../../learner/` (discover the real path/filename first — do not invent one).
- A **separate verifier** checks the evidence against `empirical_gate`
  (`require_executable_evidence: true`, `min_coverage`, `mutation_min` where applicable), and only
  then appends `{id, mastered_at, evidence}` to `units_log`. The game does **not** do this.
- Optionally append a reusable generalization to `../../learner/journal.md` in its documented format.

## COMMANDS (quickstart — run when you build the first game)

```bash
# from engines/pixelDojo/
pnpm create vite@latest game-01-rate-limiter -- --template vanilla-ts
cd game-01-rate-limiter && pnpm add phaser && pnpm install
pnpm run dev      # then drive it with Playwright MCP: browser_navigate http://localhost:5173
pnpm run build
```

(Use `pnpm`, matching `../codexDojo`. Keep each game in its own subfolder.
For the canonical Game 01 implementation today, see `pixel-quest/` —
`pnpm run dev` and `pnpm run smoke` from that subfolder.)

## ANTI-PATTERNS

- Do **not** duplicate `curriculum/` or `learner/` into this engine — read them root-relative.
- Do **not** let a game write `mastered` or append to `units_log`. That is the verifier's job.
- Do **not** use `localStorage` as the system of record for learning evidence.
- Do **not** add a backend, a database, or heavy deps for a single-player teaching prototype.
- Do **not** claim a game "teaches X," "is fun," or "is polished" without a playthrough + evidence
  (screenshots, telemetry).
- Do **not** ship blurry sprites — enforce `pixelArt: true` and integer scaling.
- Do **not** map two concepts onto one game. One subject, one concept, one mechanic.
