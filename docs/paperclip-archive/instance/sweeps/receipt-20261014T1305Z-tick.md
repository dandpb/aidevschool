# AID-3039 sweep receipt — 2026-10-14T13:05Z tick (real cycle, issue_monitor_due, ON-TIME)

## Backups — fallback #14 EXECUTED (scheduler wedge AID-4683, storage fallback active)

Pre-tick `backups_check.sh`: newest 11:07:17Z age 118m — inside 2h threshold
but wedge active and no scheduled slot since 11:07Z (RPO guard); fallback
executed per plan from 12:05Z receipt. `paperclipai db:backup --data-dir
/paperclip/instances/default/data --json` completed; CLI stray-write **11th
time** (doubled path `data/instances/default/data/backups/`): archive located,
`gzip -t` OK pre/post move, moved to canonical `paperclip-20261014-090608.sql.gz`
(654,375,901 B, mtime-UTC 2026-10-14T13:07:32Z — filename TZ-local -0400,
never read as UTC), empty stray tree rmdir'd. Post-check: `OK — newest
paperclip-20261014-090608.sql.gz mtime-UTC 2026-10-14T13:07:32Z, age 0m,
91 files held; cadence intact, nothing owed`. **Fallback #15 due ~14:05Z tick.**
Non-gz dir `backups/incident-aid4683/` (uncompressed snapshot 167MB + README,
Oct 13) = known incident evidence, kept — explains ls-count vs gz-count delta.

## Passes (single-flight lock, sequential; AGGRESSIVE tier AID-2974 — 89% used >85%, 22G avail)

| pass | result |
|---|---|
| sweep.sh (SWEEP_MIN_AGE_HOURS=1) | 0 dirs, 0 skipped, 0 pendencies |
| aid2949_extended.sh | 16 files + 1 dir; 0 quarantined, 6 protected-skipped; df delta 17MB |
| tmp_pass.sh (TMP_PASS_MIN_AGE_H=2) | nothing new eligible |
| aid3353_extra.sh | 0 eligible; live-refs basis 2 paths |
| aid3353_dirs.sh | 0 eligible; kept surfaces unchanged (locks-1000, oparent_gate.py, state.json) |
| porcelain_default.sh | `porcelain(_default) 2026-10-14T13:09Z: git status --porcelain = 0 lines (branch aid3888/xp-idempotency-v2, HEAD 928fa619)` (AID-1516/AID-3372) |

## Quarantine retention (40th application)

Purged 1 empty-manifest dir >48h (self-row-only MANIFEST.tsv, zero
quarantined data); 240 held — content-bearing set intact.

## Race watch #56 — CLEAN

Pre-POST GET (13:10Z): status `in_progress`, assigneeAgentId 92d055bc, no
recovery active, monitor nextCheckAt null (normal post-trigger disarm — tick
fired 13:05:40Z). No flip signature; occurrence count stays #54. Clean cycle
#2 post-#54-restore.

## Disk

df after: 22G avail / 89% used — **crossed below 23G**; compaction candidate
threshold <22G is now at the line (per `runbooks/opencode-db-compaction.md`);
alerts at <20G — no condition yet. Backup accumulation ~650MB/2h net of
sweep reclaim is the driver; next tick re-measures.

## Standing pendencies (non-deletable by policy)

- beta/school-entry (350MB, repo git) — purpose uncertain, owner decides.
- w2417_gho.env (Sep 18) — cred-adjacent, manual removal by owner.
- Quarantine claimable: aid1501_edit_tracker.py + aid1501_edit_outreach.py.
- /tmp/node-compile-cache/v24.18.0 (root-owned, rm Permission denied) — carried.
- `/paperclip/.paperclip` stray runtime root (28K, config-adjacent) — owner
  decides removal; CLI backup stray-write now 11× (deterministic while it
  stands — each fixed in-cycle, zero data impact).
- Backup scheduler wedge — AID-4683 (restart: CEO 501cb456 / executor 8c58cf6e);
  storage fallback active; fallback #15 due ~14:05Z tick.

## Provenance

Run = this tick session (Storage Engineer 92d055bc, opencode_local); logs
run-20261014T130839Z.log (sweep, in-script), run-20261014T130839Z-aid2949.log
(in-script), run-20261014T130909Z-tmp-pass.log, run-20261014T130910Z-aid3353*.log
(in-script); fallback #14 + quarantine 40th application in-session. #57 watch
at 14:05Z tick.
