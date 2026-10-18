# Intent: reconcile four Dev journey catalog divergences

Change-id: 2026-10-15-gh-375-catalog · Status: accepted

## Origin and owner acceptance

Issue: https://github.com/dandpb/aidevschool/issues/375 (Wave 1 AID-1633).
The repository owner supplied the implementation plan in this Codex session on
2026-10-15: “Resolva a issue #375 […] valide localmente e abra um Pull Request
para a `main`.” That request accepts the intent/spec below and explicitly
authorizes the two existing test assertion updates and substrate regeneration,
including `SDLC-ALLOW-TEST-EDIT: GH-375` and
`SDLC-ALLOW-DERIVED-EDIT: GH-375`. This authorization is scoped to this task.

## Problem and outcome

The catalog understates the Node implementations of Projects 05, 12, and 18;
Project 02 reports obsolete Node test/coverage numbers. Their local status files
still describe removed Go/Rust implementations as present. Reconcile these
claims with the dated Wave 1 evidence and removal commit `1b0a309`, then
regenerate consumers and open a PR to main.

## Scope and constraints

Shared curriculum, learner projections, codexDojo dashboard, and OS snapshot.
Preserve `phase: cycle-complete` and existing spec/benchmark caveats. Historical
test results remain pinned to `2026-09-13 @ 05fca349`; implementation status must
not grant learner mastery. Preserve the original checkout's unrelated changes
by working separately from `origin/main` (`304456dd`). No implementation fixes,
other project reconciliations, readiness re-grants, or merge are requested.

## Open questions

None: the owner selected partial Node-only status and the exact historical
evidence. Current implementation results, if rerun, are reported separately.
