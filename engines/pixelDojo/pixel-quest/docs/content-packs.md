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

Encounters emit raw evidence only:

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
  "review_context": {
    "unit_kind": "concept",
    "scheduled_review": true,
    "review_reason": "due",
    "streak_candidate": true,
    "scheduler_source": "learner-substrate",
    "verifier_required": true
  },
  "curriculum_context": {
    "concept": "Token bucket: capacidade, refill e rejeicao 429",
    "mechanic": "Token Bucket",
    "accepted_signal": "trafego legitimo",
    "rejected_trap": "rajada abusiva"
  }
}
```

The browser exposes the last record as `window.__pixelQuestEvidence` and writes it to console as
`EVIDENCE <json>`. A harness or verifier can persist that line to
`learner/evidence/pixelquest.ndjson`. The game never appends `units_log`.
