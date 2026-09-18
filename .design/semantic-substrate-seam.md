# Semantic substrate seam (judgment enrichment pilot)

> Plan this with **tlc-plan** (`.claude/skills/tlc-plan`).
> Decisions below carry the literal shape - copy them, do not re-derive them.

## Situation

- Project: in active construction (single learner, 2 of 18 units mastered, cadence 5h/week)
- Decision: open until this discovery; verdict below is the first record of it
- In flight: `docs/design/spaced-repetition-streak/` (granted ADR; `learner/substrate/scheduling.py` is live and its `recurring-trap` review reason consumes the pitfall list this seam produces; the ADR leaves recurrence *detection* undecided and forbids non-gate ratings)
- At stake: wrong review-queue data today versus an external-API dependency entering the deterministic substrate; reversible in an afternoon (deterministic parsers stay as fallback)

## Problem

The learner schedules reviews from numbers the substrate computes by string shape over human-written prose. `topPitfalls[].occurrences` is 1 (first-word substring match; the real count is 21) on the live dashboard and flows into `derive_next_reviews`' recurring-trap entry. `profile.dreyfus`/`bloom` come from first-row English keyword matching that silently defaults on Portuguese-only cells. `masteredCount` counts catalog implementation status, not learner mastery — right today (2 = 2) only by coincidence. If nothing changes, every future Portuguese-titled pitfall stays invisible at `occurrences: 1` forever and the FSRS reinforcement schedule the ADR was granted for never fires for the exact mistake repeated 21 times.

## Evidence

- occurrences: substring counter returns 1; validated Noul sweep over all 51 real journal entries returns 21 hits (0.04 floor on unrelated entries, 0.5–0.67 on the 17 ungated backfill "Verification" entries the journal's own correction entry confirms, 0.76–0.92 on correction/provenance entries) — TypeSafe API run 2026-09-17, `/tmp/typesafe-exp/validate_replacement.py` (ephemeral; numbers quoted here are the record)
- Dreyfus/Bloom: Choice judgments on the real matrix return competent 0.99 / analyze 0.97; parser says competent/apply (first row of four)
- Cost: 51 judgments in one request, 19.4K input + 1.1K output tokens, 1.3s; paraphrase detection validated at 0.98/0.04/0.97; borderline-case self-consistency 0.04 × 3 runs
- Cannot be measured today: whether semantic counts stay calibrated as the journal grows — reviewable only by periodic spot-check (see Success)

## Journey

Operational sequence: a sync (`python3 -m learner.substrate`) runs, judgment questions are asked in one request per sweep, receipts land as NDJSON, the snapshot is regenerated. States: **no key** → deterministic parsers, no receipts, exit 0 (normal mode, not an error); **API failure/timeout/429/529** → deterministic fallback, warning receipt, exit 0; **judgment disagrees with parser** → semantic value wins in the snapshot, provenance in the receipt, flip-back is free; **new journal entries or pitfalls** → picked up on the next sync's sweep.

## Verdict

build - the cost of doing nothing is a 21×-wrong number feeding the granted SR schedule; the cost of doing it is one env-gated enrichment step with the deterministic path preserved. Confirmed by the user (Daniel), 2026-09-17, by proceeding to tlc-plan.

Cheaper paths considered: manual `pitfall: P-001` tags in journal entries (cannot read the 51 historical entries; relies on self-report the system already ranks weakest) - discarded; buying (no product class exists) - nothing to look at; deterministic-only fix (leaves the 21× number intact) - discarded.

## Success

- Worked if: next sync's `topPitfalls[0].occurrences` is ≥ 15 (vs 1 today) and the recurring-trap entry remains in `nextReviews` - by the next gate cycle
- Early signal: count changes on the first sync after merge; going wrong looks like semantic counts drifting from manual spot-checks of the trap theme
- Review: spot-check at the next gate cycle - the learner
- Not directly measurable long-term: calibration drift; proxy = periodic manual recount of the pitfall theme vs the receipt log

## Boundary

In: a judgment runner in `learner/substrate/` (pitfall-recurrence Noul sweep, Dreyfus/Bloom Choice), advisory NDJSON receipts, deterministic fallback, `masteredCount` re-sourced from `units_log`.
Out: literacy free-text rubric verification (`learner/gate/literacy_evaluator.py`) - changes what "independently verified" means, needs its own round (see Needs an RFC); scheduling behavior changes - ADR forbids non-gate ratings; items 6–10 of the fragile-parsing map - deterministic fixes or offline tooling, no judgment warranted.

## Prior art

- TypeSafe/Jev System One docs (docs.typesafe.ai) - typed Noul/Choice primitives with probabilities; the validated experiments above are the domain evidence
- The repo's own `learner/gate/verifier_receipt.py` - strict receipt pattern with sha256 digests; adopted for judgment receipts (separate directory: gate receipts stay gate-only)
- Nothing heavier argued for: no benchmark consulted suggests a reasoning model; the task is classification/alignment, measured cheap and calibrated

## Shape

An env-gated enrichment step inside substrate sync: deterministic parsers run first, a judgment runner optionally overrides their outputs with typed API judgments, and every judgment lands in an auditable NDJSON receipt. Changing later costs swapping or deleting the runner; the snapshot contract and fallback path are unchanged.

### Adds

- `learner/substrate/judgments.py` - judgment runner (one batched API request per sweep)
- `learner/judgment_receipts/<UTC-stamp>.ndjson` - one JSON line per question (see Decisions)
- `TYPESAFE_API_KEY` in `.env` (gitignored) gating the semantic path

### Changes

- `topPitfalls[].occurrences` → semantic recurrence count when the key is present (substring count as fallback)
- `profile.dreyfus` / `profile.bloom` → Choice judgment over the canonical stage/level vocabularies when the key is present (parser as fallback)
- `masteredCount` → count of `units_log` entries with `mastered: true` (deterministic, no judgment; catalog statuses no longer feed it)

### Leaves

- `learner/substrate/scheduling.py` - ratings still only from gate outcomes; `derive_next_reviews` inputs unchanged by enrichment beyond the pitfall list it already consumes
- `learner/gate/` in its entirety - the evidence path stays judgment-free
- `learner/substrate/snapshot_sources.py` parsers - kept as the deterministic fallback, not deleted

## Roadmap

One block: the seam pilot above - clear (backed by Decisions).

## Decisions

| Decision | Choice | Why this | Alternative, and what would make it win | Reversibility |
|---|---|---|---|---|
| External judgment provider | TypeSafe HTTP API `POST https://api.typesafe.ai/v1/systemone`, model `jev-latest`, auth `Bearer $TYPESAFE_API_KEY` | validated calibrated judgments on this exact data at trivial cost | local/self-hosted model - wins only if offline operation or key policy forbids external calls | reversible (runner is one module) |
| Receipt home | `learner/judgment_receipts/<UTC-stamp>.ndjson`, one line per question: `question`, `kind` (noul/choice), `answer`, `probabilities`, `model`, `usage`, `input_digest` (sha256 of state+questions), `timestamp`, `status` (ok/fallback) | filesystem stays the auditable source of truth; follows the verifier-receipt precedent without polluting the gate's dir | writing into `learner/verifier_receipts/` - loses only if gate tooling is unified later | costly (once receipts accumulate, readers appear) |
| Snapshot policy on disagreement | semantic value replaces the parsed value; provenance lives in the receipt; deterministic value reappears automatically on any failure | one number per field; flip-back is free | dual fields (parsed + semantic) - wins if the dashboard wants to show provenance inline | reversible |
| Hard scheduling boundary | judgment outputs never feed FSRS ratings; `derive_next_reviews` consumes pitfalls exactly as today | ADR non-negotiable: ratings only from gate outcomes | none live | one-way while the ADR stands |
| `masteredCount` source | `sum(unit.mastered for unit in units_log)` | golden rule 3: mastery claims need evidence; units_log is the evidence-backed record | catalog status prefix - wins only if the dashboard means "implemented projects", not learner mastery | reversible |

## Needs an RFC

1. May a typed judgment model form part of "independently verified" for free-text literacy answers (`prompt_builder` fails closed today)? - blocks unlocking free-text literacy units; consequential because it touches golden rule 2's meaning

## Open

1. Judgment-receipt retention - default taken: keep the newest 30 receipt files, pruned by the sync itself

## Sources

- Discovery interview + verdict, 2026-09-17 (this session) - boundary, journey states, snapshot policy
- Experiment runs 2026-09-17 (`/tmp/typesafe-exp/`, ephemeral) - the numbers quoted in Evidence
- `learner/substrate/scheduling.py:1-19` (ADR rule), `learner/substrate/snapshot_sources.py`, `learner/substrate/dashboard_snapshot.py:99-159`, `learner/gate/verifier_receipt.py` - grounding
