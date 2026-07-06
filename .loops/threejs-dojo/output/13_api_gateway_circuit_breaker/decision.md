# Decision — `/threejs-dojo 13_api_gateway_circuit_breaker`

- **Slug:** `13_api_gateway_circuit_breaker`
- **Shape:** **B** (fresh standalone 3D world)
- **Mode:** Training Mode ON
- **Path chosen:** B — sibling 3D app; concept gets its own world.

## Rationale (≤ 6 lines)

1. The circuit breaker is a **tri-state physical switch** (closed/open/half-open) with a rolling
   failure window, a cooldown clock, a bounded probe budget, and a separate fail-fast fallback
   path — pixel-quest's four encounter kinds (sequence_flow / policy_gate / route_health /
   token_bucket) all model "incoming sprite → admit/reject" and have no third state, no cooldown,
   no probe slot accounting; the concept cannot fit that shell.
2. The 3D mechanic is **Breaker Grid**: a substation with a massive center breaker lever
   detented to three poses (DOWN=closed, UP=open, MID=half-open); inbound request-pulses from
   client terminals on the left must be ADMITted (Z) in closed/half-open-probe, REJECTed to a
   fallback battery bank (X) while open, and the player presses C to TRIP / PROBE / CLOSE on
   threshold-cross / cooldown-elapsed / N-consecutive-probe-successes.
3. The three lever poses + cooldown ring + probe slots + visible leak-sparks across the
   open gap each need 3D space **and** a clock; flattening to 2D would erase exactly the
   invariants FR-004/FR-006/FR-007/FR-008/FR-009 encode (third state, cooldown gate, bounded
   probes, no-upstream-contact-while-open).
4. SKILL.md names `circuit breaker as a physical switch that trips open under failures` and the
   `ROUTING_MANIFEST.md` row 34 for this slug prescribes voxelDojo / Shape B / "3D power grid,
   tripping breakers" — this run conforms.
5. The arena is bounded (one lever, one reactor, one fallback bank, ≤ ~12 pulses/wave), so
   Shape B's cost is finite and a single Vite + three + Vitest + Playwright app delivers it.
6. Distinct from `01_rate_limiter` (Shape A token bucket), `11_load_balancer` (air-traffic
   routing, no state machine), and `04_concurrent_task_queue` (retry/DLQ, no breaker) — no
   overlap.
