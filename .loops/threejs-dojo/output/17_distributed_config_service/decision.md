# Decision — 17_distributed_config_service

**shape: B** (sibling 3D app under `engines/pixelDojo/games/17_distributed_config_service/`)

**Rationale**

1. The primary concept is **consensus-backed writes + observable watch/notify** — a write must travel from a leader to a quorum of sentinel nodes before it commits, and only then do notification particles fan out to subscribed watcher drones. That is two distinct particle flows in space (write-orbs into the ring, notify-particles out to drones) plus a central monolith holding the current value — geometry none of pixel-quest's `sequence_flow / policy_gate / route_health / token_bucket` encounters can express (they are all "incoming sprite → admit/reject").
2. The catalog's central question is literally **"How do watch-notification latency and consensus overhead compare?"** — the done-rule forces the player to feel BOTH latencies as separate in-world travel times and read them off the HUD. A 2D encounter can show one delay, not the side-by-side comparison.
3. 3D is load-bearing: a ring of sentinels around the monolith (quorum geometry), vertical version-history stack behind it (rollback = re-commit a stacked glyph), leader-halo migration on node loss (Raft failover), and watcher drones orbiting at the periphery. SKILL.md lists `config-service quorum ring` as the canonical Shape B example.
