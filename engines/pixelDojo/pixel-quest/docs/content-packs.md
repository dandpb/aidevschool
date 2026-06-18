# PixelDojo Quest content packs

Each content pack is versioned data under `src/content/packs/<pack-id>/`.

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

## Encounter policy

Packs are data only. They do not ship arbitrary JavaScript. If a pack needs a new mechanic, add a typed
definition to `src/content/types.ts`, validation in `src/content/packValidator.ts`, and an approved
factory in `src/game/encounters/registry.ts`.

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
  }
}
```

The browser exposes the last record as `window.__pixelQuestEvidence` and writes it to console as
`EVIDENCE <json>`. A harness or verifier can persist that line to
`learner/evidence/pixelquest.ndjson`. The game never appends `units_log`.
