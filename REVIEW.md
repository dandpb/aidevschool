# REVIEW.md — review passes for every diff

Every change in this repo gets the same review passes before it ships
(playbook Stage 5). Findings are advisory and severity-ranked; they never
approve or block alone — a human/code owner decides at the gate.

## Passes (in order)

1. **Correctness vs plan** — does the diff do what `intent/<change-id>/plan.md`
   (and its spec) says? Departures must be reflected in an updated `plan.md`
   within the same change.
2. **Tests & evidence** — stated proof executed with real output recorded;
   bug fixes carry a test that existed before the fix; learning-gate changes
   carry attempt + independent evidence; producer ≠ verifier respected.
3. **Conventions** — AGENTS.md + engine AGENTS.md/CLAUDE.md rules hold:
   no `curriculum/`/`learner/` duplication inside engines; canonical YAML
   edited first with derived views regenerated; `MANIFEST.md` updated when
   prompts/roadmap/gates/memory contracts changed; numeric thresholds via
   `⟨config: path⟩` markers, not hardcoded.
4. **Security & hygiene** — no credentials/tokens in the diff; no PII in logs
   or error messages; no hand-edits to generated paths; `/simplify` pass ran
   before commit (root golden rule 5).

## Severities

- **Blocker** — wrong behavior, broken proof, secret leak, convention breach
  that corrupts the substrate (e.g., engine-local copy of shared state).
- **Important** — real risk the plan/spec didn't cover; missing evidence;
  fragile pattern likely to break a neighboring flow.
- **Nit** — style, naming, minor simplification. Cap Nit volume; don't let it
  drown the Important findings.

## Skip

- Generated/derived paths (`node_modules/`, `dist/`, `.mavis/`, `.codegraph/`,
  `graphify-out/`, lockfiles, bundled `.min.` assets) — enforced anyway by the
  protect-paths hook.
- Anything CI/lint already enforces deterministically — don't re-report it.

## Feeding findings back

A mistake flagged twice becomes a line in root `CLAUDE.md` / `AGENTS.md` (or
an engine's), so the next diff is caught at write time. If a policy keeps
getting violated, back the skill with a hook (`.claude/settings.json`).

## For agents receiving review comments

`@agent`-style follow-ups on a diff: fix, rerun the pass, push, and record the
sweep in the task record. The proposing agent never approves its own work —
separation of duties is absolute.
