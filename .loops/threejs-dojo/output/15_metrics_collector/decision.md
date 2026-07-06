# Decision — `/threejs-dojo 15_metrics_collector`

- **Slug:** `15_metrics_collector`
- **Shape:** **B** (fresh standalone 3D world)
- **Mode:** Training Mode ON
- **Path chosen:** B — sibling 3D app; concept gets its own world.

## Rationale (≤ 6 lines)

1. Histogram metrics + cumulative percentile estimation + threshold alert lifecycle need **a row
   of bucket columns whose bars grow with counts, a cumulative-count ribbon above them, AND a
   threshold plane the bars pierce to fire alerts** — pixel-quest's four encounter kinds
   (sequence_flow / policy_gate / route_health / token_bucket) all model "incoming sprite →
   admit/reject" and have no bucket column, no cumulative ribbon, no time window, and no
   crossable alert plane; the concept cannot fit that shell.
2. The 3D mechanic is a **Metrics Observatory**: latency orbs rain onto a row of Prometheus-style
   `[le]` columns; the player-slide-claw routes each orb to the smallest `le ≥ value` bucket; a
   cumulative ribbon answers p50/p95/p99 beacons by rank lookup; the player raises a horizontal
   **alert plane** to the threshold and watches it transition `pending → firing → resolved` as
   the p95 bar pierces, holds, and clears.
3. Percentile rank-lookup on cumulative counts + a crossable threshold plane + a time-window dial
   each need 3D space **and** a visible clock; flattening them to 2D would erase exactly the
   invariants the spec encodes (RF-003, RF-008, RF-009, FR-014, FR-015, NFR-005).
4. `ROUTING_MANIFEST.md` row 15 prescribes Shape B with hero `histogram terrain + alert plane`
   and `game-15-observatory`; this run conforms (port 5215, unit `U15-metrics-collector`).
5. The arena is bounded (one row of ≤ 8 buckets, ≤ ~12 obs/wave, one plane), so Shape B's cost is
   finite and a single Vite + three + Vitest + Biome + Playwright app delivers it.
6. Distinct from `10_distributed_cache` (hash-ring pilot, different concept: consistent hashing),
   `13_api_gateway_circuit_breaker` (Shape B, breaker open/closed/half-open — single switch, not
   a distribution), and `14_log_aggregator` (Shape B, log tributaries + correlation IDs) — no
   overlap.
