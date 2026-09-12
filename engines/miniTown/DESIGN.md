---
version: alpha
name: miniTown — cozy night town
description: Cozy, explore-only Level 0 entry surface — a calm 3D town at dusk. Deep indigo night sky, warm window glows, soft pastel buildings and green ground. No HUD chrome beyond a translucent dark panel; the scene IS the interface.
colors:
  night-sky: "#0d1424"
  night-mid: "#1a2238"
  night-glow: "#3d4663"
  dusk-blue: "#5d6b88"
  sky-light: "#a3d0e8"
  sky-pale: "#c0d5e0"
  sky-horizon: "#cfe6f0"
  window-warm: "#ffb074"
  window-lit: "#fff4d6"
  ground-green: "#6f9663"
  tree-green: "#7fa572"
  hud-bg: "#11110f"
  hud-overlay: "#0b0e14"
  hud-text: "#e6e9f2"
  building-sand: "#c8b89a"
  building-terracotta: "#a04030"
typography:
  hud-label:
    fontFamily: system-ui
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  md: 10px
  full: 9999px
components:
  hud-panel:
    backgroundColor: "{colors.hud-overlay}"
    textColor: "{colors.hud-text}"
    rounded: "{rounded.md}"
    padding: 12px
---

# miniTown — cozy night town

## Overview

Level 0 entry surface for nontechnical audiences: a cozy town at dusk you
wander and observe. Nothing to fail, nothing to configure. The 3D scene is the
entire experience; UI chrome is one translucent HUD panel. Colors live inline
in the scene code (`src/scene/dayNight.ts`, `ground.ts`, `main.ts`) — this
document is their registry so future overlays stay in palette.

## Colors

- **Night ladder** (`#0d1424` → `#1a2238` → `#3d4663` → `#5d6b88`): the dusk sky gradient; the deepest tone is up, the lightest at the horizon.
- **Sky pastels** (`#a3d0e8`/`#c0d5e0`/`#cfe6f0`): horizon haze layers.
- **Warm lights** (`#ffb074` windows, `#fff4d6` lit interiors): the emotional core — tiny warm glows against the cool night. Use warm-on-cool contrast, never large warm areas.
- **Greens** (`#6f9663` ground, `#7fa572` trees): muted, natural, never saturated.
- **Buildings** (`#c8b89a` sand, `#a04030` terracotta): soft village palette.
- **HUD** (`rgba(11,14,20,0.7)` bg, `#e6e9f2` text): the only DOM chrome.

## Typography

HUD labels only — system-ui 14px, quiet.

## Layout

Full-viewport canvas; HUD panel overlaid, translucent, rounded 10px.

## Elevation & Depth

Atmospheric: fog + the day/night cycle carry depth. No CSS shadows in-scene.

## Shapes

Soft 10px on HUD chrome; the world itself is geometry, not corners.

## Do's and Don'ts

- Do keep the scene cool-dominant with warm accents (windows, lamps) — that inversion is the coziness.
- Don't add bright saturated UI colors; overlays inherit the HUD dark glass.
- Do update this file when scene palettes change — it is the registry.
- Don't build complex menus; miniTown never writes learner state (AD-004).
