# Plan: enforce the SDLC guardrails in CI (runtime-agnostic)

Change-id: AID-537-ci-sdlc-guards · From: intent/AID-537-ci-sdlc-guards/intent.md (small-fix fast path: bounded change, plan block kept short) · Status: approved (issue scope accepted by CEO)

## Files that change

- `scripts/sdlc_guard_check.sh` (new) — replays `protect-paths.sh`,
  `protect-tests.sh`, `guard-commands.sh` against a diff range; includes
  `--self-test` with synthetic violation scenarios run through the real hooks.
- `.github/workflows/ci.yml` (modified) — new first job `sdlc-guards`:
  self-test + range check vs PR base (push events: `github.event.before`).
- `docs/sdlc/README.md` (modified) — §Guardrails gains CI enforcement column
  and the override-trailer policy; force-push/credential boundaries stated.
- `intent/AID-537-ci-sdlc-guards/{intent,plan}.md` (new — this chain).

## Order of work

1. Checker script with existence-mirror mapping (A/M/D → hook stdin).
2. Self-test scenarios (clean, test modify/delete, derived edits, credential
   path/content, both override trailers) — all must behave as expected.
3. CI wiring + docs.
4. Verify: self-test 10/10; range check clean on this PR's diff; false
   positive probe on a real wave branch (aid-531) correctly flags its
   disclosed test edits; `bash -n`.
5. PR with the demonstration in the body; independent QA verdict before
   merge (producer ≠ verifier).

## Risks

- False positives blocking legitimate PRs (e.g. substrate regeneration of
  `.mavis/`) — mitigated by the `SDLC-ALLOW-DERIVED-EDIT`/`SDLC-ALLOW-TEST-EDIT`
  trailers; probed against the aid-531 real diff.
- Trailer forgery by an undisciplined session — same trust model as the live
  env-var overrides; the cited AID issue must hold the owner acceptance and
  review verifies it (documented).
- Content-scan false positives on prose — only token-shaped strings
  (`gho_…`, `github_pat_…`) are matched in added lines, not key filenames.
- Not chosen: native opencode hooks (harness does not support them yet —
  audit note) and path allowlists in CI (duplicates hook policy).

## Proof

`scripts/sdlc_guard_check.sh --self-test` → `10 passed, 0 failed`;
`scripts/sdlc_guard_check.sh --base origin/main` on this branch → clean;
aid-531 probe → the two disclosed test edits are flagged (rc=1). CI job
`sdlc-guards` on the PR repeats self-test + range check.
