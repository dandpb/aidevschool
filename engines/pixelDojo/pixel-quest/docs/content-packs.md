# PixelDojo Quest content packs

Each content pack is versioned data under `src/content/packs/<pack-id>/` or a typed pack module such
as `src/content/curriculumPack.ts`.

The runtime currently loads `curriculumPack.ts`, which maps all numbered projects in
`../../curriculum/` into 18 playable labs. Each lab owns one unit, one mentor, one encounter, and one
gate to the next lab. The compact JSON core pack remains a fixture for validator coverage.

## Pack shape

`pack.json` contains:

- `id`, `version`, `title`
- `regions`: maps, NPCs, gates, start positions, and curriculum project references
- `units`: learning unit contracts with `unit_id`, `project`, `concept`, prerequisites, encounter ids,
  and evidence contract
- `encounters`: declarative encounter definitions
- `assets`: stable manifest keys for tiles, sprites, and audio

Dialogue text is referenced by path, for example `dialogues/sonda.md`, and loaded through an explicit
dialogue registry.

Curriculum encounters also carry game-facing concept metadata: `concept`, `mechanicName`,
`resourceName`, request labels, action labels, and practice copy. The runtime currently supports:

- `token_bucket`: timed classifier for accepting good traffic/signals and rejecting traps.
- `sequence_flow`: ordered-flow puzzle for advancing valid pipeline steps and guarding invalid or
  out-of-order steps.
- `route_health`: routing puzzle for sending traffic to healthy targets and isolating degraded
  targets before they cascade.
- `policy_gate`: authorization/isolation puzzle for permitting allowed calls or plugins and denying
  policy violations.

## Encounter policy

Packs are data only. They do not ship arbitrary JavaScript. If a pack needs a new mechanic, add a
typed definition to `src/content/types.ts`, validation in `src/content/packValidator.ts`, and an
approved factory in `src/game/encounters/registry.ts`.

## Evidence policy

Encounters emit raw evidence only. The `metrics` block is polymorphic by
encounter kind — each kind ships its own variant discriminated by `metrics.kind`,
and the matching `EvidenceContract` (declared per unit) carries the pass
thresholds for that kind. The validator in `src/game/evidence/evidence.ts`
dispatches on `metrics.kind`.

### Variants

- **`pixelquest-token-bucket`** — emitted by `token_bucket` encounters:

```json
{
  "source": "pixelquest",
  "unit_id": "U0-sonda-rate-limiter-robustness",
  "project": "01_rate_limiter",
  "encounter_id": "encounter-token-bucket-01",
  "game": "PixelDojo Quest",
  "ts": "2026-06-11T12:00:00.000Z",
  "pass": true,
  "metrics": {
    "kind": "pixelquest-token-bucket",
    "target_rate": 1.5,
    "observed_admit_rate": 0.72,
    "max_burst_1s": 2,
    "good_admits": 8,
    "legit_rejected": 0,
    "abusive_admitted": 0,
    "abusive_rejected": 4,
    "heat_peak": 56,
    "overheated": false
  },
  "curriculum_context": {
    "concept": "Token bucket: capacidade, refill e rejeicao 429",
    "mechanic": "Token Bucket",
    "accepted_signal": "trafego legitimo",
    "rejected_trap": "rajada abusiva"
  }
}
```

- **`pixelquest-route-health`** — emitted by `route_health` encounters
  (project `11_load_balancer`, `13_api_gateway_circuit_breaker`):

```json
"metrics": {
  "kind": "pixelquest-route-health",
  "routed": 3,
  "isolated": 2,
  "bad_routes": 0,
  "good_rejected": 0,
  "heat_peak": 0,
  "overheated": false
}
```

- **`pixelquest-policy-gate`** — emitted by `policy_gate` encounters
  (project `07_rest_api_auth`, `09_plugin_system`):

```json
"metrics": {
  "kind": "pixelquest-policy-gate",
  "allowed": 3,
  "denied": 3,
  "policy_leaks": 0,
  "false_denies": 0,
  "heat_peak": 0,
  "overheated": false
}
```

- **`pixelquest-sequence-flow`** — emitted by `sequence_flow` encounters
  (project `01_rate_limiter` Agent Quest, `02_key_value_store`,
  `06_file_upload_pipeline`, `08_event_driven_order_system`,
  `12_distributed_job_scheduler`, `16_mini_message_queue`,
  `17_distributed_config_service`, `18_search_engine`):

```json
"metrics": {
  "kind": "pixelquest-sequence-flow",
  "advanced": 3,
  "held": 2,
  "skipped_required": 0,
  "guards_missed": 0,
  "heat_peak": 0,
  "overheated": false
}
```

### Contract ↔ kind consistency

A unit's `evidence_contract.kind` MUST match the kind of the encounters it
references. `curriculumPack.makeUnit` dispatches the contract by
`encounterKind`; `packValidator.readEvidenceContract` validates each variant;
the runtime `buildEvidence` in each encounter module emits the matching
metrics variant. Adding a new encounter kind requires touching all four (see
`AGENTS.md` conventions).

### Rendering modes

Some encounter kinds project through a dedicated 3D sub-scene when the concept
justifies a perspective view. Today:

- `route_health` encounters render via `CircuitBreakerScene` (mode
  `circuit-breaker`) — a 3D diorama where each check is an orbiting sphere
  (green healthy / red degraded), the current check pulses, and the client
  cube shifts amber→red + shakes as `bad_routes` cascade. The encounter
  state is the truth; the scene is a pure projection (see
  `src/render/app/CircuitBreakerScene.ts`).

The browser appends every record to the `window.__pixelQuestEvidence` array (single typed emitter:
`src/game/evidence/emitter.ts`) and writes each one to console as `EVIDENCE <json>`. The Playwright
smoke run persists the array to `.logs/evidence.ndjson` — the contract input for
`python3 -m learner.gate` (schema: `../EVIDENCE_CONTRACT.md`). The game never appends
`units_log`.
