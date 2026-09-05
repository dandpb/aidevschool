# Plan: SDLC guardrail policy for legitimate test-fixture edits (ratify the per-wave trailer)

Change-id: AID-554-sdlc-test-edit-policy · From: intent/AID-554-sdlc-test-edit-policy/intent.md
(small-fix fast path: bounded docs-only change, plan block kept short) · Status: approved
(issue scope dispatched to FPE; A/B sign-off requested from CEO pre-merge)

## Policy decision proposed (Option B — ratify the per-wave trailer)

- **Chosen:** every authorized content-wave edit to existing test files carries
  `SDLC-ALLOW-TEST-EDIT: AID-<n>` on the fixture-editing commit; the cited AID issue
  records the owner acceptance (wave plan / relay / triage); the PR/receipt discloses
  which fixtures changed and why assertions were not weakened; independent QA verifies
  pre-merge. No standing path allowlist.
- **Rejected — Option A (allowlist in the guard):** a standing exception on exactly the
  contract-test files that guard learning-gate integrity (content_contract, facade
  contract, migration counts, chapter-continuity) silences the tripwire for the
  highest-value paths; the coupling condition ("when accompanied by a catalog flip") is
  only decidable per-diff in the CI wrapper, forking wrapper semantics away from the
  canonical PreToolUse hooks; and per-exception evidence (the AID trail) would be lost —
  contra "producer ≠ verifier / no claims without evidence". The per-wave trailer cost
  is one chore commit per wave and doubles as the audit disclosure.
- **Rejected — Option C (status quo):** leaves the policy unwritten; every future wave
  rediscovers the dance and the pre-policy red stays unexplained.
- **Historical red:** PR #222 head `4d02ed36` / merge `aa4d6c5b` (l21–l23, QA-audited
  legitimate in AID-553 obs. 1) predates the trailer practice; its check run is an
  immutable historical record. Main HEAD and every content-wave merge since
  (#235/#236/#237, O1, O3-C1) are green — evidence, not promise.

## Files that change

- `docs/sdlc/README.md` (modified) — §Guardrails gains the AID-554 policy subsection:
  the trailer protocol for content-wave fixture edits, the rejection rationale for the
  allowlist, and the note on the immutable pre-policy red.
- `intent/AID-554-sdlc-test-edit-policy/{intent,plan}.md` (new — this chain).

## Order of work

1. intent/plan (this chain).
2. docs/sdlc/README.md policy subsection.
3. Verify: `scripts/sdlc_guard_check.sh --self-test` → all scenarios pass (mechanism
   intact, unchanged); `scripts/sdlc_guard_check.sh --base origin/main` on the branch →
   clean (docs-only diff needs no trailer).
4. Branch `aid-554/sdlc-test-edit-policy`; PR citing the check-run evidence; CI green
   (job `SDLC guardrails (diff)` must be `success` on the PR head).
5. AID-554: decision brief comment; `request_confirmation` interaction for the CEO
   (Option B vs A vs C); independent QA verdict pre-merge; merge only after CEO
   acceptance; then close AID-554 `done` with the merge SHA.

## Risks

- CEO may prefer Option A — mitigation: the confirmation interaction decides before
  merge; this PR is cheap to supersede and the allowlist variant stays scoped in the
  issue.
- Policy text drifts from guard behavior — mitigation: the subsection names the exact
  job, script, and trailer syntax, and CI's self-test step continuously proves the
  mechanism the policy relies on.

## Proof

- `bash scripts/sdlc_guard_check.sh --self-test` → `self-test: 10 passed, 0 failed`
  (unchanged script; proves the trailer path the policy depends on).
- `bash scripts/sdlc_guard_check.sh --base origin/main` (repo root, on the branch) →
  `sdlc-guard: clean (...)` with 2 added / 0 modified tracked-code files.
- PR checks: `SDLC guardrails (diff)` = success on the PR head SHA.

## Verification split

Independent QA (Paperclip QA Lead) reviews the PR diff against this plan + the intent:
(a) policy text matches the guard's actual mechanics (trailer syntax, job name);
(b) no assertion anywhere that the docs change alters runtime behavior; (c) the
evidence citations (PRs #222/#235/#236/#237, `aa4d6c5b`, `a10158d4`, `75294395`,
`e43e5232`) check out. CEO accepts the A/B policy via the issue interaction.
