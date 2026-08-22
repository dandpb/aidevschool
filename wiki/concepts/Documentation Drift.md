---
type: concept
title: "Documentation drift"
created: 2026-08-21
updated: 2026-08-21
tags:
  - research
  - docs
  - drift
status: stable
related:
  - "[[Research - Docs vs Code Drift]]"
sources:
  - "[[Local - Docs vs Code Drift Audit 2026-08-21]]"
---

# Documentation drift

Documentation drift is the divergence between a written description of a
system and the actual code, configuration, or runtime behavior. It is
especially common in repos where generated matrices, roadmaps, or status
reports are treated as hand-written truth.

## Common shapes in this repo

- **Status claims** in markdown ("implemented", "resolvido", "pronto")
  becoming stale as code changes.
- **Generated files edited by hand** (e.g., `docs/product-readiness/README.md`
  says "DO NOT EDIT BY HAND" but gets out of sync with its canonical
  sources).
- **Dated snapshots** (`docs/ESTADO_REAL_...`, `docs/CONSOLIDACAO_...`)
  presented as current state instead of historical record.
- **Command/path references** that no longer exist.
- **Scope promises** ("16 game packages", "11 apps") that outpace
  implementation.

## Mitigation observed

- `docs/product-readiness/` already has a generated matrix + freshness
  policy; the fix is to trust the generator, not the rendered file.
- `curriculum/catalog.md` is the source of truth for project status
  (`implemented` vs `scaffolded`).
- `docs/DOCUMENTATION.md` warns against treating dated analyses as
  operational truth — but this rule is itself violated by the dated files
  above.

## Application to aidevschool

The audit surfaced ~20 drift items. High-severity ones can mislead a
reader about product readiness, the number of implemented projects, the
scope of the OS pilot build, and the existence of config files. See
[[Local - Docs vs Code Drift Audit 2026-08-21]] for the full list.
