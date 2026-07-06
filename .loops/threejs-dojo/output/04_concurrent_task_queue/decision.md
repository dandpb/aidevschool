# Decision — 04_concurrent_task_queue

- **Slug**: `04_concurrent_task_queue`
- **Shape**: **B** — fresh standalone 3D world at `engines/voxelDojo/game-04-task-queue/`
  (overrides ROUTING_MANIFEST's earlier pixel-quest-A routing for this slug)
- **Concept (catalog)**: Worker pools, job scheduling, backpressure, priorities, timeouts, retry
  policies, dead-letter queues, idempotency
- **Key question (catalog)**: Which language's concurrency model delivers the best throughput for
  async job processing?
- **3D mechanic**: "TASK FORGE" — a foundry with a bounded priority **hopper** of ingots (tasks),
  N robotic **forge arms** (workers) that grab the brightest+oldest eligible ingot, an
  **annealing rack** (retry with exponential backoff + jitter), and a **scrap chute** (DLQ for
  poison / exhausted retries). Forklifts deliver ingots; the player rejects them with `R`
  (backpressure 429 / idempotency-dup sigil).

**Rationale (≤ 6 lines)**:
1. The dispatch contract is a multi-stage topology (queue → N workers → retry-rack / DLQ) plus
   backpressure and idempotency — pixel-quest's encounter kinds are all single-gate
   admit/reject (token_bucket / policy_gate / route_health) or strict ordering (sequence_flow),
   none of which can hold "N concurrent pulls + backoff + DLQ + dedup" as one system.
2. The geometry is intrinsic to 3D: hopper stack height = queue depth, arm activity = worker
   utilization, annealing rack = backoff in physical space, scrap chute = DLQ — readable at a
   glance, impossible in a 2D meter.
3. Distinct from sibling games: `10` HASH RING (consistent hashing), `11` AIR TRAFFIC (routing
   policies), `16` FREIGHT YARD (partitions + consumer offsets) — TASK FORGE's mechanic is
   worker-pool dispatch with retry/DLQ, a different shape from all three.
4. Sim core is fully headless (`sim/queue.ts` + Vitest, injectable RNG/clock), so M1 proves the
   RF-005 `running ≤ worker_count` invariant and the retry/DLQ/idempotency contract with no
   pixels — the scene only renders state.
5. Multi-agent build fit: parallel subagents for scaffold (tsconfig/biome/vite), sim core +
  tests, scene + interaction, evidence emitter + Playwright smoke.
6. unit_id `U4-task-queue`, port `5204`, metrics kind `voxeldojo-task-queue`; pass rule is
   ≥80% dispatch prediction accuracy + zero poison-requeued / overflow / dup-sigil / contract
   violations — every failure is a misread of the queue contract, not twitch.

**Done-rule (catalog, one line)**: The player demonstrates bounded worker-pool dispatch
(priority + FIFO + scheduled_for + retry/backoff + DLQ + backpressure + idempotency) by
predicting ≥80% of next-dispatches correctly and routing every finished ingot to the right bay
with zero contract violations, evidenced by a `pass: true` `voxeldojo-task-queue` record under
Playwright.
