# PLAN slice — `05_websocket_chat` (Persistent-Link Switch Fabric)

> PLAN slice for `/threejs-dojo 05_websocket_chat`. The slug's catalog concepts are
> "WebSocket protocol, connection management, fan-out broadcasting, rooms, presence, heartbeats."
> The catalog's primary learning objective (see `curriculum/05_websocket_chat/docs/spec.md`) is
> **"WebSocket connection lifecycle and broadcast fan-out under high concurrency."** This slice
> isolates that ONE concept as a fresh standalone 3D world — Shape B — because pixel-quest's
> existing `Broadcast Hub` encounter for this slug is yet another `request sprite → admit/reject`
> lane and cannot express persistent tethered links or fan-out multiplicity.

---

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/05_websocket_chat/`
- **One concept this game teaches:** the **WebSocket connection lifecycle and broadcast fan-out** —
  one persistent connection per client, one inbound message routed (fanned out) to every member of
  the target room, with dead peers detected by heartbeat and pruned.
- **Out of scope (other concepts in this project, taught elsewhere):** private messaging, typing
  indicators, message history persistence, reconnection logic, cross-language runtime comparison
  (that is the curriculum's job, not the game's).
- **Slug:** `05_websocket_chat`
- **App path:** `engines/voxelDojo/game-05-relay-station/` (standalone VoxelDojo app — Shape B).
- **Unit id:** `U-05_websocket_chat` (per `unitId()` in
  `engines/pixelDojo/pixel-quest/src/content/curriculumPack.ts:625-630`).
- **Encounter id:** `encounter-05_websocket_chat` (per `encounterId()` in same file).
- **Mechanic family:** `threejs-websocket-chat` (new discriminated metrics kind — see §11).

## 2. Player goal (10-year-old phrasing)

You run a **switch-fabric hub** in space. Client satellites are tethered to your hub on glowing
persistent lines. When a message comes in, **route it to every satellite in the same color-band
(room)** so they all light up — and cut loose any satellite whose heartbeat has gone dark, before
its dead link wastes your bandwidth.

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| **Persistent connection** (vs request/response) | Each client is a node on a **persistent glowing tether** from the hub that stays lit for the whole level (not a per-request sprite that exits). | Player sees "the link is always there; messages ride it." |
| **Fan-out broadcasting** | The player picks a room; one inbound message particle **splits into N copies**, one per member, traveling simultaneously along the room's tethers. | Player watches `1 → N` multiplicity; broadcast is not "send N times" but "fan-out once." |
| **Rooms / membership** | Rooms are **color-coded depth bands** orbiting the hub. A message only reaches members of its color band. | Player maps message→room before launch; wrong color = wrong recipients. |
| **Presence (online/offline)** | Live clients glow in their room color; **dead clients fade to grey** and drift outward. | Player reads presence visually without a separate "is online" flag. |
| **Heartbeat / dead-peer detection** | Each tether has a **heartbeat ring** that decays; if it hits zero the client is dead and the tether dims. The player must **prune** it (`X`) before the next broadcast, else the message gets dropped into the void and counted as a missed disconnect. | Player ties "no heartbeat → must disconnect" to the cleanup step. |
| **Slow consumer / backpressure** | Each client has a small **buffer ring**; if you re-broadcast before the previous fan-out drained, the buffer overflows and the message bounces (visible spark). | Player paces broadcasts instead of mashing launch. |
| **10k+ concurrent connections (scale)** | Levels ramp clients from 6 → 12 → 24 → 48; at 48 the screen is *visibly* crowded, making the "10k+" trade-off tactile. | Player feels why runtime choice matters at scale (without needing 10k real sockets). |

## 4. Main loop (10–30s cycle)

1. **Spawn** — N client satellites spawn at level start, distributed across 2–4 color bands (rooms).
   Each gets a persistent tether to the central hub; heartbeat rings full.
2. **Inbound message** — A message particle appears at the hub, colored for its target room. A
   countdown ring (delivery deadline, ~3s) ticks on the particle.
3. **Assign** — Player cycles focus to the matching room with `←` `→` and confirms with `Z`.
4. **Fan-out** — The particle splits into M copies (M = current live members of that room); each
   copy rides its tether to a member and lights it up.
5. **Heartbeat tick** — All heartbeat rings decay a notch. Any client whose ring emptied since the
   last tick is now "dead"; it greys out within ~2s (the `RNF-005` 30s cleanup budget compressed).
6. **Prune** — Player must press `X` on each dead client before the next inbound message arrives.
   Unpruned dead clients cause the next fan-out to drop copies into the void (`missed_disconnects`).
7. **Repeat** until the wave's quota of messages is routed. Wave length ≈ 20–30s.

## 5. Inputs & controls

- `←` `→` — cycle focused room (color band) / cycle focused dead client when pruning.
- `Z` — **broadcast**: confirm fan-out of the inbound message to the focused room.
- `X` — **disconnect**: prune the focused dead client (close its tether).
- `Space` — pause/step the inbound countdown (training mode only; disabled in the gated attempt).
- Mouse: optional orbit-camera drag for inspection (no gameplay effect; aids 3D legibility).

Three primary actions (`←` `→`, `Z`, `X`) — NES-pad friendly. No typing, no precise aiming.

## 6. Win / fail states

**Win a wave** when **all** of:
- `messages_broadcast === wave_quota` (every inbound particle was routed).
- `wrong_room_leaks === 0` (no message fanned out to a room of the wrong color).
- `missed_disconnects === 0` (every dead client was pruned before the next fan-out).
- `deadline_misses === 0` (no inbound particle expired).
- `slow_consumer_drops <= tolerance` (small allowance shrinks each level).

**Fail the wave** when **any** of:
- An inbound particle's deadline expired before broadcast.
- A fan-out dropped copies into the void because a dead client wasn't pruned.
- A broadcast was sent to the wrong room (color mismatch) — counts as a **leak** (security /
  isolation failure, mirrors spec RF-005 + RF-012).
- The slow-consumer buffer overflowed past the level's tolerance.

Both win and fail are **direct readouts of WebSocket discipline** — fan-out correctness, presence
hygiene, pacing. The level cannot be cleared by mashing `Z`.

## 7. Progression / difficulty (for context — not implemented in this slice)

Sketched here so the implementing agent knows the level curve:

- **L1 — First Fan-out:** 6 clients, 1 room. Learn "pick room → Z → see 6 copies light up."
- **L2 — Two Rooms:** 12 clients, 2 color bands. Learn color routing; wrong color = leak.
- **L3 — Dead Peers:** 12 clients, intermittent heartbeat deaths. Learn `X` prune discipline.
- **L4 — Slow Consumers:** 24 clients, faster cadence. Learn to pace broadcasts.
- **L5 — Scale:** 48 clients across 4 rooms. The "10k+" feeling made tactile.

The gated attempt for this run is **L2** (closes the loop on routing + fan-out without yet
penalizing prune discipline — that's L3's job). L2 is the MVP close for `U-05_websocket_chat`.

## 8. Visual direction (for context)

- 3D space scene, dark navy background, neon palette (cyan / magenta / yellow / lime — one per
  room color band, max 4 rooms).
- Hub: octahedral core at origin, slow rotation.
- Clients: low-poly icosahedra, color = room; grey + dim when dead.
- Tethers: thin emissive lines from hub to client; brightness = heartbeat health.
- Inbound particle: bright sphere at hub, ring countdown in white.
- Fan-out copies: smaller spheres trailing along each tether.
- Optional CRT/bloom postprocessing for "switch-fabric" feel.

## 9. Audio direction (for context)

- Ambient low drone; per-fan-out "shimmer" chord; per-prune "snip" SFX; per-leak discordant buzz;
  per-deadline-miss klaxon. Generated via MiniMax `music_generation` / `text_to_audio` at M2.

## 10. Stack & hosting

- **Vite + TypeScript + three.js** (no React; raw DOM HUD overlay).
- Single-page app at `engines/voxelDojo/game-05-relay-station/`.
- Deterministic seed per level (so the verifier can reproduce the wave).
- No backend — the entire WebSocket protocol is **simulated in-page**; the player IS the server.
- Smoke entrypoint: `pnpm --filter pixeldojo-05-websocket-chat smoke` runs a Playwright drive that
  boots the page, plays L2, and captures `window.__websocketChatEvidence`.

## 11. Learning-gate hooks

- **Active unit:** `U-05_websocket_chat` (project `05_websocket_chat`). Derived from
  `unitId(module)` in `engines/pixelDojo/pixel-quest/src/content/curriculumPack.ts:625-630` — the
  generic branch returns `U-${module.project}`.
- **Encounter id wired:** `encounter-05_websocket_chat` (per `encounterId()` in the same file).
- **Evidence channel:** `window.__voxelDojoEvidence`, mirrored as an `EVIDENCE <json>` console
  record for the Playwright smoke driver.
- **New metrics kind:** `threejs-websocket-chat` — extends the discriminated union in
  `engines/pixelDojo/pixel-quest/src/game/evidence/types.ts`. Add this variant alongside the
  existing `pixelquest-*` kinds; the validator dispatches on `metrics.kind`.

### Evidence record shape

```json
{
  "source": "pixelquest",
  "unit_id": "U-05_websocket_chat",
  "project": "05_websocket_chat",
  "encounter_id": "encounter-05_websocket_chat",
  "game": "PixelDojo Quest",
  "ts": "<iso-8601>",
  "pass": true,
  "metrics": {
    "kind": "threejs-websocket-chat",
    "level": 2,
    "rooms_managed": 2,
    "live_clients": 12,
    "messages_inbound": 8,
    "messages_broadcast": 8,
    "correct_deliveries": 48,
    "wrong_room_leaks": 0,
    "missed_disconnects": 0,
    "slow_consumer_drops": 0,
    "deadline_misses": 0
  },
  "curriculum_context": {
    "concept": "Persistent WebSocket links, room fan-out, heartbeat pruning",
    "mechanic": "Switch-Fabric Hub (3D)",
    "accepted_signal": "1 inbound -> N room-member deliveries, no leaks, dead peers pruned",
    "rejected_trap": "wrong-room fan-out (leak) or dead peer left on the wire (waste)"
  },
  "review_context": {
    "unit_kind": "concept",
    "scheduled_review": true,
    "review_reason": "due",
    "streak_candidate": true,
    "scheduler_source": "learner-substrate",
    "verifier_required": true
  }
}
```

### Field semantics (for the implementing agent + verifier)

| Field | Type | Meaning |
| --- | --- | --- |
| `metrics.kind` | `"threejs-websocket-chat"` | Discriminator. New variant. |
| `metrics.level` | `number` | Level cleared (1–5). Gated attempt is L2. |
| `metrics.rooms_managed` | `number` | Distinct color bands active this wave. |
| `metrics.live_clients` | `number` | Clients with live tethers at end of wave. |
| `metrics.messages_inbound` | `number` | Inbound particles spawned (the wave quota). |
| `metrics.messages_broadcast` | `number` | Inbound particles the player actually fanned out. |
| `metrics.correct_deliveries` | `number` | Sum of room members correctly reached (`Σ` over broadcasts of `live_members_of_target_room`). |
| `metrics.wrong_room_leaks` | `number` | Copies delivered to members of a non-target room. **Must be 0.** |
| `metrics.missed_disconnects` | `number` | Fan-out copies dropped because a dead client was not pruned in time. **Must be 0.** |
| `metrics.slow_consumer_drops` | `number` | Copies bounced by an overflowing client buffer (over-paced broadcast). Level-dependent tolerance. |
| `metrics.deadline_misses` | `number` | Inbound particles whose delivery ring expired before broadcast. **Must be 0.** |

### Pass rule (gate)

A wave's `pass: true` requires **all** of:

```
metrics.kind          === "threejs-websocket-chat"
metrics.messages_broadcast === metrics.messages_inbound   // nothing dropped on the floor
metrics.wrong_room_leaks   === 0                          // isolation invariant
metrics.missed_disconnects === 0                          // presence hygiene
metrics.deadline_misses    === 0                          // didn't stall
metrics.slow_consumer_drops <= LEVEL_TOLERANCE[level]     // L2 tolerance = 0
metrics.correct_deliveries  >= LEVEL_TARGET[level]        // L2 target = live_members sum across the quota
```

Anything else keeps the gate locked. The game emits evidence only — it **never** writes
`learner/learning_state.yaml`. The gate (`python3 -m learner.gate --evidence PATH`) reads captured
NDJSON, finds the latest record whose `unit_id === active_unit.id`, checks the pass-rule above
against the metrics, and only then appends to `units_log` through `learner/substrate/`. The game's
`pass: true` is **never** mastery by itself.

### Done-rule (one line, for the verifier subagent)

> A 3D world at `engines/voxelDojo/game-05-relay-station/` renders `N` persistent client
> nodes tethered to a hub, fans each inbound message out to every member of the target color-band
> room, lets the player prune dead-heartbeat clients, and emits a valid `threejs-websocket-chat`
> EVIDENCE record with `pass: true` for `unit_id=U-05_websocket_chat` under Playwright on level 2,
> with `wrong_room_leaks === 0`, `missed_disconnects === 0`, `deadline_misses === 0`.
