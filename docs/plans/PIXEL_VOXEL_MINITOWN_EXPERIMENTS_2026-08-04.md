# Pixel–Voxel and miniTown product experiments

| Field | Value |
| --- | --- |
| Issue | AID-11 |
| Date | 2026-08-04 |
| Status | Experiment design; execution requires CEO approval and an independent analyst |
| Product owner | Founding Product Engineer |
| Decision owner | CEO |
| Analysis owner | A reviewer who did not build either treatment |

## Outcome

Run two small, decision-oriented experiments before expanding any of the three surfaces:

1. compare PixelDojo and VoxelDojo as alternative attempt formats for the same developer concept;
2. compare canonical onboarding with and without a short miniTown orientation.

These are product experiments, not mastery gates. Neither experiment may write canonical learner
state, declare a learner `mastered`, or treat completion, preference, screenshots, or producer
evidence as proof of learning. The shared curriculum and learner substrate remain authoritative.

## Non-negotiable experiment controls

- Preregister the assignment list, prompts, scoring rubric, exclusions, thresholds, and analysis
  script before the first participant starts.
- Capture consent and use pseudonymous experiment IDs. Do not put names, emails, or free-form
  interview text in browser telemetry or evidence envelopes.
- Every participant attempts the same pre-test before seeing a treatment and the same transfer task
  afterward. The transfer task is not rehearsed in either treatment.
- Freeze both treatments after a two-person usability pilot. Critical breakage may be fixed only by
  logging the change and restarting the measured cohort.
- The product engineer may operate sessions but may not score open responses, resolve ambiguous
  exclusions, or make the keep/stop decision. A treatment-blind analyst owns those steps.
- Producer evidence remains raw and append-only. An independent verifier may inspect it, but these
  exploratory results never authorize mastery or mutate `learner/`.

## Minimal implementation and instrumentation work required before first participant

No participant data may be collected until each item below is complete:

- Implement a VoxelDojo token bucket concept encounter with the same objective sequence as
  `token_bucket` in PixelDojo and a cross-engine evidence tag for this experiment.
- Add shared treatment-neutral transfer tasks (immediate + delayed), two versions of the post-test with
  no overlap with either treatment flow, and fixed prompt assets in a reviewed repository location.
- Add experiment control instrumentation fields:
- `experiment_id`.
- `arm_assignment`.
- `treatment_start_timestamp` and `treatment_end_timestamp`.
- `operator_rescue`.
- `pretest_score`, `immediate_transfer_score`, and `delayed_transfer_score`.
- `protocol_version`.
- `exclusion_reason`.
- Add a treatment-blind scoring rubric pipeline and scorer workflow log with independent scorer IDs.
- Add a privacy-safe participant consent UI/flag for non-technical onboarding cohort and for concept transfer
  cohorts.
- Add a manual stop-switch in the session launcher for immediate halt on:
  - learner-state write
  - canonical gate mutation
  - evidence contract violation
  - two-session critical defect threshold

Remaining to close before execution:

- Run the two-person pilot for each experiment and archive the protocol deviation notes.
- Produce frozen treatment commits for pixel/voxel/minitown builds and include their SHAs in the preregistration.
- Publish the analysis codebook and scoring instructions in version control alongside this protocol.

## Experiment 1 — PixelDojo versus VoxelDojo

### Decision and hypothesis

**Decision:** choose the default presentation for a developer-track token-bucket lesson, while
retaining the other engine only where its genre adds measurable learning value.

**Primary hypothesis:** a spatial VoxelDojo treatment improves delayed, novel-scenario transfer
over the PixelDojo rules/action treatment. **Null:** it does not improve transfer enough to justify
another maintained treatment. Preference and visual appeal are diagnostics, never the winner rule.

Token bucket is the bounded comparison concept because it is canonical in
`curriculum/01_rate_limiter/docs/spec.md` and already has a PixelDojo `token_bucket` encounter.
Before recruitment, the VoxelDojo treatment must implement the same capacity/refill/admit/reject
learning objective and satisfy the cross-engine teaching-game contract. This design does not claim
that treatment exists today.

### Participants and assignment

- Recruit 24 developers who can read TypeScript but have not implemented token bucket before.
- Exclude only preregistered cases: prior production implementation of token bucket, inability to
  run the browser treatment, or failure to complete the pre-test. Report every exclusion by reason.
- Stratify by pre-test score (lower/higher) and randomly assign 12 to PixelDojo and 12 to VoxelDojo.
- A two-person usability pilot happens first and is not included in the measured cohort.

### Invariant lesson contract

Both treatments receive the same five-minute concept primer, scenario values, eight-minute attempt
budget, terminology, hint policy, and post-task. They differ only in interaction/presentation:

- **Pixel:** rules/action encounter using the existing `token_bucket` mechanic.
- **Voxel:** spatial simulation of bucket capacity, refill over time, admission, and rejection.

Both emit the shared raw evidence envelope with their own source tag. Neither treatment reveals the
post-test answer, changes curriculum truth, or invokes the mastery gate.

### Measures

| Measure | Definition | Role |
| --- | --- | --- |
| Delayed transfer | Blind rubric score, 0–8, on a novel burst/refill case 48–72 hours later | Primary |
| Immediate transfer | Same rubric scale on a different novel case immediately after treatment | Secondary |
| Misconception rate | Incorrect capacity, refill, or admission rule in explanation | Guardrail |
| Time on task | Treatment start to submitted attempt, capped at 8 minutes | Guardrail |
| Operator rescue | Any treatment-specific procedural intervention | Guardrail |
| Preference | Forced choice plus one reason after both outcomes are captured | Diagnostic only |

The blind rubric awards two points each for capacity bound, elapsed-time refill, admission decision,
and rejection/retry reasoning. Two independent scorers grade all responses; disagreements are
resolved without treatment labels.

### Instrumentation gaps to close before launch

- Add a stable rubric extraction for delayed and immediate transfer to avoid free-text scoring drift.
- Add an independent timer start marker for treatment entry and handoff to post-test so Time on task is
  comparable across engines.
- Ensure all operator interventions are logged as structured events, not chat notes.
- Add audit logging for exclusions with reason codes and timestamp.

### Decision rule

Choose VoxelDojo as the default only if its median delayed-transfer score is at least one rubric
point above PixelDojo, its misconception rate is no worse, and operator rescue is no more than one
participant higher. Choose PixelDojo if VoxelDojo misses any of those conditions. If the delayed
median difference is under one point but each format shows a distinct preregistered subgroup benefit,
run one larger confirmatory experiment; do not maintain both by default from this pilot alone.

Stop a treatment immediately for a false mastery write, canonical learner-state mutation, evidence
contract violation, or a critical defect affecting two measured sessions. A stopped treatment cannot
win on the remaining observations.

## Experiment 2 — miniTown onboarding gate

### Decision and hypothesis

**Decision:** determine whether miniTown earns a place before the canonical IA Prática onboarding,
remains an optional explore link after first value, or freezes as an unproven product surface.

**Primary hypothesis:** a three-minute miniTown orientation increases unaided completion of the first
IA Prática mission without materially delaying first useful outcome. **Null:** it does not.

### Participants and assignment

- Recruit 30 nontechnical adults who have not used AiDevSchool: 15 control, 15 treatment.
- Randomize before the session using a preregistered seed; report assignment and attrition.
- Run a two-person usability pilot first, excluded from the measured cohort.
- **Control:** canonical OS onboarding directly into the first IA Prática mission.
- **Treatment:** the same route preceded by a maximum three-minute miniTown orientation, followed by
  an explicit “Start first mission” handoff. miniTown stays explore-only and writes no learner state.

### Measures

| Measure | Definition | Role |
| --- | --- | --- |
| First-mission completion | Submitted mission attempt without operator rescue in 20 minutes | Primary |
| Time to first value | Start to first independently checkable useful mission output | Co-primary guardrail |
| Orientation comprehension | Correctly identifies attempt, independent check, and meaning of mastery | Secondary |
| Abandonment | No mission attempt submitted within 20 minutes | Guardrail |
| Operator rescue | Any step-by-step navigation help | Guardrail |
| Day-7 review return | Opens and attempts the prompted review within its window | Secondary |

The comprehension check uses three fixed, treatment-neutral questions. The mission's declared
ADR-0004 checklist and independent verifier remain unchanged across arms. miniTown actions, town
state, and time spent are product telemetry only and never learning evidence.

### Instrumentation gaps to close before launch

- Add a non-authoritative miniTown completion marker visible in product analytics only.
- Capture a canonical `handoff_success` signal when leaving miniTown for the first IA Prática mission.
- Add a shared session timeout marker at 20 minutes so abandonment and time-to-value are consistent.
- Add a consent-aware session key and retention policy note for non-technical recruits.

### Decision rule

Promote miniTown before onboarding only if treatment completion is at least control completion plus
two participants (a 13-point absolute lift at this sample size), median time to first value is no
more than two minutes slower, there are zero false mastery events, and operator rescue is no worse.
If it improves comprehension but misses the completion or time rule, place it as an optional link
after the first useful outcome and run a follow-up only if that placement has an owner. Otherwise
freeze expansion and keep canonical onboarding unchanged.

Stop immediately for any learner-state write, false mastery signal, privacy breach, broken handoff
in two sessions, or median treatment delay above five minutes after the first eight measured
treatment sessions.

## Instrumentation and evidence package

Use a separate, non-authoritative experiment log keyed by `experiment_id`; do not add fields to
canonical mastery records. Record only:

```text
experiment_id, protocol_version, arm, timestamps, pretest_score,
attempt_submitted, rubric_scores, operator_rescue, exclusion_reason,
producer_evidence_digest, verifier_receipt_digest
```

The execution package must contain:

- frozen treatment commit SHAs and successful owning-engine checks;
- assignment CSV and preregistered random seed;
- prompt, transfer tasks, rubric, and scorer instructions;
- de-identified observations and append-only producer evidence;
- separate verifier receipts where the mission normally requires them;
- analysis script, result table, protocol deviations, and decision memo.

Keep interview notes outside runtime telemetry under the approved research location. Publish
aggregate results only; suppress quotes or cells that could identify an individual.

## Readiness gates and owners

| Gate | Owner | Required proof |
| --- | --- | --- |
| Product/ethics approval | CEO | Approves concept, sample, privacy, thresholds, and recruitment |
| Pixel treatment | Pixel producer | Engine-local lint, test, typecheck, build, smoke receipts |
| Voxel treatment | Voxel producer | Headless concept tests plus engine-local lint, test, typecheck, build, smoke receipts |
| miniTown treatment | miniTown producer | Engine-local lint, test, typecheck, build, smoke receipts and timed handoff |
| Rubric and analysis | Independent analyst | Treatment-blind scoring exercise and preregistered analysis |
| Learning verdicts | Independent verifier | Separate accepted/rejected receipts; no producer self-verification |

No recruitment starts until the CEO approves this protocol and names the independent analyst. No
roadmap change is made until the analyst posts the aggregate result and the CEO accepts the decision
memo. A green build proves operability only, not learning effectiveness or release readiness.

## Exact preflight checks for execution

Run only from each owning engine:

```bash
cd engines/pixelDojo && pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke
cd engines/voxelDojo && pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke
cd engines/miniTown && pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build && pnpm run smoke
```

For any generated learner projection used during recruitment, validate and regenerate only through
`python3 -m learner.substrate`; never hand-edit the projection.
