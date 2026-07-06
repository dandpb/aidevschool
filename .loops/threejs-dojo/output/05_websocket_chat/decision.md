# Decision — 05_websocket_chat

- **Slug**: `05_websocket_chat`
- **Shape**: **B** — fresh standalone 3D app at `engines/pixelDojo/games/05_websocket_chat/`
- **Concept (catalog)**: WebSocket protocol, connection management, fan-out broadcasting, rooms, presence, heartbeats
- **Key question (catalog)**: How does each runtime handle 10k+ concurrent persistent connections?
- **Done-rule (catalog, one line)**: A 3D world demonstrates WebSocket connection lifecycle and broadcast fan-out under high concurrency with measurable pass criteria on a deterministic seed.

## Rationale (≤ 6 lines)

1. WebSocket semantics are about **persistent tethered links + fan-out routing + heartbeat pruning** — geometry that pixel-quest's encounter shell cannot express (its `Broadcast Hub` for this slug is yet another `request sprite → admit/reject` lane, indistinguishable from token-bucket/route-health/policy-gate).
2. The defining visuals — `N` client nodes orbiting a hub on persistent glowing tethers, one inbound message particle **splitting into N copies** that ride the tethers to every room member — need a real 3D scene graph; a 2D arcade lane cannot show fan-out multiplicity.
3. The 3D depth axis earns its keep: rooms are **color-coded depth bands**, dead clients fade to grey and drift, slow-consumer buffers visibly overflow along the tether line — none of this reads in pixel-quest's flat overworld.
4. Distinct from `01_rate_limiter` (Shape A in pixel-quest), `02_key_value_store` (Shape B), and `16_mini_message_queue` (Shape B) — no encounter kind reuses `threejs-websocket-chat`.
5. Multi-agent fit: parallel workers for tsconfig/biome scaffold, three.js hub+client scene, evidence schema + content pack validator, and Playwright smoke are cleanly separable.
6. Catalog's primary learning objective ("connection lifecycle and broadcast fan-out") is **only** legible when the player physically routes particles to room members along persistent links — a fresh world is mandatory, not optional.
