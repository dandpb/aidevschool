# RFC: May a typed judgment model verify free-text learner answers?

**Status**: OPEN — needs an owner decision. This document frames the question;
it decides nothing.

**Context**: opened 2026-09-17 from the fragile-parsing exploration and the
semantic-substrate-seam pilot (`.design/semantic-substrate-seam.md`, PR #486),
which validated typed judgments (TypeSafe/Jev) on this repo's real data and
shipped them at the substrate seam with full receipt audit.

## The question

`learner/gate/literacy_evaluator.py:60-63` raises on `prompt_builder`
activities — the independent verifier **refuses** to re-evaluate free-text
learner answers and fails closed. Free-text literacy activities therefore can
never pass an independent gate: the one verification surface where the
learner's own words are the attempt artifact is the one surface nobody can
check.

May a typed judgment model (Noul/Score per rubric criterion, thresholds owned
by code, borderline escalated to a human) become part of what
"independently verified" means for free-text answers — yes or no?

## Why this is a real decision and not a build ticket

The golden rules (producer ≠ verifier; no claims without evidence) were
written assuming verification is executable/deterministic. Admitting a
judgment model as verifier changes the meaning of rule 2 for exactly this
surface:

- **For**: the alternative is *no* independent verification at all (today's
  state) — a human reviewer or nothing. The rubric is already canonical
  (`activity["evaluation"]`) and unused for free text. The "verify and
  escalate" pattern keeps thresholds in code and records every judgment as a
  receipt; the pilot proved calibration on this repo's data class
  (0.89/0.02/0.05 attempt triage, stable across runs).
- **Against**: producer ≠ verifier is preserved only in the sense that the
  model is neither the learner nor the producer — but it is not *independent
  of the operator's stack* the way an executable check is. A wrong judgment
  passes a learner who did not demonstrate the concept (false mastery) or
  blocks one who did. The failure mode is quiet in both directions.

## What the decision must settle

1. **Admit or not** — is judgment-based rubric scoring an acceptable meaning
   of "independently verified" for free-text literacy activities?
2. If admitted: **thresholds and escalation** — what per-criterion probability
   counts as demonstrated (proposed starting point: ≥ 0.75 pass,
   0.4–0.75 escalate to human, < 0.4 fail — numbers to be validated against
   real activity data, not assumed), and who is the human (single-learner
   ecosystem: the owner).
3. **Receipts** — same digest-named NDJSON standard as the pilot, committed,
   replayable.
4. **If not admitted** — the honest alternative is stating that free-text
   literacy is verified by human review only, and making that explicit in the
   evaluator instead of today's blanket refusal.

## Evidence available for the decision

- Every literacy activity carries a canonical `evaluation` block (rubric) that
  today goes unused for free text (`literacy_evaluator.py:54-63`)
- Judgment calibration on this repo's prose: see `.design/semantic-substrate-seam.md`
  Evidence section (21-of-21 recurrence sweep, discriminating profile choices)
- Zero free-text activities have ever passed an independent gate — the
  substitute today is nothing

## How to answer this RFC

The owner decides (this is a product/philosophy call about what "verified"
means in this ecosystem, not a technical one). On YES: run tlc-discover on the
resulting work (it reuses the pilot's runner/receipt/replay infrastructure
wholesale). On NO: record the decision in this file, close it, and the
evaluator's fail-closed behavior becomes the documented contract instead of a
gap.

**Do not start implementation of judgment-based free-text verification before
this RFC is answered.**
