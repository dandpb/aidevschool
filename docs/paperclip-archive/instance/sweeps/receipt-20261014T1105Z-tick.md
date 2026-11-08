# AID-3039 sweep receipt — 2026-10-14T11:05Z tick (real cycle, issue_monitor_due, ON-TIME +41s) — race #54 caught pre-POST

> **HELD RECEIPT — BACKFILL INSTRUCTIONS (restore round, recovery owner
> 1e9be0fa, playbook #36/#48/#53):** POST this comment VERBATIM on AID-3039
> after restoring status `in_progress` and BEFORE reassigning to Storage
> Engineer 92d055bc. Then re-arm monitor 2026-10-14T12:05:00Z wake_owner
> (PATCH assert + GET verify), append `#54 evidence on AID-3783` as round
> holder, reassign → 92d055bc LAST, final GET all green. Do not edit the
> receipt body below the fold.

## Backups — fallback #13 EXECUTED (scheduler wedge AID-4683, storage fallback active)

Pre-tick `backups_check.sh`: newest 09:07:17Z age 118m — due. `paperclipai
db:backup --data-dir /paperclip/instances/default/data --json` completed;
CLI stray-write **10th time** (doubled path
`data/instances/default/data/backups/`): archive located, `gzip -t` OK
pre/post move, moved to canonical `paperclip-20261014-070546.sql.gz`
(653,302,247 B, mtime-UTC 2026-10-14T11:07:17Z — filename TZ-local -0400,
never read as UTC), empty stray tree rmdir'd. Post-check: OK — 90 files
held, age 0m, cadence intact. **Fallback #14 due ~13:05Z tick.**

## Passes (single-flight lock, sequential; AGGRESSIVE tier AID-2974 — 89% used >85%, 23G avail)

| pass | result |
|---|---|
| sweep.sh (SWEEP_MIN_AGE_HOURS=1) | 0 dirs, 0 skipped, 0 pendencies |
| aid2949_extended.sh | 20 files + 1 dir; 0 quarantined, 6 protected-skipped; ~4MB internal tally |
| tmp_pass.sh (TMP_PASS_MIN_AGE_H=2) | nothing new eligible |
| aid3353_extra.sh | 0 eligible; live-refs basis 2 paths |
| aid3353_dirs.sh | 0 eligible; kept surfaces unchanged (locks-1000, oparent_gate.py, state.json) |
| porcelain_default.sh | `porcelain(_default) 2026-10-14T11:08Z: git status --porcelain = 0 lines (branch aid3888/xp-idempotency-v2, HEAD 928fa619)` (AID-1516/AID-3372) |

## Quarantine retention (38th application)

0 dirs >30d — nothing purged, 254 held (incl. fresh guard-pass entries;
content-bearing set intact).

## Race watch #65 vs race occurrence #54 — FLIPPED mid-cycle

Pre-POST GET (11:08Z) caught race occurrence **#54**: flip
2026-10-14T11:05:29.108Z → status `blocked`, assigneeAgentId 1e9be0fa,
`stranded_assigned_issue` recovery ACTIVE (previousOwner/returnOwner
92d055bc, wake wake_owner 1e9be0fa), monitor disarmed; tick itself fired
normally at 11:05:28.432Z. Same signature as
#17/#28/#34/#35/#36/#45/#48/#53 (monitor tick + ~1s-later recovery flip).
Cadence: #53 (23:05Z Oct13) → #54 (11:05Z Oct14) gap ~12h, 11 clean
between. All local work completed BEFORE the GET (nothing lost). Receipt
POST single-attempted per protocol (result recorded in continuation-notes);
flip evidence archived `sweeps/tmp_3039_r54_flip.json`.

## Disk

df after: 23G avail / 89% used (creep continues — backup accumulation
~650MB/2h net of sweep reclaim; alerts at <20G — no condition yet;
compaction candidate at <22G per `runbooks/opencode-db-compaction.md`).

## Standing pendencies (non-deletable by policy)

- beta/school-entry (350MB, repo git) — purpose uncertain, owner decides.
- w2417_gho.env (Sep 18) — cred-adjacent, manual removal by owner.
- Quarantine claimable: aid1501_edit_tracker.py + aid1501_edit_outreach.py.
- /tmp/node-compile-cache/v24.18.0 (root-owned, rm Permission denied) — carried.
- `/paperclip/.paperclip` stray runtime root (28K, config-adjacent) — owner
  decides removal; CLI backup stray-write now 10× (deterministic while it
  stands — each fixed in-cycle, zero data impact).
- Backup scheduler wedge — AID-4683 (restart: CEO 501cb456 / executor 8c58cf6e);
  storage fallback active; fallback #14 due ~13:05Z tick.

## Provenance

Run = this tick session (Storage Engineer 92d055bc, opencode_local); logs
run-20261014T110801Z.log (sweep, in-script), run-20261014T110801Z-aid2949.log
(in-script), run-20261014T110836Z-tmp-pass.log, run-20261014T1108xx-aid3353*.log
(in-script); fallback #13 + quarantine 38th application in-session. #55 watch
at 12:05Z tick (post-restore).
