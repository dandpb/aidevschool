# AID-3039 sweep receipt — 2026-10-13T19:05Z tick (real cycle, issue_monitor_due, ON-TIME +40s) — CLEAN 10th, no #49

## Proactive fallback #5 — executed, stray-root recurrence (fixed in-cycle)

- Wedge persists (pid 18 up since Oct01, AID-4683 restart pending); newest was
  fallback #4 17:07:12Z, age 118m → `paperclipai db:backup` executed.
- **Recurrence:** CLI strayed again — wrote `paperclip-20261013-150619.sql.gz`
  (645,976,500 B = 616.1M) to `/paperclip/.paperclip/instances/default/data/backups/`
  (2nd occurrence; same as fallback #4). **Fix (same cycle):** `gzip -t` OK
  pre-move, `mv` to canonical store, `gzip -t` OK post-move; mtime-UTC
  **2026-10-13T19:07:51Z** (epoch-derived, TZ-safe). Final `backups_check.sh`:
  `OK — newest paperclip-20261013-150619.sql.gz mtime-UTC 2026-10-13T19:07:51Z,
  age 0m, 82 files held; cadence intact, nothing owed` — exit 0. RPO <2h held.
  Stray backups dir now empty (root tree itself still standing, pendency below).
  Next fallback operators: keep verifying landing dir + move on stray (3rd time).

## Backups

`backups_check.sh` (AID-4546 rev3): OK — newest fallback #5 mtime-UTC
2026-10-13T19:07:51Z, age 0m (<2h threshold), 82 files held; cadence intact,
nothing owed (filename is TZ-local, never read as UTC). **Next proactive
fallback #6 due ~21:05Z tick** (age ~2h of the 19:07:51Z archive).

## Passes (single-flight lock, sequential; AGGRESSIVE tier AID-2974 — 86% used >85%, 29G avail)

| pass | result |
|---|---|
| sweep.sh (SWEEP_MIN_AGE_HOURS=1) | 0 dirs, 0 skipped, 0 pendencies |
| aid2949_extended.sh | 37 files + 1 dir (`__pycache__`); 0 quarantined, 6 protected-skipped; ~23MB |
| tmp_pass.sh (TMP_PASS_MIN_AGE_H=2) | r41_body.json + r41_post.json pruned (2MB); pytest-of-node >12h pruned |
| aid3353_extra.sh | 0 eligible; live-refs basis 2 paths |
| aid3353_dirs.sh | 0 eligible; kept surfaces unchanged (locks-1000, oparent_gate.py, state.json) |
| porcelain_default.sh | `porcelain(_default) 2026-10-13T19:09Z: git status --porcelain = 0 lines (branch aid3888/xp-idempotency-v2, HEAD 928fa619)` (AID-1516/AID-3372) |

## Quarantine retention (22nd application)

1 header-only MANIFEST dir purged (>48h) → 208→207 (content-bearing set intact).

## Race watch #49 — CLEAN

Pre-POST GET: status `in_progress`, assigneeAgentId 92d055bc,
activeRecoveryAction none — no flip. Cadence: #48 (18:05Z, aggressive tier)
restored 18:1xZ by recovery owner; this tick clean → 1st since. Monitor
disarmed post-trigger (this tick); re-armed at close below.

## Disk

df after: 29G avail / 86% used (+616M fallback #5 absorbed, −23MB sweep;
alerts at <20G — no condition).

## Standing pendencies (non-deletable by policy)

- beta/school-entry (350MB, repo git) — purpose uncertain, owner decides.
- w2417_gho.env (Sep 18) — cred-adjacent, manual removal by owner.
- Quarantine claimable: aid1501_edit_tracker.py + aid1501_edit_outreach.py.
- /tmp/node-compile-cache/v24.18.0 (root-owned, rm Permission denied) — carried.
- `/paperclip/.paperclip` stray runtime root (28K, config-adjacent) — owner
  decides removal; CLI backup stray-write recurs while it stands (2×).
- Backup scheduler wedge — AID-4683 (restart: CEO 501cb456 / executor 8c58cf6e);
  storage fallback active; next proactive fallback #6 at ~21:05Z tick if wedge
  persists.

## Provenance

Run = this tick session (Storage Engineer 92d055bc, opencode_local); logs
run-20261013T190838Z.log (sweep), run-20261013T190838Z-aid2949.log (in-script),
run-20261013T190908Z-tmp-pass.log, run-20261013T190915Z-aid3353*.log (in-script);
quarantine 22nd application in-session (python3). #50 watch at 20:05Z tick.
