# pixelDojo

**8-bit arcade games that teach the `curriculum/` subjects.** This engine is the
"[Create browser-based games](https://developers.openai.com/codex)" playbook, **adapted** from Codex
(with `$playwright-interactive` / `$imagegen` / `$openai-docs`) to the tools available in this
environment and to the `aidevschool` golden rules.

## The big idea

A teaching game is the cleanest possible **learning-gate artifact**. Your gate
(`../../learner/learning_state.yaml`, system `agora-continuum`) requires the *learner to attempt and be
evaluated on executable evidence before a unit is marked `mastered`* — and `units_log` is still `[]`.
Closing that first loop is the MVP.

So each game maps **one curriculum concept → one arcade mechanic**, and a cleared level **emits
evidence** (NDJSON telemetry: did the player throttle to the right rate, absorb the burst, resolve the
conflict). A **separate verifier** reads that evidence and appends the unit. The game is the *attempt
surface*; it never marks mastery itself (producer ≠ verifier).

## How it differs from the Codex playbook (tool map)

| Playbook (Codex) | pixelDojo (here) | Why |
| --- | --- | --- |
| `$playwright-interactive` | **Playwright MCP** (`browser_navigate`, `browser_take_screenshot`, `browser_press_key`, `browser_evaluate`, `browser_console_messages`) | Same job: open the dev server, play, screenshot, read console, iterate. |
| `$imagegen` | **MiniMax** `text_to_image` (sprites/tiles/bg), `music_generation` (chiptune), `text_to_audio` (SFX), `generate_video` (trailer) | Asset generation across image **and** audio, plus the `canvas-design` skill for title cards. |
| `$openai-docs` | **WebSearch** + **web_fetch** (Phaser/MDN); optional Context7 via MCP | We aren't wiring OpenAI features; just need framework docs. |
| Next.js + Phaser + Fastify + Postgres + Redis | **Vite + TypeScript + Phaser 3**, no backend by default | A single-player canvas game needs no SSR/DB. Matches `../codexDojo`. |
| `/plan` slash command | The shipped **`PLAN.md`** template (or plan mode) | Same discipline: define the game before building it. |
| `AGENTS.md`, `.logs/`, `.prompts/` | Kept as-is | These conventions are good and repo-native. |

## The 12 subjects → game seeds

One game per curriculum project; each teaches a single concept. (`01` is fully specified in `PLAN.md`;
only `01` exists on disk so far.)

| # | Subject | Concept | 8-bit game seed |
| --- | --- | --- | --- |
| 01 | Token-bucket rate limiter | Bucket capacity vs refill rate | **GATEKEEPER** — bouncer spends/refills tokens at the door |
| 02 | WebSocket chat server | Persistent conns, broadcast, heartbeats | **SWITCHBOARD** — keep lines alive, broadcast to a room |
| 03 | Job queue / scheduler | Retry, idempotency, dead-letter | **CONVEYOR** — route crates to workers; retry then DLQ chute |
| 04 | URL shortener + analytics | Caching, id generation | **SHORTCUT** — stamp short codes; cache hit = speed bonus |
| 05 | Event sourcing + CQRS | Append-only log, projections | **REWIND** — replay an event tape to rebuild state |
| 06 | Full-text search | Inverted index, TF-IDF ranking | **INDEXER** — file word-tiles in letter-drawers, rank queries |
| 07 | Distributed KV store (Raft) | Consensus, leader election | **QUORUM** — win a majority vote before committing a write |
| 08 | API gateway / service mesh | Circuit breaker, retry, timeout | **TRAFFIC CONTROL** — trip breakers on failing backends |
| 09 | Real-time collaborative editor | CRDT / OT conflict merge | **CO-OP CANVAS** — two cursors merge edits deterministically |
| 10 | CI/CD pipeline engine | DAG execution, dependencies | **PIPELINE** — light stages in dependency order; failures block |
| 11 | Observability platform | Metrics, tracing, alerting | **WATCHTOWER** — follow a trace to the slow span; alert on time |
| 12 | Feature flag service | Targeting, gradual rollout, A/B | **ROLLOUT** — flip flags to a growing % of pixel-users |

## Quickstart

1. Read **`AGENTS.md`** (the full playbook + golden rules).
2. Open **`PLAN.md`**, copy the template, fill *concept → mechanic* and *learning-gate hooks* for your subject.
3. Scaffold and build:

   ```bash
   pnpm create vite@latest game-01-rate-limiter -- --template vanilla-ts
   cd game-01-rate-limiter && pnpm add phaser && pnpm install && pnpm run dev
   ```

   (For the canonical Game 01 implementation today, see `pixel-quest/` —
   `pnpm run dev` from that subfolder; the scaffold above is the *template* path for new games.)

4. Drive it with Playwright MCP (`browser_navigate http://localhost:5173`), generate assets with
   MiniMax (save prompts to `.prompts/`), and emit evidence to `../../learner/`.

## File map

```
pixelDojo/
├── AGENTS.md            # canonical agent playbook (start here)
├── CLAUDE.md            # thin pointer to AGENTS.md
├── README.md            # this file — adaptation summary + subject seeds
├── PLAN.md              # game-definition template + worked Rate Limiter example
├── .prompts/            # reusable MiniMax 8-bit asset prompts (image + audio)
├── .logs/               # append-only work log
├── pixel-quest/         # canonical Game 01 implementation (token-bucket RPG; see its own docs/)
└── docs/                # space for per-game design notes / evidence artifacts
```

## Golden rules (inherited)

Learning gate before mastery · producer ≠ verifier · no claims without evidence · filesystem is the
source of truth (read `curriculum/` and `learner/` root-relative, never duplicate) · run `/simplify`
before commit.
