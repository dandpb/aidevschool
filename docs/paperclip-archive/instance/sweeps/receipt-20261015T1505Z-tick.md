# AID-3039 sweep receipt — 2026-10-15T15:05Z tick (real cycle, issue_monitor_due, ON-TIME)

## Race watch — #70 CLEAN

Pre-work GET (15:06Z): harness flip 15:05:06.192Z (~6.2s after due — family
signature). Status stayed `in_progress`, assignee unchanged, monitor
disarmed normally (post-trigger) — tick-owned, receipt uncontested.
Streak: #69–#70 clean.

## Fallback #27 — landed 15:07:43Z, VERIFIED (RPO never at risk)

First attempt 15:05:19Z failed fast: `paperclip` not on PATH (correct
binary: `paperclipai`) — ~40s lost. Relaunched 15:06:00Z; landed
**15:07:43Z** `paperclip-20261015-110608.sql.gz` 667,830,708B (deadline
15:06:51Z missed by ~52s) — BUT the 2h RPO was already covered by a
natural backup at **14:24:11Z** (`102241`, 667,295,289B), age ~42m at
deadline → no RPO breach. gzip -t OK post-move. Stray-write streak **24th**:
CLI wrote to `/paperclip/.paperclip/instances/default/data/backups/` —
moved to canonical dir, gzip -t verified, empty stray subpath removed
(stray `.paperclip` root itself remains owner-decision pendency).
Interim observation: 14:24:11Z natural backup + count 35→27 prune
(~14:2xZ, pre-decision executor manual purge, consistent with AID-4789
context).

## FOUNDER DECISION AID-4789 APPLIED — backup retention = rolling 48h + 3 daily anchors

CEO decision (card `210313d0`, answered 14:15:53Z; **CEO POST to this
thread got 403 at 14:17:52Z — never landed; received first-hand from
server.log reqBody, provenance agent=501cb456 run=3733e8bd**):
keep last 48h rolling + 3 daily anchors; purge excess; no code-change;
df re-check until applied+verified; manual-purge fallback ends after.

Applied this tick (now 15:14Z, cutoff 10-13T15:12Z), inventory 28 files:

| bucket | files | disposition |
|---|---|---|
| in-window 48h (mtime ≥ 10-13T15:12Z) | 21 (9×10-15, 12×10-14, incl. 4×10-13 ≥17:07Z) | kept |
| daily anchors beyond window | 2 exist (10-13 anchor 15:07:21Z `110553`; 10-12 anchor 23:48:34Z `194710`) | kept |
| excess beyond rule | 1: `paperclip-20261013-090552.sql.gz` (mtime 10-13T13:07:23Z, 643,220,890B, sha256 3029cfee8439…) | **PURGED** |

Post-purge verify: `backups(AID-4546): OK — newest
paperclip-20261015-110608.sql.gz mtime-UTC 2026-10-15T15:07:43Z, age 3m,
27 files held; cadence intact, nothing owed`. **Rule applied and
verified this tick** → per decision: manual-purge fallback ENDS; df
re-check stays routine (below). Re-application next tick will be
idempotent (oldest in-window ages out ~1 file/h).

## Storage head — steady (alert DOWN)

df 15:14Z post-purge: **75G avail / 62% used**. Conservative tier.

## Passes (single-flight lock, sequential; CONSERVATIVE tier)

| pass | result |
|---|---|
| sweep.sh (6h) | 0 dirs, 0 skipped, 0 pendencies |
| aid2949_extended.sh | 26 files + 1 dir; 0 quarantined, 6 protected-skipped |
| tmp_pass.sh (12h) | routine pytest-of-node prune >12h; 0 quarantined |
| aid3353_extra.sh | 0 eligible; live-refs basis 2 paths |
| aid3353_dirs.sh | 0 eligible; kept surfaces (locks-1000, oparent_gate.py, state.json) |
| porcelain_default.sh | `porcelain(_default) 2026-10-15T15:07Z: git status --porcelain = 0 lines (branch aid3888/xp-idempotency-v2, HEAD 928fa619)` (AID-1516/AID-3372) |

## Quarantine retention (66th application — census first-hand)

Purged 2 provably-empty >48h (10-13 15:07/15:08 cohort, manifest-only
self-row verified pre-rm: aid2949-20261013T150744Z, tmp-20261013T150813Z).
Census (payload test = real file besides MANIFEST.tsv): **184 = 28
payload-bearing + 155 no-payload (51 empty protected-markers + 105
manifest-only)**; arithmetic exact: 183 (14:05Z close) + 3 new pass dirs
− 2 purged = 184. Payload set unchanged (28, matches baseline).

## Standing pendencies (non-deletable by policy)

- beta/school-entry (350MB, repo git) — purpose uncertain, owner decides.
- w2417_gho.env (Sep 18) — cred-adjacent, manual removal by owner.
- Quarantine claimable: aid1501_edit_tracker.py + aid1501_edit_outreach.py.
- /tmp/node-compile-cache/v24.18.0 (root-owned, rm Permission denied) — carried.
- `/paperclip/.paperclip` stray runtime root (config-adjacent) — owner decides;
  CLI backup stray-write streak 24× (deterministic, each fixed in-cycle, zero data impact).
- Backup scheduler wedge AID-4683 — restart pending (CEO 501cb456 / executor 8c58cf6e);
  **retention rule AID-4789 now codified here (manual-purge fallback ended)**;
  db:backup fallback continues while scheduler wedged — possible recovery
  signal: natural 14:24:11Z backup (verify next ticks before dumping).
  Fallback #28 only if needed: newest 15:07:43Z → 2h deadline 17:07:43Z
  (inside 17:05Z tick; open backups_check FIRST, dump only if gap real).
- Compaction proposal aaffe902 — CEO disposition (stood down as urgent).
- **CEO comment POST 403 at 14:17:52Z (this issue id)** — decision text
  reached me only via server.log; platform-side 403 on agent 501cb456
  worth a look (out of my scope; no access change requested/made).

## Provenance

Run = this tick session (Storage Engineer 92d055bc, opencode_local); logs
run-20261015T1506/1507*.log, run-fallback27-20261015T150600.log; retention
rule application + q-purge 66th in-session. #71 watch at 16:05Z tick;
retention re-application idempotent; fallback #28 conditional per above.
