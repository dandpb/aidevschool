---
name: architecture-weed
description: >-
  Architecture review loop that hunts divergences between canonical substrate
  (`docs/FUNDAMENTOS.md`, `docs/PROMPTS/-01_GOAL.md`, `AGENTS.md`,
  `engines/codexDojo/ecosystem/MANIFEST.md`) and implementation reality
  (`engines/`, `learner/`, `curriculum/`, `.mavis/`), and produces one
  Architecture Decision Record per run. Use when the user wants to think about
  architecture, weed out drift, decide between structural options, ratify a
  canonical doc, or commit a new ADR — even if they don't say "loop" or "ADR".
---

# Loop: architecture-weed

A loop that keeps architecture honest. Each `/architecture-weed <topic-or-divergence>` invocation
picks **one** consequential divergence between canonical substrate and implementation reality,
classifies it (spec bug / code bug / aspirational / intentional gap), and produces a single
**Architecture Decision Record (ADR)** in MADR-lite format at `docs/design/adr/NNNN-<slug>.md`. The
ADR is graded by a separate-subagent verifier (fresh context, score ≥ 8/10) against the done-rule
and the principles in `docs/FUNDAMENTOS.md`. Training Mode is ON by default; graduate to OFF after
3 clean runs.

This loop is the missing infrastructure for **F1 (contrato antes de código)** and **F5 (fatia
vertical antes de escala)** of `docs/FUNDAMENTOS.md`: it forces every architectural claim to be
backed by a recorded decision, with a verifier, in a known place, against a known principle.

## Loop Controls

> Flip these to change behavior. Start in Training Mode to learn whether the done-rule and
> classification are right; graduate to OFF after clean runs (default bar: 3 consecutive PASS).

- Loop Training Mode: ON
- Retry cap: 3
- Verification threshold: 8/10
- Output dir: `.loops/architecture-weed/output/<adr-slug>/`
- Memory file: `.loops/architecture-weed/memory.md`
- ADR location: `docs/design/adr/NNNN-<slug>.md`
- Cadence: on-demand (no schedule yet — wrap with `/loop` or `/schedule` if/when cadence emerges)

**Training Mode ON:** pause before each step and wait for approval; skip any step already passing
its done-rule; re-run only failing steps; keep the retry cap.

**Training Mode OFF:** run autonomously, no pauses; keep every done-rule check and the retry cap;
stop and report if blocked by missing canonical files, a destructive risk, or repeated failed
verification.

## Goal

Each run produces **exactly one** new ADR at `docs/design/adr/NNNN-<slug>.md` that records a
consequential architecture decision (ratify, change, defer, or reject) backed by a divergence
between canonical substrate and implementation, verified by a fresh-context subagent at ≥ 8/10.

## Inputs & Evidence

The loop may read:

- `docs/FUNDAMENTOS.md` — the canonical architecture principles (F1–F8 + AI communication
  protocol + ADR-lite template).
- `docs/PROMPTS/-01_GOAL.md` — ecosystem goal.
- `AGENTS.md` (root) and `docs/AGENTS.md` — project knowledge base, structure, anti-patterns.
- `engines/codexDojo/ecosystem/MANIFEST.md` — product-facing contracts registry.
- `docs/ARCHITECTURE_EVALUATION_*.md` — prior gap analyses (date-stamped).
- `engines/*/`, `learner/`, `curriculum/`, `.mavis/` — implementation surfaces.
- `docs/design/adr/` — prior ADRs (read all; do not edit past the new one).
- `.loops/architecture-weed/memory.md` — read first; what the last run learned.

The loop may invoke:

- `grep` / `rg`, `find`, `git log`, `git diff` — for evidence with file:line anchors.
- `python3 -m learner.substrate` — only if a decision changes canonical learner state.
- `make test-substrate` — only if a decision changes `learner/` or substrate contracts.

The loop may write:

- One new file at `docs/design/adr/NNNN-<slug>.md`.
- One run-output file at `.loops/architecture-weed/output/<adr-slug>/run-<timestamp>.md`.
- Append one entry to `.loops/architecture-weed/memory.md`.

## Steps

1. **Re-read canonical substrate** — purpose: re-anchor in the principles before hunting.
   - Input: `docs/FUNDAMENTOS.md`, `docs/PROMPTS/-01_GOAL.md`, `AGENTS.md`,
     `engines/codexDojo/ecosystem/MANIFEST.md`, prior ADRs in `docs/design/adr/`.
   - Done-rule: all four substrate files exist and were read this run; the relevant principle(s)
     for the candidate divergence are cited by F-id (e.g. "F3 — produtor ≠ verificador").
   - Skip-rule: this run's memory entry records that a prior run read substrate within the last
     7 days AND no canonical file changed since.
   - Retry: inherits the loop retry cap.

2. **Scan implementation surfaces for divergences** — purpose: turn substrate claims into
   checkable questions, then verify each against the filesystem.
   - Input: list of substrate claims (e.g. "1 learner, 1 curriculum, many engines";
     "no mastery without evidence"; "engine-per-app, not monolith").
   - Done-rule: a candidate divergence list exists, each entry has substrate claim, observed
     reality (file:line or command output), and a classification from
     {spec bug, code bug, aspirational, intentional gap}.
   - Skip-rule: a divergence list already exists in this run's output dir and was written
     within the last 24h.
   - Retry: inherits the loop retry cap.

3. **Pick the most consequential divergence** — purpose: one decision per run keeps the ADR
   sharp and the loop cadence honest.
   - Input: candidate divergence list.
   - Done-rule: the chosen divergence has (a) explicit principle cited, (b) clear evidence,
     (c) classification, (d) ≥ 2 options if it's a decision (not just a "fix the typo" spec bug).
   - Skip-rule: n/a — picking is the run's contract.
   - Retry: if no divergence survives scrutiny, the loop has nothing to do this run; write a
     short run-output note ("no consequential divergence found") and stop without an ADR.

4. **Draft the ADR (MADR-lite)** — purpose: a single testable artifact that another agent can
   verify.
   - Input: chosen divergence + principle + classification + options.
   - Done-rule: ADR has all 7 fields per the template in `docs/FUNDAMENTOS.md` Part 2:
     1. Title (`# ADR-NNNN: <slug>`)
     2. Status (Proposed / Accepted / Deprecated / Superseded-by ADR-NNNN) + Date
     3. Context (3–6 lines: what's the divergence, what principle applies, why now)
     4. Options (table: A vs B vs C — complexity / cost / familiarity / reversibility)
     5. Decision (one paragraph)
     6. Consequences (o que fica mais fácil / mais difícil / revisitar quando)
     7. Evidence (file:line anchors or command output for every claim)
   - Skip-rule: n/a — the ADR is the deliverable.
   - Retry: inherits the loop retry cap; a sub-failing field is a retry target, not a global
     re-do.

5. **Regenerate derived views if canonical state changed** — purpose: F2 — source updates,
   views re-derive.
   - Input: the decision.
   - Done-rule: if the decision changes `learner/` contracts or state, `python3 -m learner.substrate`
     runs and `.mavis/` is updated before verification. Otherwise skip with a one-line note.
   - Skip-rule: decision does not touch `learner/`, `curriculum/`, or substrate contracts.
   - Retry: inherits the loop retry cap.

6. **Verify with a fresh-context subagent** — purpose: F3 — producer ≠ verifier, no self-grade.
   - Input: Goal + Done Rules + ADR path (NOT the producer's reasoning).
   - Done-rule: the verifier returns `score ≥ 8/10` AND `result: PASS`. Anything else is a
     retry with the verifier's `failed_criteria` + `retry_target` as the next iteration's
     fix-list.
   - Skip-rule: n/a — verification is mandatory every run.
   - Retry: inherited.

## Done Rules

The loop is done when **all** of these hold:

- One new ADR exists at `docs/design/adr/NNNN-<slug>.md` (or the run-output note exists if no
  consequential divergence was found).
- The ADR has all 7 MADR-lite fields, with file:line or command evidence for every claim.
- Every claim of fact in the ADR is traceable to a substrate file or a filesystem location.
- If the decision touched canonical state, derived views were regenerated this run.
- The fresh-context verifier returns `score ≥ 8/10` AND `result: PASS`.
- One run-output file exists at `.loops/architecture-weed/output/<adr-slug>/run-<timestamp>.md`.
- One entry was appended to `.loops/architecture-weed/memory.md`.

## Verification

Run the final check in a **separate subagent (fresh context)** — the agent that produced the ADR
must not grade it. This is F3 in action.

- Spawn a verifier via the `Agent` tool. Pass it **only**: the Goal, the Done Rules, and the ADR
  path. Do **not** pass the producer's reasoning, the divergence list, or the proposed
  classification — that defeats the independence.
- The verifier returns:
  - `score` (1–10), `result` (PASS/FAIL vs threshold), `done_rule` (PASS/FAIL),
    `evidence_checked` (the exact files/commands/anchors it inspected),
    `failed_criteria` (the specific MADR-lite fields or claims that fell short),
    `retry_target` (the single step to re-run, or `none`), `confidence` (high/medium/low).
- Mark the loop done only when the done-rule passes **and** the score ≥ 8/10. Otherwise feed
  `failed_criteria` + `retry_target` back as the next iteration's fix-list (within the retry cap).
- Default threshold: `8/10`. Raise to `9/10` for ADRs that change substrate contracts; lower only
  with a deliberate reason recorded in memory.

If subagents are unavailable, do a fresh verification pass that judges only the ADR against the
Done Rules and the relevant F-id in `docs/FUNDAMENTOS.md`, ignoring how the ADR was produced.

## Output & Memory

At the end of **every** run, write both:

1. **ADR** → the deliverable at `docs/design/adr/NNNN-<slug>.md` (always MADR-lite, always
   anchored in evidence).
2. **Run output** → `.loops/architecture-weed/output/<adr-slug>/run-<timestamp>.md` with:
   - the divergence list (so the next run can re-derive or skip already-classified items),
   - the chosen divergence and classification,
   - the verifier verdict (score, result, failed_criteria if any),
   - the next-run hint (what to look at next, or "no consequential divergence found").
3. **Memory** → append one entry to `.loops/architecture-weed/memory.md`:

   ```markdown
   ## Run <ISO-8601 timestamp>
   - mode: ON | OFF
   - inputs: <substrate files read, surfaces scanned>
   - skipped: <steps already passing their done-rule>
   - rerun: <steps retried and why>
   - verification: <score>/10 — <PASS|FAIL> — <one-line reason>
   - adr: <path to this run's deliverable>
   - divergences: <count found, count classified, count deferred>
   - lessons: <what worked, what failed, what to remember next run>
   ```

The memory file is what separates this loop from a one-off architecture review. The next run
reads it first and starts from "what was the state of the substrate last time we looked?"

## Failure Handling

- On retry-cap exhaustion: stop and report the best attempt's ADR path, the verifier's last
  `failed_criteria`, the step that kept failing, and one concrete next step (narrower
  divergence, stronger evidence, missing canonical file).
- Never relax the done-rule or flip Training Mode OFF to make a failing run look done. If a step
  fails repeatedly, add a narrower retry target (e.g. "fix only the Options table") or a
  stronger preflight check (e.g. "verify file:line exists before citing it") instead.
- If `docs/FUNDAMENTOS.md` is missing or moved, the loop has no principles to test against.
  Stop and report; do not invent principles.
- If the divergence list comes back empty for 3 consecutive runs, the substrate is stable —
  consider widening the scan (e.g. to `docs/PROMPTS/IDEIAS/` or to engine-internal docs) before
  declaring the loop redundant.

## Anti-patterns (per FUNDAMENTOS.md F8 — simplicidade)

- One ADR per run. Never bundle "and also..." decisions; the loop will not enforce the cadence
  if you do.
- No re-deriving principles. The F-ids are stable; cite them, don't restate them.
- No editing past ADRs. If a past ADR is wrong, write a new ADR with `Superseded-by ADR-NNNN`.
- No "review everything" runs. The loop is for *decisions*, not for status reports. Status
  reports belong in `docs/ARCHITECTURE_EVALUATION_<date>.md`.
