# voxelDojo — 3D style guide

One page so games 01–18 stay visually coherent. Written during HASH RING M2; evolve it with each
game, don't fork it per game.

## Principles

- **One hero object per game.** The concept lives in a single dominant structure (the ring, the
  grid, the delta). Everything else is supporting cast — if a prop doesn't explain the concept,
  delete it.
- **Procedural geometry only.** Three.js primitives (`Icosahedron`, `Box`, `Torus`, `Octahedron`,
  `Cylinder`) with `flatShading: true`. No GLTF imports, no model marketplaces, no textures in MVP.
- **State is color + scale, not particle effects.** Ownership = hue; load/heat = emissive intensity
  and scale; membership changes = position. If a learner can't read the sim state from a
  screenshot, the scene failed.
- **`InstancedMesh` above ~100 entities**, one draw call for the swarm (keys, requests, logs).
  Budget: 60 fps with 500 animated instances on an integrated GPU, no postprocessing.

## Palette

Background `#0b0e14` (near-black blue), fog to the same color (`THREE.Fog`, start ≈ 24, far ≈ 60).
Structure/chrome `#3d4663`. Text `#e6e9f2`, muted `#aab3cc`, alert `#ffd54f`.

Entity ownership colors, in assignment order (max 8 owners on screen):
`#4fc3f7` `#ffb74d` `#aed581` `#f06292` `#ba68c8` `#ffd54f` `#80cbc4` `#e0e0e0`

## Camera & lighting

`PerspectiveCamera` fov 50 + `OrbitControls` with damping; clamp distance so the hero object can
never leave frame (min ≈ 8, max ≈ 60). Tilt the hero structure ~30° so depth is visible from spawn.
Lighting is exactly two lights: `AmbientLight` (~0.7) + one `DirectionalLight` (~1.2) from above.
No shadows in MVP.

## HUD

DOM overlay (not in-canvas text): monospace font, dark panel, `data-testid` on every interactive
element (the Playwright smoke depends on it). The HUD shows: level title, the one-sentence lesson,
the pass rule, phase status, and last-wave metrics verbatim (the same values the evidence record
carries — the learner sees exactly what the verifier sees).
