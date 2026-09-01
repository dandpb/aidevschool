# Spec: adopt the AI-Native SDLC playbook as the repo's engineering loop

Change-id: AID-394-ai-native-sdlc · From: intent/AID-394-ai-native-sdlc/intent.md · Status: accepted (ratified retroactively — see intent.md disclosure)

## Requirements

1. A skill (`ai-native-sdlc`) triggers on any implement/fix/build/refactor task
   and encodes the 6 stages, the artifact chain, gates, the done-rule, and the
   small-fix fast path (verify+review never skipped).
2. Deterministic hooks enforce: (a) generated/derived paths (`.mavis/`, `dist/`,
   `node_modules/`, `.codegraph/`, `graphify-out/`, …) cannot be edited;
   (b) existing tests cannot be edited/deleted mid-fix (new failing-test-first
   files allowed); (c) force-push/history rewrite and credential staging are
   blocked; (d) after each edit the exact verify command for the touched engine
   is surfaced (advisory).
3. Overrides (`SDLC_ALLOW_TEST_EDIT`, `SDLC_ALLOW_DERIVED_EDIT`) exist, mean
   owner approval, and unapproved use escalates.
4. `docs/sdlc/README.md` documents the loop, artifact homes, the Paperclip
   mapping, governance, metrics (leading/lagging), and rollout order.
5. Templates exist for `intent.md`, `spec.md`, `plan.md` (copy, don't invent).
6. `REVIEW.md` defines the 4 review passes (correctness vs plan, tests/evidence,
   conventions, security), severities (Blocker/Important/Nit), skip rules, and
   the feed-back-into-CLAUDE.md rule.
7. `intent/` is the versioned intent home: one directory per change-id
   (`AID-<n>-<slug>` for Paperclip work), owner triage accept/schedule/reject.
8. `AGENTS.md` and `CLAUDE.md` wire the loop into every agent session
   (WHERE TO LOOK row + CONVENTIONS bullet; Como trabalhar bullet).
9. Every artifact above is committed to git — the history is the audit trail.

## Design

Skill at `.claude/skills/ai-native-sdlc/SKILL.md`; hooks as four standalone
bash scripts under `.claude/hooks/` wired via `.claude/settings.json`
(PreToolUse: Edit|Write|MultiEdit + Bash matchers; PostToolUse advisory);
process docs at `docs/sdlc/` with templates; review contract at root
`REVIEW.md`; intent queue at root `intent/`. No engine code touched; no
learner-state impact; no derived views to regenerate.

## Policy applied

AGENTS.md golden rules (evidence gates, producer ≠ verifier, filesystem as
source of truth); Paperclip flow (issue = intent origin, `request_confirmation`
= gate, child issues = parallel streams); source playbook
https://claude.com/blog/the-ai-native-sdlc-playbook (adapted, not copied).

## Flagged concerns

- **Process weight vs small fixes** — owner: CEO. Resolved by the small-fix
  fast path (collapsed plan block in the task record; verify+review never skip).
- **Hooks can annoy legit bulk work** — owner: CEO. Resolved by env overrides
  requiring owner approval, recorded in the task.
- **The implementation itself skipped the loop it installed** — owner: SDLC
  Scrum Master (audit AID-395 → NÃO CONFORME). Repaired by AID-399: surgical
  commit of all artifacts + this retroactive chain + independent review.
  Recorded as the baseline metrics incident, not hidden.

## Out of scope

Engine runtime code, CI workflow changes, learner/curriculum content,
retro-fitting chains for pre-loop changes other than this one.
