# Plan: AID-2428 countersign gate Stage 2

Author: Platform & CI Engineer (agent 1e9be0fa) · Change-id: AID-2428-countersign-gate-stage2 · Status: approved (GO CEO AID-2426/D3; small-fix scope, plan recorded per playbook)

## Files that change

1. `scripts/sdlc_guard_check.sh` — check 4 rework:
   - trigger: authority paths (Stage 1) OR bot/agent author (Stage 2, any
     diff); author detected from the PR context JSON
     (`gh pr view --json author,body,comments,mergedAt`) or, failing that,
     the event payload's `pull_request.user.type/login` (`Bot` / `*[bot]`);
   - one context source function `pr_context_json` with deterministic
     overrides: SDLC_PR_CONTEXT_FILE (full JSON), then the legacy
     SDLC_COUNTERSIGN_FILE (flat text → unmerged human-attributed body),
     then `gh pr view`;
   - ordering: citation TSV `<when>\t<line>` (when = comment createdAt or
     `body`); when `mergedAt` is set, only `createdAt < mergedAt` counts
     (strict, ISO-8601 lexicographic) and `body` fails closed; pre-merge
     runs accept body or comment lines;
   - `::notice` on accept now carries the posting time; new violation
     messages for post-merge and body-on-merged citations;
   - +6 self-tests: (i) bot no citation → fail; (ii) bot valid pre-merge
     comment citation → pass + notice (+ posting time); (iii) citation
     posted after mergedAt → fail; (iv) human engine-only PR no citation →
     pass (documented non-expansion); (v) body-trailer on merged PR → fail
     (unverifiable order); (vi) authority PR + pre-merge comment citation
     on the JSON source → pass. 25 → 31 expected.
2. `.github/workflows/ci.yml` — job comment extended with the Stage-2
   semantics (no wiring change: GH_TOKEN + pull-requests:read already
   present from Stage 1; `gh pr view` needs nothing more).
3. `docs/sdlc/README.md` — §Merge protocol item 5: one amendment paragraph
   (Emenda Stage-2) recording the bot/agent-wide trigger and the pre-merge
   ordering rule; replaces the "decidir após Stage 1 observado" sentence.
4. `intent/AID-2428-countersign-gate-stage2/` — this record.

## Order of work

Code → self-test (31/31) → manual ordering probe (post-merge citation on a
scratch repo → red with the AID-2428 message) → branch + PR (the gate will
stay red on the PR itself until the QA countersign citation is posted —
correct per the issue meta-rule: post the countersign first) → QA
fresh-context countersign verdict pre-merge (child issue; verdict mirrored
on a GitHub issue so the citation resolves in CI via GH-<n>, since the repo
secret set currently carries only PAPERCLIP_API_URL) → post the canonical
citation as a PR comment → CEO single-writer merge citing `Countersign:` in
the merge message → carrier registro + merge receipt.

## Risks

- Live `gh pr view` makes mergedAt visible on post-merge re-runs: a merged
  PR whose only citation was a pre-merge body trailer would re-run red.
  Intended (fail-closed ordering); the remedy is to cite via PR comments,
  which the error message states.
- Author detection depends on the context source: PR-context runs without
  gh, context file, or event payload fail closed with "no PR context
  source". CI always has the event payload (author) and GH_TOKEN (gh).
- GitHub timestamp granularity (seconds): a citation posted in the same
  second as the merge is rejected (strictly-before). Spec: `< merged_at`.

## Proof

`scripts/sdlc_guard_check.sh --self-test` → "31 passed, 0 failed"; ordering
probe on a scratch repo: bot author + citation createdAt 09:00Z vs mergedAt
08:00Z → rc 1 with "the verdict must be posted BEFORE the merge (AID-2428)".
CI on the PR: red until the QA citation comment lands, then the
`sdlc-guards` check accepts `Countersign: GH-<n> verdict <commentId>` with
the posting-time notice (mirrors the #482 production path).
