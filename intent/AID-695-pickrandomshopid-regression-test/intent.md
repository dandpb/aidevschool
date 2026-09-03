# Intent: Permanent regression test for Town.pickRandomShopId (rng discipline + eligibility)

Author: Paperclip AID-695 (follow-up to the AID-694 triage of PR #254; execution ordered via
AID-704/CEO sweep AID-703, assignee FPE) · Change-id: AID-695-pickrandomshopid-regression-test
· Status: accepted (scope and acceptance criteria in the AID-695 issue body; execution
unblocked 2026-09-03 — PRs #255/#256 merged, main `22c5fdd1`)

> One source of truth: the AID-695 issue body. Done = "Teste permanente em
> `engines/miniTown/tests/` cobrindo, sobre a implementação atual: 1. Elegibilidade correta
> (stage `inhabited` + zona `shop`; exclui residential/workspace/estágios intermediários);
> 2. Disciplina de rng: exatamente 1 consumo por chamada quando há loja, 0 quando não há
> (lockstep do stream); 3. Resultado dentro do conjunto elegível." AID-704 adds the
> ~uniform-distribution expectation carried from the AID-694 triage harness.

## Problem

`Town.pickRandomShopId` (`engines/miniTown/src/scene/state.ts:222`) has no direct test. The
AID-694 triage proved behavioral equivalence of the optimized implementation (PR #254,
commit `26590eb8`, now on main `22c5fdd1`) with an ephemeral differential harness — 10k
draws identical to the old implementation, rng lockstep preserved, no-shop → `null`
without consuming rng, ~uniform spread — but none of that is locked in the suite. Any
future edit that silently adds an rng draw, skips the stage check, or biases the index
mapping would land green today.

## Proposed outcome

A new test file in `engines/miniTown/tests/` fails if `pickRandomShopId` ever:
picks a building that is not `inhabited` on a `shop` zone; consumes ≠1 rng draw when a
shop is eligible; consumes ≠0 draws when none is; returns an id outside the eligible set;
or collapses the draw onto a subset of eligible shops (distribution check). The production
file is not touched — test-only change.

## Affected users and systems

`engines/miniTown/` only (Level-0 exploration surface; never writes learner state). No
curriculum, learner substrate, product docs, or other engine surfaces change.

## Constraints

- Test-only (AID-701/AID-704 window rule): nothing outside `engines/miniTown/tests/`
  (+ these `intent/` artifacts) changes; no production-surface edits.
- New test file, no edits to existing tests → no `SDLC-ALLOW-TEST-EDIT` trailer needed
  (guard semantics: added test paths are allowed; only existing-test edits are blocked).
- The private splitmix32 state is not exposed: draw-count discipline must be verified via
  a lockstep twin-town harness, not by poking `#rngState`.
- Deterministic PRNG → statistical assertions must be bounded (4σ multinomial band) so
  the suite can never flake.

## Open questions

None. The eligibility rule, draw discipline, and index mapping are all pinned by the
triage evidence recorded in the AID-694 verdict comment.
