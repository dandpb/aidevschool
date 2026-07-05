# PLAN — Game 05: "RELAY STATION" (WebSocket chat / persistent conns + fan-out + heartbeat)

> One file per game; this is the RELAY STATION plan. Sections 1–13 follow the `PLAN.md` template.
> The pilot is `game-10-hash-ring/`; this game mirrors its structure verbatim and swaps the concept.

---

**1. Subject & concept**
Curriculum project: `../../curriculum/05_websocket_chat/`. The ONE concept this game teaches:
**persistent connections + fan-out + heartbeats** — clients hold a long-lived connection to a relay
hub; a broadcast on a channel fans the message out to every *subscribed* client; a heartbeat ping/pong
keeps each link alive; a missed heartbeat (timeout window elapsed with no ping) drops the connection,
removing that client from the fan-out set. Out of scope: the wire protocol (RFC 6455 framing,
masking, the Upgrade handshake), TLS/wss, message ordering/backpressure per connection (game 04),
presence-vs-pubsub distinctions, scaling a relay cluster (game 11 load balancing, game 16 partitioning),
and the Node/Go implementation comparison — all the curriculum project's job, not the teaching sim's.

**2. Why 3D**
WebSocket fan-out is orbital. In 3D the player sees a central relay **hub** with client **stations**
orbiting it; each persistent connection is a **laser link** (a line segment) between hub and station;
a **broadcast** is the hub splitting its beam into a fan of beams that travel down every subscribed
link at once; a **heartbeat** is a regular pulse running along each link; a **dead link** (no pulse for
the timeout window) goes dark and the orbiting station drifts out of the constellation. The lesson —
*who is connected right now* and *which links receive this broadcast* — is a spatial state that 2D
logs flatten into noise. In 3D the player watches the fan-out tree grow beam-by-beam, sees the
subscribed set as a lit arc of the constellation, and watches a missed-heartbeat link vanish — that is
connection-liveness + fan-out delivery made visible, and it cannot be read off a chat-log panel.

**3. Player goal**
Predict which stations are connected, which receive a broadcast, and which links survive a heartbeat
timeout — then reconnect a dropped station so it rejoins the fan-out.

**4. Concept → mechanic mapping**

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Persistent connection | A laser link (segment) hub↔station, lit while connected | Player reads the lit constellation as the live client set |
| Connect / disconnect | Station enters/leaves orbit; its link appears/vanishes | Player tracks who holds a connection right now |
| Channel subscription | A station's link is tinted by its subscribed channel | Player reads the fan-out set as the channel-tinted links |
| Broadcast (fan-out) | Hub splits one beam into a fan to every live subscribed station | Player predicts the delivery set, not "all stations" |
| Non-subscribed / dead exclusion | Non-subscribed and dead links stay dark during a broadcast | Player knows fan-out = live ∩ subscribed |
| Heartbeat ping | A pulse travels out each link on a tick | Player reads link health from pulse recency |
| Heartbeat timeout | A link with no pulse for `timeoutMs` goes dark and drops | Player predicts which links survive the timeout window |
| Recovery (reconnect) | Player reconnects a dropped station; its link relights and re-fans | Player proves a reconnected client rejoins the fan-out |

**5. Main loop**
A wave presents a configuration of stations (each connected or not, subscribed to a channel or not,
heartbeat recent or stale). The player **predicts** the live set (L1), the broadcast delivery set
(L2), the set of links that survive a heartbeat sweep (L3), or **acts** to reconnect a dropped client
(L4). Each prediction is judged against the deterministic sim; on a correct wave the relay runs the
broadcast and the fan-out beams animate, then evidence is emitted. Between waves the liveness /
subscription / heartbeat conditions deepen one facet of the concept.

**6. Camera & controls**
Mouse-orbit + scroll zoom around the relay hub (OrbitControls), tilted ~30°. Click a station to
predict it / reconnect it; click HUD buttons to start a wave, broadcast, or lock in. Four actions plus
camera — mirrors HASH RING's surface area.

**7. Win / fail states**
*Win a wave:* the predicted set equals the sim's true set at ≥80% accuracy (L1/L2/L3), or the dropped
station is correctly reconnected and shows up in the next fan-out (L4). *Fail:* prediction accuracy
below threshold (concept not held) or a wrong reconnect action. Every failure is a misread of
"persistent connection × subscription × liveness."

**8. Progression / difficulty**

- **L1 — Persistent link:** stations start connected or disconnected; predict which stations are
  connected (the live set). Active recall on the most basic invariant: a connection is held or it
  isn't.
- **L2 — Broadcast fan-out:** every station has a channel subscription (or none); a broadcast fires
  on one channel. Predict the delivery set — only live AND subscribed clients receive it. The fan-out
  tree is the lesson.
- **L3 — Heartbeat:** each link has a `lastHeartbeatAt`; after `timeoutMs` with no pulse, the sweep
  drops it. Predict which links survive the timeout window. Liveness is the lesson.
- **L4 — Recovery:** a station was dropped by a heartbeat sweep; reconnect it and confirm it rejoins
  the next fan-out. The full connect → heartbeat → drop → reconnect lifecycle in one wave.

**9. Visual direction**
Single hero object: the central relay hub (an icosahedron core) with client stations orbiting it in a
tilted ring. Each persistent connection is a line segment (laser link): **green** = live &
subscribed to the broadcasting channel, **grey** = connected but not subscribed (or no broadcast
active), **dark/red** = dead (dropped by heartbeat). A broadcast is a fan of beams splitting from the
hub to the subscribed set; a heartbeat is a small pulse traveling each link on the tick. ≤8-color
palette; the green/grey/red link state is the load-bearing signal. All geometry procedural
(`IcosahedronGeometry` hub, `BoxGeometry`/`OctahedronGeometry` stations, `LineSegments` links,
`InstancedMesh` for any pulse swarm). Background `#0b0e14` with fog to match.

**10. Simulation core (headless)**
`src/sim/relay.ts` — pure functions with an injected clock (`now: number`) and seeded RNG
(`mulberry32`), NO `three` import:

- `connect(state, clientId, now)` — adds a client with `connected: true`, `lastHeartbeatAt: now`.
- `disconnect(state, clientId)` — drops a client from the live set.
- `subscribe(state, clientId, channel)` / `unsubscribe(...)` — sets channel membership.
- `broadcast(state, channel, msg, now)` — returns the **delivered-to set**: only clients that are
  `connected` AND subscribed to `channel`. Non-subscribed and dead clients are excluded by
  construction.
- `heartbeat(state, clientId, now)` — marks liveness (updates `lastHeartbeatAt`).
- `sweepDead(state, now, timeoutMs)` — drops every client whose `now - lastHeartbeatAt > timeoutMs`.
- Deterministic: same seed ⇒ same scripted wave; the sim never reads `Date.now()` directly.

Vitest (`src/sim/relay.test.ts`, ≥3 concept proofs) covers: broadcast delivers **only** to
subscribed+live clients; a missed-heartbeat client is swept and excluded from the next broadcast;
subscribe/unsubscribe changes the fan-out set; determinism (same seed ⇒ same delivery set).

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with ≤12
stations, ≤8 channels, one fan of ≤12 beams, and ≤100 instanced pulses; `LineSegments` for links (one
draw call), no postprocessing, no physics engine — beam travel and pulse motion are parametric
animations along known link vectors.

**12. Learning-gate hooks**

- Targets unit **`U5-websocket-chat`** (project `05_websocket_chat`) in
  `../../learner/learning_state.yaml`. As of 2026-07-05 that unit is not yet in the substrate (only U0
  is honestly gated), so RELAY STATION evidence serves the **real learning gate** for U5 when the
  scheduler makes it the active unit — and serves as scheduled review / deepening afterwards. The
  emitter derives `scheduled_review` / `review_reason` dynamically from the substrate-generated review
  slice, so both modes work without code changes.
- On wave clear, emit:
  `{"source":"voxeldojo","unit_id":"U5-websocket-chat","project":"05_websocket_chat","scenario_id":"relay-station-L1","game":"RELAY STATION","ts":"<iso>","pass":true,"metrics":{"prediction_accuracy":0.92,"delivered":3,"subscribed_live":3,"missed_heartbeat_dropped":0},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"persistent conns + fan-out + heartbeat","mechanic":"orbiting relay stations, laser links"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and appends any
  review event to `units_log`. **The game never writes learner state.**

**13. Milestones**

- **M0** this plan.
- **M1** `sim/relay.ts` + Vitest suite proving fan-out = live ∩ subscribed, missed-heartbeat sweep
  excludes from next broadcast, subscribe/unsubscribe changes the fan-out set, deterministic with seed.
  (No pixels yet.)
- **M2** scene: hub + orbiting stations + laser links rendering a static connected set.
- **M3** interaction: click station to predict; broadcast fan-out animation; heartbeat pulse.
- **M4** levels L1–L4 with the connect / subscribe / heartbeat / recovery lifecycle.
- **M5** evidence emit wired to wave clears; console `EVIDENCE` records.
- **M6** verify: Playwright plays L1 headed, asserts evidence record + WebGL canvas + screenshot.

**Open questions / risks**
Does "predict the set" carry enough active recall for the heartbeat concept, or should L3 also ask the
player to *fire* the heartbeats before the sweep? (Resolved: predict-first keeps the surface uniform
with HASH RING; firing is a stretch goal post-M4.) Does WebGL run reliably in the Playwright smoke
environment (see `docs/GAP_ANALYSIS.md` §G6)? Resolve during M1–M3 before building L4.
