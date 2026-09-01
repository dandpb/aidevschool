# Plan: <one-line title>

Change-id: <same as intent/spec> · From: intent/<change-id>/spec.md · Status: draft | approved

## Files that change

Real paths, marked (new) where applicable. Include the tests here.

## Order of work

1. <step that can be completed and checked on its own>
2. …

## Risks

What this could break; the riskiest step; alternatives considered and NOT
chosen (one line each).

## Proof

The exact commands and their expected results that demonstrate the change
works — taken from AGENTS.md COMMANDS for the touched engine/surface.
A task is not done until its stated proof passes, with output recorded.

Example:
- `cd engines/pixelDojo && pnpm run test` → all green
- `python3 -m learner.substrate` → validates, views regenerated
- Smoke screenshot matches the approved mock

## Verification split

Who verifies (fresh-context verifier — subagent or reviewer issue) and what
they check the diff against (this plan + the spec).
