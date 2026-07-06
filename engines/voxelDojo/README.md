# voxelDojo

**The Three.js dojo: 3D didactic simulation games that teach the `curriculum/` subjects.** Sibling engine to
`../pixelDojo/`: same learning-gate contract, different genre. Where pixelDojo turns one concept into
an 8-bit *arcade encounter*, voxelDojo turns one concept into an explorable *3D system simulation* —
the learner walks (or flies) inside the architecture and operates it.

> Status: **15 of 18 spatial concepts implemented** (2026-07-05) as full pilot-quality games.
> Each game in `game-<NN>-<slug>/` ships a deterministic headless sim core with Vitest concept
> proofs, a Three.js scene, levels L1–L4, voxeldojo evidence emission, and a Playwright browser
> smoke. Project 01 (rate limiter) and Project 04 (task queue) are rules-shaped and live in the
> sister pixel-quest engine as Shape A encounters (`tokenBucket`, `sequenceFlow`, `taskQueue`);
> project 10 (HASH RING) is the original pilot. [`docs/GAP_ANALYSIS.md`](docs/GAP_ANALYSIS.md) is
> the status ledger; see the **Subjects → games** table below for the full map.

## The big idea

Distributed-systems concepts are *spatial*: rings, topologies, flows, partitions, quorums. A 2D arcade
can gamify the rule ("spend a token per request"); a 3D simulation can make the **structure** tangible
("watch keys physically migrate when a node leaves the hash ring"). voxelDojo exists for the curriculum
concepts whose mental model is a shape, not a rule.

The learning contract is identical to pixelDojo's:

- Each game maps **one curriculum concept → one 3D mechanic**.
- The game is an **attempt surface**: it emits raw evidence (NDJSON records, `EVIDENCE <json>` console
  lines, `window.__voxelDojoEvidence`) and stops.
- A **separate verifier** (Prometor context) checks evidence against `empirical_gate` and owns the
  `mastered` transition. The game never writes to `../../learner/`. Producer ≠ verifier.

## How it differs from pixelDojo

| Axis | pixelDojo (`pixel-quest/`) | voxelDojo |
| --- | --- | --- |
| Genre | 8-bit RPG with arcade encounters | First/third-person 3D system simulation |
| Rendering | Three.js used for 2D pixel-art presentation | Three.js used for actual 3D scenes (camera, depth, orbit) |
| What it teaches best | Rules and budgets (rates, ordering, policy) | Structures and dynamics (topology, rebalancing, consensus, flow) |
| Assets | MiniMax sprites, chiptune | Procedural low-poly geometry + flat palette; no model marketplace |
| Evidence source tag | `"source": "pixelquest"` | `"source": "voxeldojo"` |

Both engines target the same units in `../../learner/learning_state.yaml` and reuse the same content-pack
philosophy (data-only packs, typed encounter/scenario registry, no arbitrary JS in packs).

## The 18 subjects → 3D simulation seeds

One game per curriculum project (`../../curriculum/catalog.md` is canonical). Each teaches a single
concept. Only Game 10 is specified in `PLAN.md` so far; the rest are seeds.

| # | Subject | Concept (the ONE thing) | 3D simulation seed |
| --- | --- | --- | --- |
| 01 | Rate limiter | Bucket capacity vs refill rate | **FLOODGATES** — operate dam sluices; the reservoir is the bucket, inflow bursts must be smoothed |
| 02 | Key-value store | Hashing to shelves, TTL expiry | **WAREHOUSE** — pilot a picker-bot storing crates on hash-addressed shelves; TTL crates visibly decay |
| 03 | URL shortener | Short-code generation, collisions | **WORMHOLE** — stamp wormhole gates between planets; a code collision routes travellers to the wrong world |
| 04 | Task queue | Retry, backpressure, DLQ | **FACTORY FLOOR** — 3D conveyor plant; jam = backpressure; poison crates ride the retry loop then drop to the DLQ chute |
| 05 | WebSocket chat | Persistent conns, fan-out, heartbeats | **RELAY STATION** — keep laser links alive between orbiting stations; heartbeat pulses; broadcast = beam split |
| 06 | File upload pipeline | Streaming vs buffering, bounded memory | **PIPELINE PLANT** — route fluid through pipes; buffer tanks overflow if you don't stream in chunks |
| 07 | REST API + auth | Middleware layers, JWT verification | **CHECKPOINT CITY** — escort requests through concentric city walls; each gate is one middleware; forged badges fail signature check |
| 08 | Event-driven orders | Append-only log, projections, replay | **TIMELINE TOWER** — events stack as floors; rebuild a projection by riding the elevator replaying floors in order |
| 09 | Plugin system | Sandboxing, interface contracts | **DOCKING BAY** — dock third-party pods; force-field sandbox limits what a pod can touch; mismatched interface = failed docking clamp |
| 10 | Distributed cache | **Consistent hashing + rebalancing** | **HASH RING** (pilot) — an orbital ring of cache stations; keys are satellites; add/remove a station and watch only the neighbor arc re-home |
| 11 | Load balancer | Health checks, routing policy | **AIR TRAFFIC** — route incoming ships to landing pads; probe pad health; least-connections vs round-robin as switchable policy |
| 12 | Job scheduler | Leader election, DAG dependencies | **MISSION CONTROL** — stations vote for a leader (simplified Raft); launch jobs in DAG order; kill the leader mid-run and recover |
| 13 | API gateway + CB | Circuit breaker states | **BREAKER GRID** — a 3D power grid; breakers trip open on failing districts, half-open probes re-test, bulkheads isolate |
| 14 | Log aggregator | Pipelines, correlation IDs | **RIVER DELTA** — log streams converge; inject dye (correlation ID) upstream and follow one request across tributaries |
| 15 | Metrics collector | Histograms, percentiles, alerting | **OBSERVATORY** — sample signals into a histogram rendered as terrain; set the alert plane; p95 is a visible contour |
| 16 | Message queue | Partitions, consumer groups, offsets | **FREIGHT YARD** — topics are track bundles, partitions are lanes, consumer crews rebalance when one walks off; offsets are lane markers |
| 17 | Config service | Consensus, watch/notify | **LIGHTHOUSE NETWORK** — a value change must reach quorum before lighthouses re-aim their beams; watchers light up on notify |
| 18 | Search engine | Inverted index, ranking | **STACKS** — a 3D library; file word-cards into the inverted-index catalog; a query fires ranked light-beams to shelves |

## Quickstart (when building)

1. Read **`AGENTS.md`** (engine rules) and **`docs/ARCHITECTURE.md`** (decisions and data flow).
2. Copy the **`PLAN.md`** template and fill *concept → 3D mechanic* and the learning-gate hooks before
   scaffolding anything.
3. Scaffold:

   ```bash
   pnpm create vite@latest game-10-hash-ring -- --template vanilla-ts
   cd game-10-hash-ring && pnpm add three && pnpm add -D @types/three && pnpm run dev
   ```

4. Drive it with Playwright MCP (`browser_navigate http://localhost:5173`), assert on
   `EVIDENCE <json>` console records, screenshot to `.logs/`.

## File map

```
voxelDojo/
├── README.md            # this file — big idea + 18 seeds
├── AGENTS.md            # engine-level rules (start here when working)
├── CLAUDE.md            # thin pointer for Claude Code contexts
├── PLAN.md              # game-definition template + worked HASH RING pilot
├── docs/
│   ├── ARCHITECTURE.md  # decisions, trade-offs, learner/curriculum integration
│   ├── GAP_ANALYSIS.md  # status ledger: what's closed, what remains
│   └── 3d-style.md      # shared visual language for all games
└── game-10-hash-ring/   # pilot implementation
    ├── src/sim/         # headless deterministic core + Vitest concept proofs
    ├── src/index.ts     # reusable threejs-dojo module exports (controller + sim, no DOM mount)
    ├── src/game/        # level state machine (controller) + playthrough tests
    ├── src/scene/       # Three.js render layer + DOM HUD
    ├── src/content/     # types + substrate-generated reviewSlice.ts
    ├── src/evidence/    # evidence record builder/emitters
    ├── playwright/      # browser smoke: plays L1–L2, asserts EVIDENCE records
    └── .logs/           # Playwright screenshots / evidence artifacts
```
