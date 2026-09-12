---
version: alpha
name: voxelDojo — shared game HUD
description: The catalog-wide 3D teaching-simulation workspace (18 game-* packages). One shared HUD language on a deep-space canvas with soft-blue text, cyan interaction, amber status, and an 8-color station palette (shared/palette.ts) that identifies entities across scene and HUD.
colors:
  canvas: "#0b0e14"
  hud-panel: "#0d1119"
  button-bg: "#1a2030"
  text-primary: "#e6e9f2"
  text-muted: "#aab3cc"
  text-rule: "#7f8ab0"
  border: "#3d4663"
  interactive: "#4fc3f7"
  status: "#ffd54f"
  station-1: "#4fc3f7"
  station-2: "#ffb74d"
  station-3: "#aed581"
  station-4: "#f06292"
  station-5: "#ba68c8"
  station-6: "#ffd54f"
  station-7: "#80cbc4"
  station-8: "#e0e0e0"
typography:
  body-md:
    fontFamily: system-ui
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  metrics:
    fontFamily: ui-monospace
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: 6px
spacing:
  sm: 8px
  md: 16px
components:
  hud-rail:
    backgroundColor: "{colors.hud-panel}"
    textColor: "{colors.text-primary}"
    borderColor: "{colors.border}"
  action-button:
    backgroundColor: "{colors.button-bg}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    borderColor: "{colors.border}"
  action-button-hover:
    borderColor: "{colors.interactive}"
  incoming-signal:
    backgroundColor: "{colors.hud-panel}"
    textColor: "{colors.interactive}"
  status-line:
    backgroundColor: "{colors.hud-panel}"
    textColor: "{colors.status}"
---

# voxelDojo — shared game HUD

## Overview

The 3D teaching-simulation catalog: 18 uniform `game-*` packages sharing one
HUD contract (inline styles in each `index.html`, palette from
`shared/palette.ts`). Deep-space canvas, quiet slate HUD rail on the side,
cyan for what you can act on, amber for what the simulation is telling you.

## Colors

- **Canvas** (`#0b0e14`): the space every scene floats in.
- **HUD neutrals** (`#0d1119` panel, `#1a2030` buttons, `#3d4663` borders, text `#e6e9f2`/`#aab3cc`/`#7f8ab0`): one quiet slate ladder — the HUD must never outshine the scene.
- **Interactive cyan** (`#4fc3f7`): hover borders, incoming signals. The "you can act" color.
- **Status amber** (`#ffd54f`): simulation status lines ("Pronto para iniciar").
- **Station palette** (8 colors, `shared/palette.ts`): entity identity — same color in the 3D scene AND the HUD swatch (`colorFor(stationId)` is deterministic). Never reordered casually; the mapping is identity.

## Typography

system-ui for prose; ui-monospace 11px for metrics (`.metrics`) — numbers read as telemetry.

## Layout

Flex row: full-height scene + fixed 340px HUD rail (`border-left`).

## Elevation & Depth

None in the HUD (borders only); the 3D scene carries all depth.

## Shapes

6px button radius; everything else follows the scene's geometry.

## Components

Buttons dark + slate border, cyan border on hover; status lines amber;
swatch rows pair the station color with its id and count.

## Do's and Don'ts

- Do keep the HUD quieter than the scene — it's instrumentation, not the show.
- Don't reorder or restyle `PALETTE` in `shared/palette.ts` — identity mapping.
- Do reuse the same station color in scene and HUD swatch.
- Don't introduce per-game HUD palettes; the catalog shares one language
  (game-10-hash-ring is the reference).
- When a game needs WebGL-fallback (accessible projection), keep the same HUD tokens.
