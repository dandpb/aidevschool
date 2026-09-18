# Literacy free-text verification (judgment-verified prompt_builder)

> Plan this with **tlc-plan** (`.claude/skills/tlc-plan`).
> Decisions below carry the literal shape - copy them, do not re-derive them.

## Situation

- Project: in active construction; literacyDojo (TS) runs the learner's daily practice with client-side rubric feedback
- Decision: **committed** — RFC `docs/design/rfc-literacy-free-text-verification.md` ACCEPTED by the owner (Daniel, 2026-09-17): a typed judgment model may form part of "independently verified" for free-text answers, under code-owned thresholds, owner escalation, and committed receipts. Owner confirmed the shape round 2026-09-18: judgment-only (no deterministic cascade) and CLI + NDJSON escalation
- In flight: PR #494 (metric-rubric-lint) carries the refined `judgments.ask_and_record` + replay seam this work consumes — **merge #494 first**
- At stake: a judgment model enters the verifier path for the first time (the RFC's deliberate golden-rule-2 exception); wrong thresholds pass vacuous text or block good answers — bounded by escalation and receipts

## Problem

Absence. The literacyDojo producer applies the canonical rubric client-side for instant feedback, but the independent verifier (`learner/gate/literacy_evaluator.py:60-63`) raises on `prompt_builder` — free-text evidence can never pass independent verification, so `mastery_eligible` is unreachable for prompt_builder activities. The substitute is nothing: the learner completes the activity in the browser and the evidence record is unverifiable forever.

The canonical rubric already exists and is per-field (`minLength` + `mustIncludeAny` case-insensitive substring — e.g. `l18-biblioteca-de-pedidos.yaml`): keyword matching. Judgment does not invent criteria — it upgrades the same rubric's intent to semantic evaluation, the same substring→semantics lesson the pitfall counter taught (paraphrase passes, keyword-stuffed vacuity fails).

## Evidence

- Rubric shape grounded in schema + real modules (`curriculum/ai-literacy/schemas/lesson.schema.json`, `modules/06-rotina-com-ia/l18-*.yaml`)
- `ACTIVITY_PASS_THRESHOLD = 0.75` already in the evaluator — the RFC's 0.75 pass mark converges with the existing constant
- No prompt_builder evidence on disk: **thresholds cannot be calibrated against real attempts yet** — landed as named constants with a calibrate-on-first-escalations note (the RFC's own caveat), synthetic good/bad answers in tests
- Judgment calibration on this repo's prose: `.design/semantic-substrate-seam.md` (validated separations)

## Journey

Learner answers prompt_builder (free text per field) → literacyDojo emits the evidence record → the independent verifier runs:

- **every field judged ≥ ~0.75 (mean ≥ 0.75)** → verdict `PASS`, `mastery_eligible: true`, judgment receipt committed (digest-named)
- **mean 0.4–0.75** → verdict `ESCALATE`, exit 3, append to the escalations NDJSON with the judgment receipt; owner runs `--resolve <attemptId> --approve|--reject` (manual provenance: who, when)
- **mean < 0.4** → verdict `FAIL`
- **no key / API failure** → fail closed exactly as today (clear error naming `TYPESAFE_API_KEY`); deterministic activity types remain fully offline — only prompt_builder needs judgment
- **re-verification** → replays the committed judgment receipt (same digest) → same verdict; determinism preserved
- **retry after FAIL** → new answer, new digest, fresh judgment

## Verdict

Already committed — see Situation (RFC ACCEPTED 2026-09-17; shape round 2026-09-18).

Cheaper paths considered at RFC time: status-quo fail-closed (free-text literacy permanently unverifiable — rejected by the RFC's YES); human-only review without judgment (no owner bandwidth for every attempt — judgment + escalation band keeps the human where they matter).

## Success

- Worked if: the first real prompt_builder attempt verifies end-to-end — verdict + committed receipt + `mastery_eligible` when mean ≥ 0.75 — and re-verification replays the same verdict - by the first literacy gate cycle after merge
- Early signal: canned good/bad/paraphrase tests green; going wrong looks like judgment passing keyword-stuffed vacuous text or failing clearly-good paraphrases at the first real attempts — recalibrate thresholds then (constants, not schema)
- Review: at the first real escalation (owner sees the queue and the resolution CLI work)

## Boundary

In: the prompt_builder branch of `literacy_evaluator` (judgment via injected client), `literacy_verifier` (ESCALATE verdict, exit codes, `--resolve` CLI, escalations NDJSON), receipts/replay via the substrate judgment seam.
Out: deterministic activity types (unchanged, offline); the canonical rubric YAML (untouched — judgment consumes it read-only); new activity types (fail-closed rule stays). literacyDojo TS: only the `structuredAnswer` whitelist entry for `values` — no other producer change; the evidence schema gains the answer variant (in scope via the transport amendment).

## Shape

The verifier's prompt_builder branch stops raising and asks one Noul per field — state carries the scenario, the generic prompt, the field's label/hint, and the canonical rubric as the statement of intent — then aggregates the mean against code-owned thresholds, with the 0.4–0.75 band escalating to the owner through an append-only NDJSON queue resolved by CLI. Reversing it means restoring one `raise`.

### Adds

- `learner/gate/literacy_judgment.py` — per-field Noul construction from the canonical rubric + answer aggregation (mean, thresholds)
- `ESCALATE` verdict value + exit code 3 in `literacy_verifier`
- `learner/verifier_receipts/literacy-escalations.ndjson` — append-only pending queue (attempt_id, evidence_digest, field Nouls, receipt digest, status open/resolved + manual provenance)
- `--resolve <attemptId> --approve|--reject` CLI on `literacy_verifier`

### Changes

- **Answer transport (tlc-plan grounding amendment)**: the producer strips prompt_builder answers today (`structuredAnswer` in `engines/literacyDojo/src/domain/evidence.ts` whitelists structured shapes only; the schema says "free-text never included") — the free text never reaches the verifier. The evidence schema's `answer` oneOf gains a `{values: {<fieldId>: bounded string}}` variant, the structure validator accepts it, and the TS whitelist emits it. Without this the judgment has nothing to judge; the original "literacyDojo TS untouched" was wrong and is amended here
- `literacy_evaluator._evaluate` prompt_builder branch → judgment path; `recompute_literacy_evidence(..., judgment_client=None)` (injection-only; the verifier entry constructs the client from env)
- `LiteracyVerdict` — gains the judgment receipt digest + escalation fields; for prompt_builder the producer's deterministic claim becomes advisory metadata (the judgment verdict is the independent truth; disagreement is the expected upgrade path, not an error)

### Leaves

- `ACTIVITY_PASS_THRESHOLD = 0.75` (reused as the pass mark); deterministic activity types; the canonical lesson YAML; literacyDojo TS beyond the one whitelist entry

## Roadmap

One block: the judgment-verified prompt_builder path above - clear (backed by Decisions). Blocked on PR #494 (ask_and_record/replay seam).

## Decisions

| Decision | Choice | Why this | Alternative, and what would make it win | Reversibility |
|---|---|---|---|---|
| Verification semantics | judgment-only: one Noul per field against the rubric's intent; `score = mean(field Nouls)` | paraphrase-proof, catches keyword-stuffed vacuity — the substring lesson at scale | deterministic cascade (minLength floor before judgment) - two provenance layers for cases the judgment already catches | reversible |
| Thresholds | pass ≥ 0.75 (= `ACTIVITY_PASS_THRESHOLD`), escalate 0.4–0.75, fail < 0.4 — named constants in `literacy_judgment.py` | converges with the existing constant; RFC's starting numbers; uncalibratable until real attempts exist | any other band - recalibrate on the first real escalations (constants, not schema) | reversible |
| Escalation mechanics | `ESCALATE` verdict + exit 3 + append-only `literacy-escalations.ndjson` + `--resolve` CLI writing manual provenance | filesystem as the source of truth; single-operator reality | auto GitHub issue per escalation - verifier coupled to GitHub, issues become state | costly (queue format, once entries exist) |
| Producer claim for prompt_builder | advisory metadata; judgment verdict is the independent truth (disagreement expected, not an error) | the judgment is the upgrade over client-side keyword checks — disagreement is the feature | error on disagreement - would re-block the exact case this exists to free | one-way while the RFC stands |
| Client policy | injection-only (`recompute_literacy_evidence(..., judgment_client=None)`); env at the verifier entry; fail closed without key on prompt_builder | the established injection-only convention; deterministic types stay offline | auto-detect inside the evaluator - breaks hermetic tests | reversible |
| Determinism | re-verification replays the committed judgment receipt by input digest | the check()-style contract: same evidence, same verdict | live re-judgment on every verify - answer variance flips verdicts retroactively | reversible |
| Receipts | digest-named NDJSON via `judgments.ask_and_record`, committed | audit + replay in one artifact, the established standard | runtime-only receipts - un-replayable verification | costly |

## Open

1. Escalations NDJSON retention/pruning - default taken: none (append-only, owner-curated; revisit if it grows)
2. Per-field verdict surfacing to the learner (beyond the existing producer feedback) - default taken: none in this round; the escalation queue is owner-facing

## Sources

- `docs/design/rfc-literacy-free-text-verification.md` - ACCEPTED; the conditions this design implements
- `learner/gate/literacy_evaluator.py` (raise at :60-63, `ACTIVITY_PASS_THRESHOLD`), `literacy_verifier.py` (`LiteracyVerdict`, receipt, CLI), `curriculum/ai-literacy/schemas/lesson.schema.json` + `modules/06-rotina-com-ia/l18-biblioteca-de-pedidos.yaml` (rubric shape) - grounding
- PR #494 / `learner/substrate/judgments.py` (`ask_and_record`, `replay_cached`) - the seam being consumed (dependency)
