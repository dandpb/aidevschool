# AID-3039 sweep receipt — 2026-10-15T11:05Z tick (real cycle, issue_monitor_due, ON-TIME)

## Race watch — #66 CLEAN

Pre-work GET (11:05Z): harness flip 11:05:04.881Z (issue updatedAt, ~4.9s
after due — family signature). Status stayed `in_progress`, assignee
92d055bc, monitor disarmed normally (post-trigger state) — tick-owned
cycle, no blocked/assignee flip, receipt POST uncontested. Clean streak
since #61: #62–#66 (5 consecutive).

## Backups — fallback #25 EXECUTED (RPO deadline missed by 11s, bounded)

Pre-tick `backups_check.sh`: `OK — newest paperclip-20261015-050519.sql.gz
mtime-UTC 2026-10-15T09:06:48Z, age 118m (<2h threshold), 33 files held`
(filename TZ-local, never read as UTC — AID-4546). RPO guard: 2h deadline
11:06:48Z landed inside this cycle → **fallback opened FIRST at tick start
(11:05:16Z)**. `paperclipai db:backup --data-dir
/paperclip/instances/default/data --json` completed; archive landed
mtime-UTC **11:06:59Z — deadline missed by 11s** (this dump ran 1m43s vs
#24's 1m30s; deadline margin inherits the previous landing time, so the
window was only 1m48s post-tick). Exposure bounded at 11s (newest-before
readable throughout; no data event). CLI stray-write **22nd time** (doubled
path): archive located, `gzip -t` OK pre-move AND post-move, moved to
canonical `paperclip-20261015-070516.sql.gz` (665,407,256 B; filename
TZ-local, never read as UTC), stray tree fully rmdir'd. Post-check: `OK —
newest paperclip-20261015-070516.sql.gz mtime-UTC 2026-10-15T11:06:59Z,
age 0m, 34 files held; cadence intact, nothing owed`. **Fallback #26 due
~13:05Z tick (deadline 13:06:59Z — window ~1m59s post-tick, equally tight;
open FIRST; expected exposure seconds-level if the dump runs long). Real
fix remains scheduler restart (AID-4683, CEO 501cb456 / executor 8c58cf6e)**
— vendor hourly job restores proper margins. `backups/incident-aid4683/` kept.

## Storage head — steady (alert DOWN)

df: 75G avail / 62% used at tick open; transient 72G/64% mid-cycle =
in-flight #25 dump (~665MB), passes' internal tally +6MB net. Conservative
tier throughout (≥20G avail, ≤85% used).

## Passes (single-flight lock, sequential; CONSERVATIVE tier)

| pass | result |
|---|---|
| sweep.sh (6h) | 0 dirs, 0 skipped, 0 pendencies |
| aid2949_extended.sh | 27 files + 1 dir (incl. /paperclip/__pycache__ cache >6h); 0 quarantined, 6 protected-skipped |
| tmp_pass.sh (12h) | 0 eligible beyond routine; 0 quarantined |
| aid3353_extra.sh | 0 eligible; live-refs basis 2 paths |
| aid3353_dirs.sh | 0 eligible; kept surfaces (locks-1000, oparent_gate.py, state.json) |
| porcelain_default.sh | `porcelain(_default) 2026-10-15T11:05Z: git status --porcelain = 0 lines (branch aid3888/xp-idempotency-v2, HEAD 928fa619)` (AID-1516/AID-3372) |

## Quarantine retention (62nd application — census exact-reconciled)

Purged 3 provably-empty dirs >48h (10-13 10:0x cohort crossed the
threshold; no-files + no non-self manifest rows verified pre-rm). Census
(full scope = ALL quarantine children, first-hand file walk): **183 held =
28 content-bearing + 155 empty** — content-bearing EXACTLY matches
corrected baseline (28; aid1501 claimables, literacydojo payloads,
w2711/w2810/w2830/w2858mw, opencode-20260927, aid2952-aid2733 all held).
Arithmetic reconciliation exact: 183 (10:05Z close) − 3 purged + 3 new
pass dirs (110520/110555/110556) = 183; empty 155−3+3=155.

## Standing pendencies (non-deletable by policy)

- beta/school-entry (350MB, repo git) — purpose uncertain, owner decides.
- w2417_gho.env (Sep 18) — cred-adjacent, manual removal by owner.
- Quarantine claimable: aid1501_edit_tracker.py + aid1501_edit_outreach.py.
- /tmp/node-compile-cache/v24.18.0 (root-owned, rm Permission denied) — carried.
- `/paperclip/.paperclip` stray runtime root (28K, config-adjacent) — owner decides;
  CLI backup stray-write streak 22× (deterministic, each fixed in-cycle, zero data impact).
- Backup scheduler wedge AID-4683 — restart pending (CEO 501cb456 / executor 8c58cf6e);
  storage fallback active; **fallback #26 due ~13:05Z tick (deadline 13:06:59Z — tight
  window, open FIRST; real fix = scheduler restart)**.
- Compaction proposal aaffe902 — CEO disposition (stood down as urgent).

## Provenance

Run = this tick session (Storage Engineer 92d055bc, opencode_local); logs
run-20261015T1105*.log + run-fallback25-20261015T110516.log; quarantine
62nd application in-session. #67 watch at 12:05Z tick; fallback #26 at
~13:05Z tick (deadline 13:06:59Z).
