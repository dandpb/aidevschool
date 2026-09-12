# AID-417 — PR #193 pre-merge review + merge runbook (blocked on board authorization)

**Owner:** FPE (`fa8130d5-e24e-4f98-8470-ccfeef17c6d5`) · **Date (UTC):** 2026-08-30 ~18:38Z
**PR:** https://github.com/dandpb/aidevschool/pull/193 `aid-412/readiness-v14` → `main`
**Status:** review COMPLETE, merge GREEN; awaiting board-only authorization via confirmation
`8dd3de2f` on AID-417 (`wake_assignee_on_accept`; issue `blocked`, AID-370 precedent).

## Review evidence (all captured in this directory, 2026-08-30 ~18:3xZ)

| Gate | Result |
| --- | --- |
| PR | `open`, `mergeable=true`, `mergeable_state=blocked` (review requirement only) |
| Head | `9a717b8092beed0021c2cc9be3828da9b2c02e02` — single commit, author `AiDevSchool QA Lead` |
| Base | `72130c6d7002fc03d2fccb6a1131d05f7bbab467` == current `main` head (no drift, `strict` ok) |
| CI @ head | 35 checks = 34 success + 1 skipped (pixelDojo matrix, legitimate); 4/4 required contexts green |
| Diff | 14 files +424/−3, all under `docs/product-readiness/` (`diffstat-pr193.txt`) |
| results.ndjson | append-only +9 runs @ `72130c6d`; 0 existing lines touched |
| Assessment | `2026-08-30-72130c6d-os-catalog-v14`: returning-learner pass · voxel-guided-missions pass · literacy-guided-mission conditional-follow-up (gap F1 dispositioned) == AID-412 verdict |
| `cli.py check` | PASS @ head in scratch worktree `/paperclip/tmp/aid417/wt` (`check-log.txt`) |
| PR conversations | 0 reviews, 0 comments |

Prose discrepancy (no content drift): AID-417 says "2 modified + 4 new"; actual 2 modified + 12 new
(assessment x2, observations x1, producer reports x9). QA's final report describes content correctly.

## Why authorization was requested (not merged on QA instruction alone)

House precedent: every protected-branch merge had named board authorization — AID-390 interaction
`bcafbb77` (autorizar-toggle); AID-407 triage items 1/3 naming PRs #190/#191/#192. PR #193 was
created 18:30Z by QA (post-dates both); QA itself logged it as "merge board-only pendente".
QA instruction is necessary, not sufficient, per FPE charter (no protected-branch merge without
CEO approval).

## Runbook for the post-accept wake (pattern AID-390/AID-410, target window <= 5 s)

1. Re-verify no drift: `main` head still `72130c6d…`; PR #193 head still `9a717b8…`, `open`.
2. Toggle-OFF: `PUT /repos/dandpb/aidevschool/branches/main/protection` with body = `prot_before.json`
   verbatim EXACTLY two changes: `required_pull_request_reviews.require_last_push_approval=false`,
   `required_approving_review_count=0`. Verify response shows false/0 and `enforce_admins` true.
3. Merge: `PUT /repos/dandpb/aidevschool/pulls/193/merge`
   `{"sha":"9a717b8092beed0021c2cc9be3828da9b2c02e02","merge_method":"merge"}` (NO squash).
4. Toggle-ON: `PUT` protection restored verbatim (= `prot_before.json` values).
5. Verify: GET protection — programmatic field-by-field diff vs `prot_before.json` must be IDENTICAL;
   GET `branches/main` (new head = merge commit); PR #193 `closed/merged=true`.
6. Archive: `prot_off.json`, `merge_resp.json`, `prot_on.json`, `prot_after.json`, `main_after.txt`,
   `pr193_after.json` here; post confirmation comment on AID-417 with merge SHA + window timestamps;
   set AID-417 done only after QA validates `cli.py check` post-merge (QA closes per accept criteria).
7. Reversion channel: merge without squash → plain `git revert <merge-sha>` is trivial.

Note: production is NOT affected by this merge (docs-only; production stays pinned at
`refs/heads/release/72130c6d` = deploy `6a946c865e010af1557561de`). No promotion follows this landing.
