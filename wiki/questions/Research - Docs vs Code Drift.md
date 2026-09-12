---
type: synthesis
title: "Research: Docs vs Code Drift"
created: 2026-08-21
updated: 2026-08-21
tags:
  - research
  - docs
  - drift
status: developing
related:
  - "[[Documentation Drift]]"
sources:
  - "[[Local - Docs vs Code Drift Audit 2026-08-21]]"
---

# Research: Docs vs Code Drift

## Overview

An internal audit of `/Users/danielbarreto/Development/aidevschool` found
significant drift between documentation and reality. The most material gaps
are in `docs/VISION.md`, `docs/ESTADO_REAL_2026-08-17.md`,
`docs/CONSOLIDACAO_2026-08-17.md`, `engines/codexdojo-os-prototype/README.md`,
and `engines/pixelDojo/README.md`. Generated files were also out of sync,
and dated snapshots are being read as current state.

## Key Findings

### Product readiness status is described inconsistently

- `docs/VISION.md` says LiteracyDojo is "resolvida para o player" and the
  public URL is verified. The generated readiness matrix marks the same use
  case as `stale` with no tier (Source: [[Local - Docs vs Code Drift Audit
  2026-08-21]]). Confidence: high.
- `docs/product-readiness/README.md` header says "DO NOT EDIT BY HAND" but
  the rendered matrix diverged from the underlying assessment; the correct
  fix is regenerating via the CLI, not manual patching. Confidence: high.

### Concrete factual errors in implementation docs

- `docs/ESTADO_REAL_2026-08-17.md` references a `.env.production` file that
  does not exist; the OS pilot build injects URLs via `package.json`
  scripts. Confidence: high.
- `docs/CONSOLIDACAO_2026-08-17.md` contradicts itself in the same page:
  it says 2 of 18 projects are `implemented`, then that all 18 node-impl
  directories contain finished implementations. The catalog shows only
  projects 01 and 02 as `implemented`. Confidence: high.
- `engines/codexdojo-os-prototype/README.md` says the OS offers "any of the
  16 game packages"; the pilot build bundles only 4 missions. Confidence:
  high.
- `engines/pixelDojo/README.md` says only Game 01 exists on disk, while
  `pixel-quest/README.md` describes a playable game covering 18 curriculum
  projects. Confidence: high.

### Scope and sequence mismatches

- `docs/VISION.md` lists an initial chapter sequence that skips project 04
  (FACTORY FLOOR / task queue). Confidence: medium.
- AI Literacy is described as a separate track outside the numbered
  catalog; it is actually part of the shared catalog as Level 0/00
  (ADR-0005). Confidence: medium.
- `engines/codexdojo-os-prototype/README.md` promises a catalog of 11 apps
  with maturity states; no such catalog exists in `src/data/`. Confidence:
  medium.

### Tooling / onboarding drift

- `docs/handbook/02_onboarding.md` says Python 3.10+; the repo requires
  Python 3.11+. Confidence: high.
- `engines/miniTown/README.md` cites 14 tests; `package.json` now defines
  26. Confidence: medium.

## Key Concepts

- [[Documentation Drift]]: divergence between docs and code/config; common
  shapes include stale status claims, generated files edited by hand, and
  dated snapshots read as current truth.

## Contradictions

- `docs/CONSOLIDACAO_2026-08-17.md` line 31 says 2 of 18 projects are
  `implemented`; line 158 says all 18 are ready. The catalog resolves the
  contradiction in favor of the lower number (Source: [[Local - Docs vs
  Code Drift Audit 2026-08-21]]).
- `engines/pixelDojo/README.md` says only Game 01 exists; the sibling
  `pixel-quest/README.md` says 18 projects are mapped. The latter matches
  `curriculum/catalog.md` and the Playwright evidence directory.

## Open Questions

- Should `docs/ESTADO_REAL_2026-08-17.md` and `docs/CONSOLIDACAO_2026-08-17.md`
  be moved to `docs/archive/` to stop them from being read as current state?
- Should the product-readiness matrix be regenerated in CI instead of left
  as a tracked file, so drift is impossible?
- What is the canonical entry point for `engines/aiDevschoolMvp/`? It has
  no README, only `aidevschool/SKILL.md`.

## Sources

- [[Local - Docs vs Code Drift Audit 2026-08-21]]: internal audit, 2026-08-21
