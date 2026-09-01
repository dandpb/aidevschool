# AI-Native SDLC — AiDevSchool adaptation

Source: [The AI-Native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook)
(Anthropic, 2026-08-21). This document adapts it to this repo and to how work
arrives here (Paperclip issues driven by agents, with the human owner at the
gates). Implemented by AID-394.

## The loop in one paragraph

Code is no longer the bottleneck — plan, review, and governance are. So the
process is a loop of **committed artifacts**: every stage ends by writing a
file the next stage reads, and the owner's attention concentrates at the gates
between stages instead of inside them. Build is wrapped by self-verification
(the session proves its own work) and advisory review (`REVIEW.md`), with
deterministic guardrails as hooks (`.claude/settings.json`). Monitoring and
incidents write back into the loop as new `intent.md` files, so the loop feeds
itself.

```
        ┌──────────────────────────────────────────────────────────┐
        ↓                                                          │
  1 PLAN          2 DESIGN        3 BUILD        4 TEST       5 SHIP      6 MAINTAIN
  intent.md  →    spec.md    →    plan.md   →   diff+tests → review →   monitor
  (owner gate)    (owner gate)    (engineer)    (self-verify) (REVIEW.md)  (bands/alerts)
        ↑                                                          │
        └────────────── new intent.md from findings ───────────────┘
```

## Artifacts and where they live

| Stage | Artifact | Home |
| --- | --- | --- |
| Plan | `intent.md` | `intent/<change-id>/intent.md` |
| Design | `spec.md` | `intent/<change-id>/spec.md` |
| Build | `plan.md` + diff + tests | `intent/<change-id>/plan.md` + normal source tree |
| Test | command outputs / evidence | task record (Paperclip issue comment or PR) |
| Ship | review verdict + commit | git history (audit trail) |
| Maintain | new `intent.md` / regression test | back to `intent/` + test suites |

`<change-id>` is `YYYY-MM-DD-<slug>`; when the work comes from a Paperclip
issue, use `AID-<n>-<slug>`. Templates: `docs/sdlc/templates/`.

## Mapping onto Paperclip (how agents run this daily)

- **Trigger:** a Paperclip issue assignment *is* the intent origin. If the
  issue body already answers problem/outcome/constraints, quote it in
  `intent/<change-id>/intent.md` (link, don't rewrite — one source of truth).
- **Gates:** owner acceptance of intent/spec maps to Paperclip
  `request_confirmation` interactions; the plan gate maps to plan-document
  approval before implementation subtasks are created.
- **Parallelism:** independent streams become child issues (one stream per
  issue), mirroring the playbook's worktree-isolated parallel sessions.
- **Producer ≠ verifier:** the implementing agent never marks its own work
  verified — a fresh-context verifier (subagent or reviewer issue) checks the
  diff against `plan.md` and files the verdict.
- **Small-fix fast path:** for bounded fixes the three artifacts collapse
  into a single short plan block in the task record, but self-verification
  and review are never skipped.

## Guardrails (what is enforced, and how)

| Control | Type | Enforcement |
| --- | --- | --- |
| No edits to generated/derived paths (`.mavis/`, `dist/`, `node_modules/`, `.codegraph/`, …) | hook | `.claude/hooks/protect-paths.sh` (PreToolUse) |
| Tests can't be weakened mid-fix (new test files OK; editing existing ones needs owner override) | hook | `.claude/hooks/protect-tests.sh` (PreToolUse) |
| No force-push / history rewrite; no staging credentials | hook | `.claude/hooks/guard-commands.sh` (PreToolUse) |
| Verify-your-work reminder per touched surface | hook | `.claude/hooks/verify-nudge.sh` (PostToolUse, advisory) |
| Same three guardrails enforced over every PR diff, runtime-agnostic | CI | `scripts/ci/sdlc_guard_check.sh` in the `sdlc-guardrails` job (`.github/workflows/ci.yml`, AID-537) |
| Review passes + severities | advisory | `REVIEW.md` (repo root) |
| SDLC loop itself | advisory (skill) | `.claude/skills/ai-native-sdlc/SKILL.md` |

A skill makes violations rare; a hook makes them close to impossible. Policies
that must hold without exception get a hook behind the skill. Hook overrides
(`SDLC_ALLOW_TEST_EDIT=1`, `SDLC_ALLOW_DERIVED_EDIT=1`) exist for
owner-approved exceptions and are expected to be rare and justified in the
task record.

### CI enforcement (runtime-agnostic wire, AID-537)

The hooks are Claude Code PreToolUse events; audit AID-400 (Reg #4) confirmed
no active runtime executes them, so CI is where they hold for everyone. The
`sdlc-guardrails` job replays every changed path of the PR diff (vs the merge
base) through the real hook scripts: derived paths and existing-test
edits/deletions block, credential-shaped paths and credential tokens in added
content block (deleting an existing test also counts — runtime deletions go
through Bash and bypass the hook's Edit matcher, so the diff check closes that
gap; new test files stay allowed, keeping failing-test-first the norm).

Overrides in CI are **declarative and still require owner acceptance**: a
commit trailer `SDLC-Allow-Test-Edit: <task-record reference>` (or
`SDLC-Allow-Derived-Edit:`) in the PR range downgrades the corresponding
violation to a visible warning annotation — it never silences the check.
The declaration only becomes acceptance at the merge gate, where main
requires an approval from someone other than the last pusher; the reference
in the trailer must point at the disclosure in the task record (precedent:
AID-531/PR #221, comment `244c2f4c`). Credential violations have no override,
matching the hook ("secrets never enter the diff"). Force-push/history-rewrite
protection stays runtime-side (the diff cannot express it); branch protection
on `main` is the CI-side control.

## Governance / audit

- The chain of commits is the audit trail: who asked (intent), what was
  decided (spec), what was planned (plan), what was produced (diff+tests),
  what was found (review), who shipped (commit/PR).
- Findings from review never approve or block alone — a human/code owner
  decides at the gate.
- Anything touching `curriculum/` or `learner/` keeps the learning-gate
  golden rules (independent evidence before `mastered`; canonical YAML first,
  then regenerate derived views).

## Metrics (what we watch, per playbook)

- **Leading:** time from trigger to committed `intent.md`; share of changes
  passing verification on the first pass; time to first review verdict;
  share of review findings resolved without a human.
- **Lagging:** rework cycles per change (diff vs `plan.md` departures);
  requirements churn after build starts (`spec.md` commits after first
  `plan.md`); repeat incidents of the same class.

## Rollout order (already done by AID-394)

1. ✅ Skill: `.claude/skills/ai-native-sdlc/SKILL.md`
2. ✅ Hooks: `.claude/hooks/*.sh` + `.claude/settings.json`
3. ✅ Processes: this doc, `docs/sdlc/templates/`, `REVIEW.md`, `intent/`
4. ✅ Wiring: root `CLAUDE.md` + `AGENTS.md` reference the loop
5. ✅ CI enforcement of the three deterministic guardrails over PR diffs (AID-537)

Future stages (optional, when this repo grows CI/monitoring): continuous
evals on agent-config changes (eval suite gating `CLAUDE.md`/skills/hook
edits), deterministic control bands writing monitoring findings back as
`intent.md`, and scheduled security scans with findings routed through the
same review gate.
