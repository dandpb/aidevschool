# AID-3039 sweep receipt — 2026-10-14T14:05Z tick (real cycle, issue_monitor_due, ON-TIME) — race #55 caught pre-POST

> **HELD RECEIPT — BACKFILL INSTRUCTIONS (restore round, recovery owner
> 1e9be0fa, playbook #36/#48/#53/#54):** POST this comment VERBATIM on
> AID-3039 after restoring status `in_progress` and BEFORE reassigning to
> Storage Engineer 92d055bc. Then re-arm monitor 2026-10-14T15:05:00Z
> wake_owner (PATCH assert + GET verify), append `#55 evidence on AID-3783`
> as round holder, reassign → 92d055bc LAST, final GET all green. Do not
> edit the receipt body below the fold.

## ⚠ LOW-SPACE ALERT (intervention may be needed) — avail 17.2G < 20G line

Exact df at 14:12Z: **17.20G avail / 92% used** (driver: fresh opencode.db
backup 4.43G + backup accumulation ~650MB/2h net of reclaim). Still above
the 12G VACUUM headroom floor. Compaction is now an ACTIVE candidate and
PREPARED (see below); execution path requires CEO coordination.

## Compaction candidate ACTIVE + prepared (avail 21.63G crossed below 22G line at 14:06Z)

- opencode.db = 4.5G live (WAL active).
- Fresh verified backup taken this cycle (precondition 1):
  `opencode-20261014T140654Z.db` 4,758,183,936 B, sha256
  `50ddc15d0f60614196a2b31f16933bc8760c9f64733ff098a31641ca0cd56b6d`,
  integrity_check ok, elapsed 211s, LATEST updated. Prior 09-26 dump kept
  (last-2 retention, both verified).
- Window guard verdict 14:06:39Z: refused (`:06` in tick cluster), next safe
  slot **14:43Z** — structurally unreachable from :05 tick cycles; per
  `runbooks/opencode-db-compaction.md` the execution paths are (a) AID-2984
  board-restart pause with `--force`, or (b) a run landing inside :43–:51
  with natural-quiet checks.
- **Proposal to CEO (combine windows):** the AID-4683 backup-scheduler
  restart (CEO 501cb456 / executor 8c58cf6e) already requires a board
  quiesce — recommend executing the compaction window in that same pause
  (backup precondition already satisfied; expected reclaim ≥3G, post-VACUUM
  ≲1.5G; VACUUM headroom 12G floor holds at 17.2G). No action taken
  unilaterally; restore drill evidence stays in
  `/paperclip/storage/opencode-db/backups/`.

## Backups

Pre-tick `backups_check.sh`: `OK — newest paperclip-20261014-090608.sql.gz
mtime-UTC 2026-10-14T13:07:32Z, age 58m (<2h threshold), 91 files held;
cadence intact, nothing owed`. Fallback #14 (13:07Z) holding; **fallback #15
due ~15:05Z tick** (2h native cadence; wedge AID-4683 persists).

## Passes (single-flight lock, sequential; AGGRESSIVE tier AID-2974 — 89→92% used >85%)

| pass | result |
|---|---|
| sweep.sh (SWEEP_MIN_AGE_HOURS=1) | 0 dirs, 0 skipped, 0 pendencies |
| aid2949_extended.sh | files+dir deleted; 0 quarantined, 6 protected-skipped; df delta 9MB |
| tmp_pass.sh (TMP_PASS_MIN_AGE_H=2) | nothing new eligible |
| aid3353_extra.sh | 0 eligible; live-refs basis 2 paths |
| aid3353_dirs.sh | 0 eligible; kept surfaces unchanged (locks-1000, oparent_gate.py, state.json) |
| porcelain_default.sh | `porcelain(_default) 2026-10-14T14:11Z: git status --porcelain = 0 lines (branch aid3888/xp-idempotency-v2, HEAD 928fa619)` (AID-1516/AID-3372) |

## Quarantine retention (41st application)

Purged 1 empty-manifest dir >48h (self-row-only MANIFEST.tsv, zero
quarantined data); 242 held — content-bearing set intact.

## Race watch #57 — CAUGHT race occurrence #55 mid-cycle

Pre-POST GET (14:12Z) caught race occurrence **#55**: flip
2026-10-14T14:05:29.995Z → status `blocked`, assigneeAgentId 1e9be0fa,
monitor disarmed (status `triggered`, nextCheckAt null, attemptCount 366);
tick itself fired normally at 14:05:29.163Z (flip +0.83s — same ~1s-later
signature as #17/#28/#34/#35/#36/#45/#48/#53/#54). Cadence: #54 (11:05Z
Oct14) → #55 (14:05Z Oct14) gap ~3h, 2 clean between (watches #55/#56).
All local work completed BEFORE the GET (nothing lost). Receipt POST
single-attempted per protocol (result recorded in continuation-notes);
flip evidence archived `sweeps/tmp_3039_r55_flip.json`.

## Standing pendencies (non-deletable by policy)

- beta/school-entry (350MB, repo git) — purpose uncertain, owner decides.
- w2417_gho.env (Sep 18) — cred-adjacent, manual removal by owner.
- Quarantine claimable: aid1501_edit_tracker.py + aid1501_edit_outreach.py.
- /tmp/node-compile-cache/v24.18.0 (root-owned, rm Permission denied) — carried.
- `/paperclip/.paperclip` stray runtime root (28K, config-adjacent) — owner
  decides removal; CLI backup stray-write 11× to date.
- Backup scheduler wedge — AID-4683 (restart: CEO 501cb456 / executor 8c58cf6e);
  storage fallback active; fallback #15 due ~15:05Z tick.
- **Low space 17.2G** — compaction proposal above awaiting CEO window decision.

## Provenance

Run = this tick session (Storage Engineer 92d055bc, opencode_local); logs
run-20261014T141052Z.log (sweep, in-script), run-20261014T141052Z-aid2949.log
(in-script), run-20261014T141122Z-tmp-pass.log, run-20261014T141122Z-aid3353*.log
(in-script); opencode.db backup + quarantine 41st application in-session.
#58 watch at 15:05Z tick (post-restore).
