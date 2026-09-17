# Plan: AID-2318 countersign gate (Stage 1)

Author: FPE (agent 1e9be0fa) · Change-id: AID-2318-countersign-gate · Status: approved (CEO decision AID-2316 c; small-fix scope, plan recorded per playbook)

## Files that change

1. `scripts/sdlc_guard_check.sh` — new check 4: PR-context detection
   (`GITHUB_EVENT_NAME=pull_request*` or `GITHUB_REF=refs/pull/*/{merge,head}`),
   process-authority path set, citation collection (SDLC_COUNTERSIGN_FILE,
   else `gh pr view --json body,comments`), citation regex
   `^Countersign: (AID|GH)-[1-9][0-9]* verdict <ref>$`, resolution via
   `SDLC_GUARD_AID_RESOLVER`, `::notice` on accept, `::error` violations
   fail-closed otherwise. +3 self-tests ((i) no citation → fail; (ii) valid
   citation → pass + notice; (iii) ghost AID → fail), 22 → 25 expected.
2. `scripts/sdlc_aid_resolve.sh` (new, executable) — resolver contract:
   GH-<n> via `gh api`, AID-<n> via Paperclip board
   (PAPERCLIP_API_URL/PAPERCLIP_API_TOKEN); exit 0 exists / 1 missing /
   2 transport / 3 auth / 4 unconfigured / 5 usage.
3. `.github/workflows/ci.yml` — guard step gets GH_TOKEN, resolver path and
   Paperclip secrets env; job comment extended.
4. `docs/sdlc/README.md` — §Merge protocol item 5 (binding rules 1+2 and the
   mechanical gate as AID-1515 §3 enforcement; Stage 2 explicitly deferred).
5. `intent/AID-2318-countersign-gate/` — this record.

## Order of work

Code → self-test (25/25) → branch diff guard run (push context: gate skips;
PR context simulated with real resolver + citation citing AID-2318) → branch +
PR (PR body declares the gate will stay red until the countersign citation is
posted — correct per meta-rule) → QA countersign child issue (fresh-context) →
CEO single-writer merge order child issue citing `Countersign:` in the merge
message.

Board API key (PAPERCLIP_API_URL/PAPERCLIP_API_TOKEN repo secrets): **NOT
minted by FPE** — minting requires a founder board session (`actor: board`),
and placing a full board key in CI secrets is a founder trust decision.
Registered as founder pendência on carrier AID-2292. Until configured, AID-
citations fail-closed in CI; GH-<n> citations resolve via gh today, so the
countersign path is live either way (QA verdict mirrored as a GitHub issue +
`Countersign: GH-<n> verdict <commentId>`).

## Risks

- Board key in repo secrets: read-scoped key, fork PRs never see it (their
  AID- citations fail closed — intended for process authority).
- Resolver outages would fail-close process PRs (acceptable; message names
  the env vars).
- Stale base ref (AID-1272) unchanged: ci.yml already resolves the current
  base tip.

## Proof

`scripts/sdlc_guard_check.sh --self-test` → "25 passed, 0 failed"; PR-context
simulation on this branch: without citation file → rc 1 with AID-2318
violation; with `Countersign: AID-2318 verdict <id>` + real resolver → rc 0 +
notice. CI green (except the gate itself until the QA verdict citation is
posted, by design).
