# Intent: voxelDojo DESIGN.md — traceable hud-panel token + accurate game count

Author: Content Designer (delegação CEO no thread AID-1518, sweep AID-2084) · Change-id: AID-1518-voxeldojo-design-md-tokens · Status: accepted

> Originates from Paperclip issue AID-1518 (child of AID-1517, QA countersign
> pós-fato PR #346). Quoted scope from the CEO dispatch (2026-09-16):
> "corrigir o token `hud-pan*` conforme especificação da QA AID-1517, abrir PR
> pequeno e isolado no repo dandpb/aidevschool, e solicitar validação à QA
> Lead no thread. Escopo: apenas o DESIGN.md do voxelDojo; sem refactors
> adjacentes."

## Problem

Two doc-accuracy defects in `engines/voxelDojo/DESIGN.md` found by QA (AID-1517,
verdict §Alvo 1, merge `0a85deff`), violating the file's own rule that color
tokens derive from "valores reais de CSS/cena — nunca inventado"
(intent/2026-09-12-design-md-ci-lint):

- **D1** — front matter declared `hud-panel: "#0d1119"`; first-hand check:
  `git grep -i '#0d1119' -- engines/voxelDojo` hits only DESIGN.md itself.
  The real rail is transparent in all games (`#hud` sets no background; reference
  package game-10-hash-ring `index.html` lines 13–14), rendering over canvas
  `#0b0e14`. `#101827` (`--vd-surface`) exists in 4/17 games (02, 03, 04, 05)
  and styles `.accessible-projection` (WebGL-fallback panel), not the HUD rail.
- **D2** — description and Overview claimed "18 game-* packages"; actual at the
  audit merge `0a85deff` was 16 dirs, and at this change's base (`fb711de`) it is
  **17** (`game-04-task-queue` landed via 97cc3c6 / AID-1901; `catalog.json`
  also lists 17).

## Proposed outcome

Every color token and count in voxelDojo's DESIGN.md is traceable to real
CSS/scene source at the PR base; `npx -y @google/design.md lint` reports 0
errors; no behavior, gate, or runtime surface changes (doc-only diff).

## Affected users and systems

Engines (voxelDojo DESIGN.md only — consumers of the shared HUD language);
no runtime code, no learner state, no CI config.

## Constraints

- CEO-delegated scope: only `engines/voxelDojo/DESIGN.md` (+ this intent
  record); no adjacent refactors. AGENTS.md "all 16" is now stale too —
  flagged to QA in the issue thread, not edited here.
- Token decision follows QA's primary option (`#0b0e14`, transparent rail),
  not the alternative `#101827` (fallback-projection surface, 4/17 games,
  not the rail).

## Open questions

None — evidence decided both values. Count must be re-checked at QA review
against the PR merge-base (a future `game-*` landing would move it again).
