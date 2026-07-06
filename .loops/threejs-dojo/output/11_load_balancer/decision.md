# Decision — 11_load_balancer

**shape: B**

## Rationale

1. The primary concept (per `spec.md`) is **reverse-proxy load balancing with health-aware request routing** — its mechanic is "pick one of three routing algorithms + respect per-backend health + retry on failure", which has no analogue in pixel-quest's four encounter kinds (token_bucket / sequence_flow / route_health / policy_gate are all single-gate admit/reject, none represents a *pool* of N selectable health-tagged backends).
2. The concept's mental model is **spatial**: a ring of backend pillars, a central dispatcher, and orbs flying between them — exactly what a fresh three.js arena embodies and what a 2D lane shell cannot.
3. Teaching the algorithm trade-off (round-robin vs least-connections vs consistent-hash) requires three parallel selection paths the player switches between per request type (plain / sticky / heavy) — too much state for a pixel-quest reskin; needs its own 3D world with a dispatcher turret + ring of health-tagged pillars.
4. The failover loop (RF-013 retry on mid-flight backend death) needs visible in-flight orbs that can stall and be re-routed — a 3D motion the lane shell has no room for.
5. Bounded scope: one ring, one turret, ≤ 4 inputs, 3 algorithms, one failover retry loop — pinned RNG seed in wave 2 guarantees a mid-flight death so the `failover_recovered >= 1` pass clause is reachable deterministically; no backend needed.
6. Distinct from sibling Shape B apps: KV Warehouse (hash-bucket ring + TTL decay, `voxeldoj-kv-warehouse`), Slug Launcher (hash cannon + base62 docks, `threejs-slug-launcher`), Aegis Corridor (gate-ring middleware chain), Plugin Docking Bay (sandbox bubbles) — no overlap in scene geometry, request shape (plain/sticky/heavy), or evidence `metrics.kind` (`threejs-traffic-forge`).
