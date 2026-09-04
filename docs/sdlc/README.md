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

### External-origin PRs (bots: Sentinel, Jules)

Fixes sometimes arrive as PRs from external bots (Sentinel security scans,
Jules). A bot has no Paperclip presence and owns no accountability trail
here, so it cannot register its own intent — but merged bot PRs become
precedent, so the written producer link is still required (audit
AID-767/B finding F1, retrofitted by AID-771 in
`intent/2026-09-03-xss-dojotoday-sentinel/`):

- **Who registers:** the CEO, or an agent dispatched by the CEO, creates
  the fast-path record — a short plan block in the task record, or
  `intent/<change-id>/` with `intent.md` + `plan.md` — **before merge**,
  linking the PR, the independent QA-verdict issue, and any follow-up
  guard or re-grant.
- **What never changes:** the independent verdict (producer ≠ verifier)
  remains mandatory before merge; the record documents the chain, it
  never substitutes for verification.
- **If the record slips** (as with PR #262): retrofit it promptly as a
  **retrospective record** marked as such at the top of each file, citing
  the verdicts and merge SHAs that already happened, and let the miss feed
  the audit.

## Guardrails (what is enforced, and how)

| Control | Type | Enforcement |
| --- | --- | --- |
| No edits to generated/derived paths (`.mavis/`, `.loops/`, `dist/`, `node_modules/`, `.codegraph/`, …) | hook + CI | `.claude/hooks/protect-paths.sh` (PreToolUse, Claude Code) · `scripts/sdlc_guard_check.sh` on the diff in CI job `sdlc-guards` (any runtime) |
| Tests can't be weakened mid-fix (new test files OK; editing existing ones needs owner override) | hook + CI | `.claude/hooks/protect-tests.sh` (PreToolUse, Claude Code) · same CI check |
| No committed credentials (`.env`, keys, tokens in paths or added lines) | hook + CI | `.claude/hooks/guard-commands.sh` (PreToolUse, Claude Code) · same CI check, **no override** |
| No force-push / history rewrite | hook | `.claude/hooks/guard-commands.sh` (PreToolUse) — guards a live git operation; cannot be re-checked post-hoc from a diff, so it stays a runtime + repo-owner concern |
| Verify-your-work reminder per touched surface | hook | `.claude/hooks/verify-nudge.sh` (PostToolUse, advisory) |
| Review passes + severities | advisory | `REVIEW.md` (repo root) |
| SDLC loop itself | advisory (skill) | `.claude/skills/ai-native-sdlc/SKILL.md` |

A skill makes violations rare; a hook makes them close to impossible. Policies
that must hold without exception get a hook behind the skill. Hook overrides
(`SDLC_ALLOW_TEST_EDIT=1`, `SDLC_ALLOW_DERIVED_EDIT=1`) exist for
owner-approved exceptions and are expected to be rare and justified in the
task record.

### Runtime-agnostic enforcement in CI (AID-537)

PreToolUse/PostToolUse hooks only execute in Claude Code sessions, but agents
in this company run on other runtimes — so from AID-394 until AID-537 the
guardrails above were inert for every runtime actually in use (audit AID-400,
Registro #4). Since AID-537, CI job `sdlc-guards`
(`scripts/sdlc_guard_check.sh`, wired in `.github/workflows/ci.yml`) replays
the **same canonical hook scripts** against the committed diff (vs the PR
base), so a violation fails the PR regardless of which runtime produced it:

- every added/modified path goes through `protect-paths.sh` and
  `protect-tests.sh` (an "existence mirror" reproduces the hooks'
  new-test-allowed / existing-test-blocked semantics; deletions count as test
  edits but as derived-path cleanup);
- every changed path and every added diff line goes through the credential
  rules of `guard-commands.sh`;
- a `--self-test` step runs synthetic violations through the real hooks on
  every CI execution, so the enforcement path itself is continuously proven.

The declarative override remains owner-gated, now with an auditable trailer:
a commit in the PR range carrying `SDLC-ALLOW-TEST-EDIT: AID-<n>` or
`SDLC-ALLOW-DERIVED-EDIT: AID-<n>` suppresses the corresponding CI check for
that range. The trailer is only the audit hook — the cited AID issue must
record the actual owner acceptance, and the reviewer/QA verifies that before
merging. This is the same trust model as the live env-var overrides (an
undisciplined session could export those too); the trailer just makes the
exception visible in git history. Credential findings have no override, and
the force-push rule remains runtime-intercepted because a diff cannot prove
how it was pushed.

### Content-wave fixture edits: per-wave trailer, no standing allowlist (AID-554)

Content waves legitimately edit existing test files — contract fixtures kept
in sync with the catalog (`curriculum/ai-literacy/tools/tests/test_content_contract.py`,
`test_facade_contract.py`), migration counts, and the chapter-continuity
smoke. The AID-554 policy for that class is the **per-wave owner-approved
trailer**, not a path allowlist in the guard:

- each authorized wave carries `SDLC-ALLOW-TEST-EDIT: AID-<n>` on the
  fixture-editing commit; the cited AID records the owner acceptance (wave
  plan / relay / triage), and the PR/receipt discloses which fixtures changed
  and why assertions were not weakened; independent QA verifies pre-merge.
  Proven in CI by PRs #235/#236/#237 (trailers AID-581/593/592) and the
  later O1/O3-C1 waves — all green on the `sdlc-guards` job.
- an **allowlist was considered and rejected**: a standing exception on
  exactly the contract tests that guard learning-gate integrity silences the
  tripwire for the highest-value paths; the coupling condition ("only when
  the same diff flips catalog/content") is decidable only per-diff in the CI
  wrapper, which would fork its semantics away from the canonical PreToolUse
  hooks; and the per-exception AID trail — the "no claims without evidence"
  audit hook — would be lost. The trailer's cost is one chore commit per
  wave, which doubles as the disclosure.
- the guard must still catch the unapproved case, and does: PR #250 head
  `75294395` failed (edited `tests/fakes.ts` without acceptance) and was
  restructured to comply in `e43e5232` (AID-685/AID-676).
- the pre-policy red on main — PR #222 head `4d02ed36` / merge `aa4d6c5b`
  (l21–l23, QA-audited legitimate in the AID-553 GO verdict, obs. 1) —
  predates the trailer practice and is an immutable historical check run,
  not open debt; every main push since is green.

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

Future stages (optional, when this repo grows CI/monitoring): continuous
evals on agent-config changes (eval suite gating `CLAUDE.md`/skills/hook
edits), deterministic control bands writing monitoring findings back as
`intent.md`, and scheduled security scans with findings routed through the
same review gate.
