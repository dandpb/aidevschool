# Founding Engineer Interview Kit (AID-3)

Version: 1.0
Date: 2026-08-04
Status: Draft for operational use
Owner: CEO
Reviewer: Independent hiring reviewer (external to interviewer)

## Purpose

This kit standardizes the founding-engineer interview from initial screen through a paid work sample and learning-integrity review. It is designed to preserve AiDevSchool’s "one learner, one curriculum, many engines" model and the producer-vs-verifier learning contract.

## Candidate communications

- Publish compensation and work arrangement before any recruiting outreach.
- Use the same scorecard and prompts for every candidate.
- State that the work sample is paid and non-speculative.
- Provide apply-anyway and accommodation options.
- Confirm remote accessibility and candidate support options before the work sample.

## Interview stages (one fixed flow)

1. CEO screen (30 minutes)
   - 30-minute structured conversation on motivation, tradeoffs, constraints, and communication.
2. Technical/product deep dive (60 minutes)
   - Candidate explains a shipped system and a real production tradeoff, including what they owned.
3. Paid repository work sample (2-4 hours)
   - Candidate receives this challenge and works from a clean checkout.
4. Learning-integrity review (45 minutes)
   - Candidate explains evidence boundaries, accessibility choices, and privacy implications.
5. References and close
   - Two references plus role alignment discussion.

## Stage 3 work sample: repository constraint pack

Candidate receives a 2-4 hour scoped ticket prepared by CEO/reviewer from the current backlog.

### Candidate instructions

- Start from clean checkout:
  - Clone from the official repo
  - Create a branch named `<last-name>-founding-sample-<date>`
  - Do not push before debrief
- All changes must stay inside the approved surface chosen by interviewer.
- Candidate must keep changes narrowly scoped and revert any unrelated edits.
- Evidence required in PR description:
  - command log
  - files changed
  - what was validated
  - what was deferred
  - risk log with one rollback strategy

### Minimum required validation commands (all candidates)

Use the baseline list for all candidates, plus a scoped surface matrix.

- Baseline for all candidates:
  - `git status --short`
  - `git rev-parse --short HEAD`
  - `git diff --stat`
  - `git status --short` and `git diff --stat` must be attached to notes with timestamps.

- Stage-3 validation profile:

  | Candidate surface selected by interviewer | Required validation set (minimum) | Optional cross-surface validation |
  | --- | --- | --- |
  | `engines/codexDojo` | `cd engines/codexDojo && pnpm run lint && pnpm run test && pnpm run build` | `pnpm run test` in neighboring app only if state/contracts were touched |
  | `engines/codexdojo-os-prototype` | `cd engines/codexdojo-os-prototype && npm run lint && npm run test && npm run build && npm run test:smoke` | Smoke tests in other OS surfaces only if behavior was shared |
  | `engines/literacyDojo` | `cd engines/literacyDojo && npm run gen:content && npm run lint && npm run test && npm run build && npm run test:e2e` | Add `evidence.json`/`evidence.ndjson` path checks only for evidence-path changes |
  | `engines/miniTown` | `cd engines/miniTown && pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke` | Full repo commands only if changes affect shared curriculum/learner wiring |
  | `engines/pixelDojo` | `cd engines/pixelDojo && pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke` | App smoke/e2e only if UI behavior changed |
  | `engines/voxelDojo` | `cd engines/voxelDojo && pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke` | Full game matrix only if shared content/surface contracts were changed |
  | `learner/substrate` focused change | `python3 -m learner.substrate` | Full root make suite only if contract behavior changed significantly |

### Stage 3 required behavior

- If no UI surface changed, candidates may mark accessibility verification as “UI-not-changed; provide impact statement”.
- If UI changed, run at least one concrete keyboard, label/role, and focus-flow check on modified controls.
- If candidate changes cross-surface dependencies, add the corresponding optional validation command set from the matrix.

### Legacy engine matrix (for reference)

- Clean-start verification:
  - `git status --short`
  - `git rev-parse --short HEAD`
  - `git diff --stat`
- Lint/build/smoke (choose matching surface):
  - `cd engines/codexDojo && pnpm run lint`
  - `cd engines/codexDojo && pnpm run test`
  - `cd engines/codexDojo && pnpm run build`
  - `cd engines/codexdojo-os-prototype && npm run lint`
  - `cd engines/literacyDojo && npm run lint`
  - `cd engines/miniTown && pnpm run lint`
  - `cd engines/pixelDojo && pnpm run lint`
  - `cd engines/voxelDojo && pnpm run lint`
- If a candidate touches learner-substrate contracts:
  - `python3 -m learner.substrate`
- If a change touches evidence flow:
  - run the relevant surface smoke command for that surface and attach the evidence artifact path.

### Required pass behavior for the sample

The work sample must demonstrate at least one of:

- A candidate-facing improvement that does not weaken mastery integrity.
- A measurable reduction in ambiguity in one learner loop path.
- A clean accessibility improvement for the changed UI/state path.

Candidate must not:

- Add speculative production tasks.
- Modify secrets, deployment credentials, or branch protection settings.
- Mark learning outcomes as mastered from local/manual checks only.

## Category scoring rubric (1–4 anchors)

Score each category with written evidence and use all weights below.

### Product shipping and learner empathy (25%)
- 1: Output is technically shallow or disconnected from learner outcomes.
- 2: Partial solution; learner impact is implied but not demonstrated.
- 3: Delivers a complete mini-slice with clear user-facing learner value and rationale.
- 4: Completes a usable learner loop improvement with evidence of iterative testing and impact.

### Full-stack implementation depth (25%)
- 1: Only superficial edits with no coherent integration path.
- 2: Patch works in isolation but ignores at least one layer (state, test, or deployment).
- 3: Integrates at least two layers (UI/state or state/service/test) with minimal debt.
- 4: Integrates multiple layers with strong correctness and predictable failure handling.

### Systems simplification and repository judgment (20%)
- 1: Adds complexity or duplicates logic.
- 2: Fixes one issue but introduces avoidable coupling.
- 3: Chooses a pragmatic simplification and avoids at least one anti-pattern.
- 4: Clarifies architectural boundary and reduces future maintenance cost without scope creep.

### Evidence and verification integrity (15%)
- 1: Uses only self-report or manual assumptions.
- 2: Adds tests but skips verifier-facing or contract-aware checks.
- 3: Includes reproducible checks and a clear evidence trail.
- 4: Explicitly preserves producer-vs-verifier boundaries and independently verifiable gate behavior.

### Communication and founding-team collaboration (15%)
- 1: Hard to understand, defensive, or incomplete handoff.
- 2: Clear explanation but unclear on assumptions and risks.
- 3: Clear tradeoff communication with structured updates.
- 4: Excellent, concise updates and thoughtful risk-aware collaboration pattern.

Passing threshold rule:
- No category below 2
- Weighted average 3.0+
- No single unresolved learner-integrity concern.

## Repository and mastery contract checklist

- Does the candidate acknowledge `one learner`, `one curriculum`, `many engines` constraints?
- Did candidate preserve attempt-first behavior?
- Did candidate keep producer and verifier responsibilities separate?
- Could mastery be awarded without independently verified evidence in the candidate change set?
- Did candidate avoid direct edits to generated/derived projections unless explicitly requested?
- Did candidate preserve existing evidence IDs, schema boundaries, and append-only records?

## Accessibility equivalence (required review item)

- Verify keyboard navigation of the changed screen path.
- Confirm labels/roles for every new control/state.
- Confirm text contrast and focus visibility in the modified area.
- Confirm time limits and motion cues are not reduced without alternatives.
- Add/confirm `aria-live` announcements for state/result changes where needed.
- If non-compliant, candidate must propose mitigations in retrospective.

## Interviewer prompts (starter pack)

- "Walk me through the one biggest tradeoff in your implementation."
- "Where is the verifiable evidence contract in your change? What changes, if any, to contract semantics did you avoid?"
- "What made your accessibility checks insufficiently complete?"
- "If you had 24 hours more, what would you ship next?"

## Independent reviewer checklist

- Validate paid-sample fairness and timing.
- Confirm scorecard weights and anchors were applied consistently.
- Confirm compensation disclosure and accommodation notes were delivered.
- Confirm candidate did not bypass evidence integrity.
- Confirm at least one concrete validation artifact is present for changed code.

### Interviewer scoring template (copy into issue thread)

```text
Candidate:
Reviewer:
Date:
Date/issue:

Scorecard:
- Product shipping and learner empathy (25%): [1-4]
  Evidence:
- Full-stack implementation depth (25%): [1-4]
  Evidence:
- Systems simplification and repository judgment (20%): [1-4]
  Evidence:
- Evidence and verification integrity (15%): [1-4]
  Evidence:
- Communication and founding-team collaboration (15%): [1-4]
  Evidence:

No category below 2: [yes/no]
Unresolved learner-integrity concern: [yes/no + description]
Weighted average: [__]
Final decision: [advance/hold/reject]
Top follow-up risks:
1)
2)
3)

Next-owner and due date:
```

## Debrief rules

- Interviewers must submit written scoring before candidate conversation.
- Debrief must call out required follow-up risks.
- No offer recommendation without independent reviewer confirmation.

## Recordkeeping

- Save candidate scorecard, command log, and evidence artifacts in the issue thread.
- Keep any generated evidence files (`evidence.json`, `evidence.ndjson`, screenshots) for audit if used in the sample.

## Additional productivity addendum

### Candidate command-log starter (copy/paste)

```text
Repo + branch:
Candidate:
Surface:
Ticket/Issue:

Validation batches:
- command:
- exit code:
- duration:
- output path:

- command:
- exit code:
- duration:
- output path:

Deferred / follow-up:
Rollback plan:
```

### Reviewer throughput guardrail

- Max reviewer interpretation time before debrief: **30 minutes** after command review.
- If this threshold is exceeded, pause the candidate cycle and request only the missing concrete evidence.
- Debrief scorecards should remain compact: one evidence line per category, no unresolved category-level questions.

### Reviewer command-audit rule

- Attach command output or artifact path for every required command in the Stage-3 profile.
- For any candidate who changed UI controls, include concrete keyboard/label/focus evidence in notes.
- For non-UI changes, include an explicit accessibility impact statement and mark the UI check as not applicable.
