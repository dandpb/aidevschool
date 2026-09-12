---
version: alpha
name: AI DevSchool — design systems map
description: Root index for the ecosystem — every frontend engine owns a DESIGN.md codifying its real visual identity. The Airtable reference analysis (getdesign) lives at docs/design/reference/airtable.DESIGN.md.
---

# AI DevSchool — Design systems map

One learner, one curriculum, many engines — and each engine has its own visual
identity. There is no single ecosystem-wide palette; forcing one would erase
the deliberate per-engine personalities (see AGENTS.md "Conventions").

Each engine's DESIGN.md **codifies the existing implementation** — it is
derived from real CSS/scene values, never invented. Update it when the design
changes; it is the contract agents read before any UI work in that engine.

## Where each DESIGN.md lives

| Engine | File | Identity |
| --- | --- | --- |
| codexDojo (dashboard) | `engines/codexDojo/DESIGN.md` | Warm developer ops console: brass-lit workbench, dark canvas, instructional density |
| codexdojo-os-prototype | `engines/codexdojo-os-prototype/DESIGN.md` | Educational Linux workstation at night: deep navy windows, coral/violet/cyan signals, live app windows |
| literacyDojo | `engines/literacyDojo/DESIGN.md` | Warm friendly learning: paper bg, violet primary, mint/sun/coral pastels, chunky radii + playful shadows |
| miniTown | `engines/miniTown/DESIGN.md` | Canvas-based cozy night town — palette inline in scene code; DESIGN.md is its registry |
| dojoToday | `engines/dojoToday/DESIGN.md` | Soft cream daily-lesson cards, indigo primary, amber/success/trap semantics, 22px radius |
| pixelDojo | `engines/pixelDojo/pixel-quest/DESIGN.md` | Arcade lab terminal: 8-bit HUD, amber gates, cyan review signals (light/dark token table inside) |
| voxelDojo | `engines/voxelDojo/DESIGN.md` | Catalog-wide shared game HUD: space canvas, slate rail, cyan interactive, amber status, 8-color station identity palette (visual authority: `docs/3d-style.md`) |

## Shared rules (all engines)

- Tokens are derived from each engine's real `:root` CSS variables / scene
  constants — never invented. The older docs use Role/Token/Value tables; the
  newer ones add Stitch-spec YAML front matter (both are valid; see the
  `design-md` skill for the spec and the `@google/design.md` linter).
- WCAG AA (4.5:1) is enforced by prior audits (AID-914/AID-1023/W0,
  AID-1027/W1, AID-1089); in-file audit comments in styles.css stay
  authoritative.
- The Airtable analysis installed via getdesign
  (`docs/design/reference/airtable.DESIGN.md`) is a REFERENCE for
  marketing-style pages, not a system to apply to the engines.

## Do's and Don'ts

- Do read the engine's own DESIGN.md before any UI work in that engine.
- Don't copy tokens across engines; each identity is deliberate.
- Don't restyle an engine to match another without an explicit product decision.
