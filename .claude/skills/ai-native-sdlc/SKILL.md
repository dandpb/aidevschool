---
name: ai-native-sdlc
description: >-
  Run every engineering change in this repo through the AI-native SDLC loop
  (intent → spec → plan → build → verify → review → ship → maintain), where each
  stage ends by committing an artifact the next stage reads. Use when starting
  any feature, bugfix, refactor, engine change, curriculum/learner change, or
  when the user says "implement", "fix", "build", "add", "refactor", "follow the
  SDLC playbook", or assigns a development task. Also use when reviewing a diff
  or deciding whether work is done. Not for pure Q&A or read-only exploration.
---

# AI-Native SDLC loop (aidevschool)

Source playbook: https://claude.com/blog/the-ai-native-sdlc-playbook
Local adaptation: `docs/sdlc/README.md` · templates: `docs/sdlc/templates/`

Core idea: **code is no longer the bottleneck — plan, review, and governance
are.** So the loop is artifact-driven: every stage ends by committing a file the
next stage can read, and human/owner attention concentrates at the gates
between stages, not inside them.

```
intent.md → spec.md → plan.md → diff+tests → review (REVIEW.md) → ship → monitor
    ↑__________________________________________________________________________|
```

## When a task arrives (Paperclip issue, user request, incident)

1. Classify the trigger: idea → start at Plan. Incident/monitoring finding →
   write `intent.md` first (Stage 6 feeds Stage 1). Small bounded fix (< ~20
   lines, one engine, no learner/curriculum contract change) → you may collapse
   intent+spec+plan into one short `plan` block inside the task comment, but the
   verify and review stages below are NEVER skipped.
2. Pick the change-id: `YYYY-MM-DD-<slug>` (reuse the Paperclip identifier when
   one exists, e.g. `AID-394-<slug>`).

## Stage 1 — Plan: capture intent

Write `intent/<change-id>/intent.md` from the template. Content: problem,
proposed outcome, affected users/systems (which engines, curriculum, learner),
constraints, open questions. If the Paperclip issue already contains all of
this, link/quote it in the file instead of rewriting — one source of truth.

Gate: owner (user or CEO agent) accepts or rejects the intent.

## Stage 2 — Design: one-pass requirements + spec

Read the accepted `intent.md` plus the repo's living policy — `AGENTS.md`,
root `CLAUDE.md`, the target engine's `AGENTS.md`/`CLAUDE.md`, and
`docs/design/` contracts — then produce `intent/<change-id>/spec.md`:
requirements + design in a single pass, with **flagged concerns** (places where
policies conflict or the design is uncertain). Answer or carry forward every
open question from the intent.

Gate: owner works through flagged concerns, then accepts the spec.

## Stage 3 — Build: plan first, then code

1. Write `intent/<change-id>/plan.md`: files that change (real paths), order of
   work, risks, and the **proof** (the exact commands + expected results that
   will demonstrate the change works — see AGENTS.md COMMANDS for the right
   ones per engine).
2. Interrogate the plan: what could this break? which step is riskiest? what
   did you choose NOT to do? Iterate until an engineer who never saw this
   conversation could implement from the plan alone.
3. Implement. When implementation departs from the plan, update `plan.md` in
   the same change.
4. Institutional knowledge goes in files, not chat: a mistake corrected twice
   becomes a line in `CLAUDE.md`/`AGENTS.md`.

## Stage 4 — Test: the session verifies itself

- **Feedback loop:** run the engine's lint/test/build (from AGENTS.md COMMANDS)
  and paste the real output. A task is not done until its stated proof passes.
- **Bug fixes:** write the failing test first, commit/record it, then make it
  pass WITHOUT editing the test (a hook blocks test-file edits; override only
  with explicit owner approval — see `docs/sdlc/README.md`).
- **Producer ≠ verifier (repo golden rule):** before reporting done, get a
  fresh-context verification (separate subagent/issue) that checks the diff
  against `plan.md` and reports pass/fail with evidence. The producer never
  verifies its own work.
- **Learning-gate rule:** anything touching curriculum/learner keeps
  attempt + independent evidence before `mastered`.

## Stage 5 — Deploy: review then ship

- Run the `/simplify` pass on the diff (repo rule 5), apply recommendations,
  then prepare the commit/PR.
- Every diff gets the `REVIEW.md` passes (correctness vs plan, tests/evidence,
  conventions, security). Findings are advisory: a human/code owner still
  approves merges and any production-facing ship.
- Hooks are the hard gates: protected generated paths are uneditable, tests
  can't be weakened mid-fix, force-push is blocked (`.claude/settings.json`).

## Stage 6 — Maintain: close the loop

- Monitoring results, repeated mistakes, incident findings, and post-mortems
  re-enter the loop as a NEW `intent.md` (never as a drive-by patch).
- When a fix ships for a real incident, add a regression test or checklist
  entry so the same class of failure is caught automatically next time.

## Done-rule (all stages)

A stage is done only when its artifact is committed/recorded where the next
stage reads it: `intent.md` → `spec.md` → `plan.md` → diff+tests+outputs →
review verdict → ship record → new intent. If you cannot name the artifact you
just produced, the stage is not done.
