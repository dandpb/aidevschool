# Canonical learner journey and evidence protocol

| Field | Contract |
| --- | --- |
| Status | Cross-engine product baseline |
| Current conformance | Partial; the known gaps below block a cross-engine conformance claim |
| Journey host | `engines/codexdojo-os-prototype/` |
| Canonical progress authority | `learner/learning_state.yaml`, written only through `learner/substrate/` |
| Applies to | IA Prática and Trilha Dev assessed missions |
| Excludes | miniTown exploration and engine-local engagement state |

## Outcome

Every assessed mission follows one inspectable sequence:

> orient → attempt → feedback → optional hint → retry → raw evidence → independent verification → local result → optional canonical gate

The sequence is canonical even when an engine supplies the activity. Engines may
use different evidence schemas, but they may not collapse local completion,
verification, and mastery into one state.

## State and authority

| Stage | Learner-visible outcome | Owning authority | Must not imply |
| --- | --- | --- | --- |
| Orient | Objective, data boundary, and success criteria are clear | Host plus canonical curriculum | An attempt or completion |
| Attempt | Learner makes an assessable action before a complete solution | Activity engine | Correctness, verification, or mastery |
| Feedback | Deterministic criteria say what passed and what to improve | Activity engine | Independent acceptance |
| Hint and retry | A progressive hint preserves learner reasoning; retry is a new attempt | Activity engine | That a hinted answer is learner evidence |
| Raw evidence | A schema-valid, identity-bound record describes the evaluated attempt | Producer engine | PASS or canonical progress |
| Verification | A separate verifier returns PASS or FAIL for the exact evidence digest | `learner/gate/` verifier selected by closed schema mapping | Mastery by itself |
| Local result | UI distinguishes local completion, evidence, receipt, and canonical state | Journey host | A canonical write |
| Canonical gate | An accepted receipt may support an atomic state transition | `learner/substrate/gate.py` | That every PASS must become `mastered` |

Engine-local XP, streaks, checkpoints, recommendations, and `completed` values
remain continuity signals. They are never inputs that can independently promote
canonical learner state.

## Evidence envelope requirements

Raw evidence accepted for verification must bind:

- evidence schema and schema version;
- track, mission, activity, and canonical content version;
- attempt identity and evaluation timestamp;
- the activity-specific structured observations or checks;
- producer identity; and
- a deterministic digest calculated at the learner-owned verification boundary.

Free-text answers, prompts, names, email addresses, and analytics identifiers are
excluded unless an activity-specific canonical contract explicitly requires and
protects them. Analytics never substitutes for evidence.

The verifier receipt must bind the evidence digest, verifier identity and
version, PASS or FAIL decision, decision timestamp, and reason codes. A consumer
must reject a receipt that is malformed, stale for the activity contract,
producer-authored, or mismatched on any bound identity.

## Protocol rules

1. **Attempt before solution.** Feedback, hints, evidence, and receipts require a
   recorded attempt. A hint may guide the next action but must not reveal the
   complete solution before that attempt.
2. **Producer is not verifier.** The browser activity emits raw evidence only.
   Browser input cannot choose an executable, verifier, canonical path, or PASS.
3. **Failure stays explicit.** Invalid evidence returns a validation failure;
   verifier rejection returns FAIL; transport failure is unavailable/retryable.
   None may degrade to PASS.
4. **Receipts are immutable facts.** A retry creates a new attempt and evidence
   identity. It never mutates a prior receipt.
5. **Canonical writes are gated.** Only the substrate's gate operation may
   persist a mastery transition, after rechecking the independently produced
   receipt and evidence digest.
6. **Read models stay read-only.** Engine projections and `.mavis/` are generated
   from canonical state and are never hand-edited or reverse-synchronized.

## Track adapters

| Track | Producer evidence contract | Independent verifier | Canonical gate eligibility |
| --- | --- | --- | --- |
| IA Prática | `LiteracyEvidenceRecord` from canonical AI Literacy content | `learner/gate/literacy_verifier.py` through the fixed literacy bridge | Only when the declared literacy gate and receipt policy permit it; app completion alone is ineligible |
| Trilha Dev teaching mission | Closed teaching-game envelope and raw observation trace | Fixed game verifier through `learner/gate/teaching_game_bridge.py` | Only independently accepted executable/game evidence is eligible |
| Programming project | Attempt plus project-declared executable artifacts | Project-independent verifier using the declared empirical gate | Only accepted gate-appropriate evidence is eligible |

Context-specific contracts win for schemas and activity checks. This baseline
wins for ordering, separation of authorities, failure semantics, and learner-
visible state distinctions.

## Current conformance and migration gaps

This document is the normative target, not a claim that every current adapter
already conforms. As of 2026-08-04:

| Gap | Current implementation | Required owner/action before conformance |
| --- | --- | --- |
| Teaching-game raw identity | The current envelope uses `source` but does not bind an explicit track, raw schema version, canonical content version, and producer identity as separate fields | Teaching-evidence owner versions the envelope and bridge validation, then migrates producers and fixtures |
| Generic verifier receipt metadata | `learner/gate/verifier_receipt.py` does not bind verifier version, decision timestamp, or reason codes | Learner-gate owner versions the receipt schema and validates all bound fields |
| Literacy receipt metadata | `learner/gate/literacy_verifier.py` does not yet bind verifier version and decision timestamp | Literacy verifier owner extends the receipt and mismatch tests |
| Cross-engine acceptance evidence | Existing engine tests cover parts of the journey, but no single recorded run proves every check below across both tracks | Journey-host owner records the bounded suites; an independent reviewer accepts or rejects the evidence |

Until these gaps are closed, surfaces may cite the lifecycle and their existing
bounded-context contracts, but must not advertise conformance with this complete
protocol. Closing a gap requires backward-compatibility or an explicit version
migration; silently reinterpreting stored evidence or receipts is forbidden.

## Minimum acceptance protocol

An assessed journey is conformant only when executable checks demonstrate:

1. no feedback, evidence, or receipt exists before an attempt;
2. a failed attempt yields specific feedback, a hint does not reveal the complete
   solution, and retry records a new attempt identity without changing prior evidence or receipts;
3. raw evidence validates, rejects disallowed free-text or identity fields, and
   changing any bound field changes or invalidates its digest;
4. producer-controlled input cannot choose a verifier, executable, arguments,
   or canonical path;
5. PASS and FAIL are produced outside the producer, and mismatched receipts are rejected;
6. accepted receipts require the bound digest, verifier identity and version,
   decision timestamp, decision, and reason codes;
7. verifier outage is visible and retryable without fabricating acceptance;
8. the result UI labels local completion, independent verification, and mastery separately;
9. reload preserves allowed local continuity without fabricating a receipt or canonical write; and
10. substrate validation rejects an unsupported mastery transition and preserves generated projection parity.

The producer records the commands and artifacts. A different reviewer must
accept the evidence boundary before a release or mastery claim is completion-
sensitive.

The moderated, consent-safe execution procedure, scorecard, thresholds, fixture
dry-run, and recruitment handoff are defined in the [canonical learner pilot
protocol](canonical-learner-pilot/README.md).

## Canonical references

- [Micro-lesson lifecycle](micro-lesson-contract.md)
- [AI Literacy evidence contract](ai-literacy/evidence-contract.md)
- [Teaching-game evidence contract](teaching-game-contract.md)
- [Learner substrate interface](../../learner/substrate/interface.md)
- [Canonical OS engine guide](../handbook/03b_engine_codexdojo-os-prototype.md)
- [Ecosystem manifest](../../engines/codexDojo/ecosystem/MANIFEST.md)
