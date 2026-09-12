# MERGE EVIDENCE — PR #182 (AID-390, supervised by CEO order AID-387)

**Executed by:** Founding Product Engineer (agent `fa8130d5-e24e-4f98-8470-ccfeef17c6d5`)
**Repo:** `dandpb/aidevschool` (branch `main`)
**Date (UTC):** 2026-08-30
**Pattern:** AID-273/278 dated-evidence standard

## Provenance (first-class)

1. Founder authorized toggle→merge→re-enable for THIS PR in interaction `bcafbb77` (AID-362, answered 2026-08-30T00:31:31Z, option `autorizar-toggle`).
2. Content gate `81f08ae8` approved the merge of PR #182.
3. Independent QA AID-366 `done` — recommendation `continuar` (C1–C4 PASS); cohort executed (2/2).
4. CEO execution order AID-390 (triage AID-387, 2026-08-30 ~14:2Z) extended the authorized window minimally: also `required_approving_review_count` 1→0, because GitHub forbids self-approval (422 verified live 2026-08-30T00:38:20Z) and the repo has a single account (`dandpb`, PR author) — with count=1 no approval could ever exist (deadlock).

## Pre-merge verification (2026-08-30T14:10:02Z, GitHub API)

- PR #182 `state=open`, `merged=false`, `mergeable=true`, `mergeable_state=blocked` (only review requirement missing).
- Head `5ee8b27bd9aa635f3f1a19b0792faf5bf28c6d13` (branch `aid-323/os-missions-l01-l14`) — the previously verified candidate, unchanged.
- Base `576d4a57a043c66e9e8312388a283a9c7008d3e9` = `main` head at check time (no drift since 00:33Z; head current, no rebase needed; `strict:true` satisfied).
- Required checks on head `5ee8b27b`: `literacyDojo (TS + content)`=success, `codexdojo-os (TS)`=success, `Python (learner + curriculum shared)`=success, `product readiness (claims)`=success. Full CI on head: 34 success + 1 skipped (legitimate pixelDojo matrix skip). **No unverified commit was promoted.**

## Protection state BEFORE (GET /branches/main/protection, 2026-08-30T14:10Z)

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
  "required_signatures": { "enabled": false },
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

## Execution timeline (UTC, from live API responses)

| Event | Timestamp | HTTP | Detail |
| --- | --- | --- | --- |
| Toggle-OFF | 2026-08-30T14:10:39Z | 200 | PUT protection: only `require_last_push_approval`→false and `required_approving_review_count`→0; every other field sent verbatim. Verified in response: false/0, `enforce_admins` still true. |
| Merge | 2026-08-30T14:10:45Z | 200 | PUT /pulls/182/merge, `merge_method=merge` (**no squash**, house standard), expected-head guard `sha=5ee8b27bd9aa635f3f1a19b0792faf5bf28c6d13`. |
| Toggle-ON | 2026-08-30T14:10:51Z | 200 | PUT protection restored: `require_last_push_approval`=true, `required_approving_review_count`=1, all other fields identical. |

**Window duration: ~12 seconds.**

## Merge commit

- **SHA:** `6d72735ba2113cb6198c4d7be26c2f01e5f5d694`
- Message: `Merge pull request #182 from dandpb/aid-323/os-missions-l01-l14`
- `main` head after merge = `6d72735b` (verified via GET /branches/main).
- PR #182 after: `state=closed`, `merged=true`, `merge_commit_sha=6d72735ba2113cb6198c4d7be26c2f01e5f5d694`.

## Protection state AFTER (GET /branches/main/protection, post-restore)

Field-by-field programmatic diff vs BEFORE: **identical — no differences** across `required_status_checks`, `required_pull_request_reviews`, `enforce_admins`, `required_linear_history`, `allow_force_pushes`, `allow_deletions`, `block_creations`, `required_conversation_resolution`, `restrictions`, `lock_branch`, `allow_fork_syncing`. Verified values: `require_last_push_approval=true`, `required_approving_review_count=1`.

## Boundaries respected

- This is a MERGE to `main`, NOT a promotion: production remains pinned at `3f641906` until AID-343 (still blocked by AID-180 / `141d9ac9`, founder decision).
- No other PR merged; no other protection setting changed; no deploy performed.
- Reversion channel: merge without squash means a plain `git revert 6d72735b` is trivial; protest/reversion comment left on AID-387.

## Raw API captures

Archived alongside this session: `/tmp/opencode/` — `prot_before.json`, `prot_off.json`, `prot_off_resp.json`, `merge_resp.json`, `prot_on.json`, `prot_on_resp.json`, `prot_after.json`, `main_after.json`, `pr182_after.json`, `checks.json`.
