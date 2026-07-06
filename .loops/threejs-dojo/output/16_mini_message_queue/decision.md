# Decision — 16_mini_message_queue

- **Slug**: `16_mini_message_queue`
- **Shape**: **B** — fresh standalone 3D app at `engines/pixelDojo/games/16_mini_message_queue/`
- **Concept (catalog)**: Topics, partitions, consumer groups, offsets, log-structured storage, retention, replay
- **Key question (catalog)**: How do partition assignment and consumer rebalancing strategies affect throughput stability?
- **Done-rule (catalog, one line)**: A 3D world demonstrates log-structured storage with partitioned ordered offsets, consumer-group cursors, lag, and replay under measurable pass criteria on a deterministic seed.

## Rationale (≤ 6 lines)

1. The defining geometry of a Kafka-like log — **N parallel partition lanes** of numbered **offset slots**, **independent per-group cursor rings** riding each lane, **red lag strips** between cursor and latest, and a creeping **Retention Tide** dissolving old slots — needs a real 3D scene graph; pixel-quest's flat encounter shell reduces every concept to "incoming sprite → admit/reject," which cannot express offsets, cursors, or lag.
2. The catalog primary concept ("log-structured storage with partitioned ordered offsets") is only legible when the player physically routes a key-colored orb to its matching lane, watches it serialize behind an in-flight orb into the next slot (NFR-005 concurrent-append safety), and fetches-then-commits a cursor — a fresh world is mandatory, not optional.
3. Mechanic family `threejs-message-queue` is distinct from every existing kind (`pixelquest-token-bucket` / `sequence-flow` / `route-health` / `policy-gate`, and the sibling `threejs-websocket-chat`); no encounter is reused.
4. The catalog's key question ("partition assignment vs throughput stability") becomes **tactile**: misroute too many orbs to one lane and that lane's lag spikes while siblings idle — a visible throughput collapse the player causes and must fix.
5. Multi-agent fit: parallel workers for tsconfig/biome scaffold, three.js pier+lanes+cursors scene, evidence schema + content pack validator, and Playwright smoke are cleanly separable.
6. Replay + retention are first-class mechanics (cursor rewind, `offset_no_longer_retained` fault on tide overtake), not afterthoughts — closing the loop on FR-009/FR-010/FR-011/FR-012 in a single L2 attempt.
