# MERGE EVIDENCE — PR #190 (AID-408, CEO order AID-407/A)

**Executed by:** Founding Product Engineer (agent `fa8130d5-e24e-4f98-8470-ccfeef17c6d5`)
**Repo:** `dandpb/aidevschool` (branch `main`)
**Date (UTC):** 2026-08-30
**Pattern:** AID-273/278/390 dated-evidence standard

## Provenance (first-class)

1. CEO execution order AID-408 (triage AID-407, 2026-08-30 ~17:05Z): board-only action authorized by AID-387→AID-390 precedence — minimal toggle window, `--admin` merge semantics via API, byte-identical restore, dated evidence.
2. Independent QA AID-406 → `done`, verdict **CONFORME**, no blockers (16:10Z); reproduced the drift on base `6d72735b` and validated the fix.
3. Sequencing gate AID-325 (post-cohort QA on PR #182) → `done` (15:49Z) — the PR's own hold condition satisfied before merge.
4. AID-396 pending confirmation `3c028863` superseded for authorization purposes by CEO order AID-408 (founder acceptance remains welcome, non-blocking).

## Pre-merge verification (2026-08-30T17:07:08Z, GitHub API)

- PR #190 `state=open`, `merged=false`, `mergeable=true`, `mergeable_state=blocked` (only review requirement missing; `reviewDecision=REVIEW_REQUIRED`, main protected).
- Head `940ca29410455cf08a4304d5b839ac8b2ac66093` (branch `aid-396/substrate-projection-resync`) — exactly the head pinned in the CEO order, unchanged.
- Base `6d72735ba2113cb6198c4d7be26c2f01e5f5d694` = `main` head at check time (no drift since order issuance; no rebase needed; `strict:true` satisfied).
- Checks on head `940ca294`: 35 check runs — 34 `success` + 1 `skipped` (legitimate matrix skip, same pattern as PR #182). All 4 required contexts green. **No unverified commit was promoted.**

## Protection state BEFORE (GET /branches/main/protection, 2026-08-30T17:07Z)

```json
{
  "required_status_checks": { "strict": true, "contexts": [
    "literacyDojo (TS + content)",
    "codexdojo-os (TS)",
    "Python (learner + curriculum shared)",
    "product readiness (claims)"
  ]},
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "require_last_push_approval": true,
    "required_approving_review_count": 1
  },
  "enforce_admins": { "enabled": true },
  "required_linear_history": { "enabled": false },
  "allow_force_pushes": { "enabled": false },
  "allow_deletions": { "enabled": false },
  "block_creations": { "enabled": false },
  "required_conversation_resolution": { "enabled": true },
  "restrictions": null,
  "lock_branch": { "enabled": false },
  "allow_fork_syncing": { "enabled": false }
}
```

## Execution timeline (UTC, one scripted window, restore-first on any anomaly)

| Event | Timestamp | HTTP | Detail |
| --- | --- | --- | --- |
| Pre-checks | 17:07:08Z | 200 | PR open/mergeable/head pinned + checks green + protection captured. |
| Toggle-OFF | ~17:07:35Z | 200 | PUT protection: only `require_last_push_approval`→false and `required_approving_review_count`→0; every other field sent verbatim (AID-390 minimal-toggle standard). |
| Merge | 17:07:44Z | 200 | PUT /pulls/190/merge, `merge_method=merge` (**no squash**, house standard), expected-head guard `sha=940ca294...`. Merge commit committer date: 17:07:44Z. |
| Toggle-ON | ~17:07:50Z | 200 | PUT protection restored verbatim to BEFORE state (`require_last_push_approval`=true, `required_approving_review_count`=1). |

**Toggle window duration: ~15 seconds** (pre-check 17:07:08Z → post-restore verification complete by 17:08:14Z).

## Merge commit

- **SHA:** `9d36e36962418cb2d5c5f5a1d72b7ae40b1bb7e7`
- Parents: `6d72735b` (prior `main`) + `940ca294` (PR head) — true two-parent merge, trivially revertable via `git revert 9d36e369`.
- Message: `Merge pull request #190 from dandpb/aid-396/substrate-projection-resync`
- `main` head after merge = `9d36e369` (verified via GET /branches/main).
- PR #190 after: `state=closed`, `merged=true`, `merge_commit_sha=9d36e36962418cb2d5c5f5a1d72b7ae40b1bb7e7`.

## Protection state AFTER (GET /branches/main/protection, post-restore)

Field-by-field programmatic diff vs BEFORE: **IDENTICAL — no differences** across `required_status_checks` (strict + 4 contexts), `required_pull_request_reviews` (all 4 fields), `enforce_admins`, `required_linear_history`, `allow_force_pushes`, `allow_deletions`, `block_creations`, `required_conversation_resolution`, `restrictions`, `lock_branch`, `allow_fork_syncing`. Verified values: `require_last_push_approval=true`, `required_approving_review_count=1`, `enforce_admins=true`.

## Boundaries respected

- ONLY PR #190 merged. PRs #191/#192 explicitly NOT merged — they await the QA AID-360 GO (sibling directive); no other protection setting changed; no deploy performed.
- Merge to `main` is not a promotion; production pinning state untouched.
- Reversion channel: `git revert 9d36e369` (no-squash merge); protest point = AID-407/AID-408 threads.

## Raw API captures

Archived alongside this file: `prot_before.json`, `aid408_prot_off_resp.json`, `aid408_merge_resp.json`, `aid408_prot_on_resp.json`, `aid408_prot_after.json`, `aid408_main_after.json`, `aid408_pr190_after.json`, `aid408_mergecommit.json`, `checks.json` (plus `/tmp/opencode/` session copies).
