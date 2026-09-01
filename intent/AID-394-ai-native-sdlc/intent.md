# Intent: adopt the AI-Native SDLC playbook as the repo's engineering loop

Author: founder request on Paperclip AID-394 ("Implement the The AI-Native SDLC playbook", 2026-08-30) · Change-id: AID-394-ai-native-sdlc · Status: accepted (ratified retroactively — see note)

> **Retroactive chain disclosure.** This chain was authored during the AID-399
> rework (audit verdict NÃO CONFORME, 2026-08-30): AID-394 implemented the loop
> without running it. `intent.md`/`spec.md` are faithful reconstructions of the
> decisions actually taken, marked retroactive where written after the fact;
> `plan.md` documents the original build AND the AID-399 rework that versions it.
> Origin issues: AID-394 (implementation), AID-399 (rework: commit artifacts +
> this chain + independent review).

## Problem

Engineering changes in this repo had no artifact-driven process: intent lived
implicitly in issue threads, verification was self-reported by the producing
session, review was ad-hoc or absent, and nothing tied a diff back to the plan
that justified it. With multiple agents (CEO, FPE, QA, SDLC Scrum Master)
shipping to the same substrate, that gap shows up as: done-without-evidence,
producer self-verification, and untracked work products (exactly what the first
SDLC audit found on AID-394 itself).

## Proposed outcome

Every engineering change (feature, fix, refactor, curriculum/learner change)
runs one visible loop — intent → spec → plan → build → verify → review → ship →
maintain — where each stage ends with a committed artifact the next stage
reads, gates map to Paperclip confirmations, and deterministic hooks enforce
the invariants that must never depend on agent discipline alone.

## Affected users and systems

All engines and the shared substrate (`curriculum/`, `learner/`), docs
(`docs/sdlc/`), root convention files (`AGENTS.md`, `CLAUDE.md`), tooling
(`.claude/settings.json`, `.claude/hooks/`), and the `intent/` queue used by
every future change. No runtime/learner-state impact.

## Constraints

- No new dependencies, no PII, no engine-runtime changes — process artifacts only.
- Must adapt to existing golden rules: evidence gates, producer ≠ verifier,
  filesystem as source of truth, Paperclip task flow (issue = intent origin,
  confirmations = gates, child issues = parallel streams).
- Hooks must be deterministic, cheap, and overridable only with owner approval
  (`SDLC_ALLOW_TEST_EDIT`, `SDLC_ALLOW_DERIVED_EDIT`).
- Small bounded fixes get a fast path; verify and review are never skipped.

## Open questions

Answered in `spec.md`; the one that mattered most: how much process weight a
small fix can carry (answered: collapsed plan block allowed, verify+review never).
