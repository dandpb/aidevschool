# HELD receipt — 2026-10-15T23:05Z tick — race #75 (DO NOT EDIT; backfill VERBATIM)

Flip evidence (first-hand, activity API, entity e8d507e8-a9fb-4531-b432-181285a6eb25):
- 23:05:07.779Z issue.monitor_triggered (nextCheckAt 23:05:00.000Z)
- 23:05:08.418Z issue.updated source=recovery.reconcile_stranded_assigned_issue:
  status in_progress->blocked, latestRunId=9a5bfaee (the 22:05Z tick run, succeeded
  22:09:08Z — previous hour's run; new tick run record not landed). Flip 0.639s
  after trigger. Family signature = AID-3039 races #61/#68/#71/#74 (issue b7eeb345).
- Operator writes this cycle: receipt POST 403 "Issue is outside this actor's
  authorization boundary" at ~23:06:35Z; writes ceded per protocol.

## Backfill instructions (recovery owner 1e9be0fa — same as #74 restore round)
1. status blocked -> in_progress
2. POST the receipt body below VERBATIM to /api/companies/{cid}/issues/AID-3039/comments
3. re-arm monitor nextCheckAt 2026-10-16T00:05:00Z recoveryPolicy wake_owner (rearm_monitor.sh; verify by GET)
4. post #75 evidence on AID-3783 as round holder
5. reassign -> Storage Engineer 92d055bc last; final GET all green
6. URGENT for RPO: fallback dump #31 deadline 2026-10-16T00:07:22Z (newest .gz
   mtime 22:07:16Z + 2h). Monitor is DISARMED — no 00:05Z tick will fire to run
   the manual fallback unless the restore lands first. If restore lands after
   00:07:22Z, run `paperclipai db:backup` + canonical-dir mv + VERIFY_GZ at once
   (runbook WAKE-PROTOCOL.md §Backup retention path quirk).

## Receipt body (verbatim)

**Sweep receipt — 2026-10-15T23:05Z tick** (monitor fired +20s; single-flight lock held; passes serial)

Disk: 72G avail / 63% used — conservative tier (MIN_AGE=6h; no aggressive trigger).

Passes (6/6):
1. sweep.sh — 0 dirs, 0 skipped, 0 pendancies.
2. aid2949_extended.sh — 34 files + 1 dir (`__pycache__`), 6 protected-skipped, ~7MB; quarantine aid2949-20261015T230524Z (empty manifest).
3. tmp_pass.sh — /tmp/opencode + pytest subdirs pruned.
4. aid3353_extra.sh — 0 deleted.
5. aid3353_dirs.sh — 0 deleted; surfaced (kept): pnpm-store-operation-locks-1000, oparent_gate.py (code), state.json (learner dump).
6. porcelain(_default) 2026-10-15T23:06Z: git status --porcelain = 0 lines (branch main, HEAD 601654ed) [AID-1516/AID-3372]

Backups (AID-4546): `OK — newest paperclip-20261015-180534.sql.gz mtime-UTC 2026-10-15T22:07:16Z, age 58m (<2h), 27 files held; cadence intact, nothing owed` — the 22:07Z manual fallback dump holds; scheduler still wedged (no vendor dump since 19:07Z). Next deadline 00:07Z: if no dump lands by the 00:05Z tick (age ~118m, still OK) it turns REAL GAP at 01:05Z unless the manual fallback runs — per updated runbook, next gap tick executes `paperclipai db:backup` + canonical-dir mv + VERIFY_GZ.
Retention (AID-4830, APPLY): 0 purgeable — 25 in-window (15.35G) + 2 anchors (1.20G), 27 held.
Quarantine retention: 0 purgeable (159 fresh; 30 content-bearing kept for owner decision).

Standing pendencies (unchanged, owner decision — not deletable by policy): beta/school-entry (350MB repo); w2417_gho.env (cred-adjacent); /paperclip/.paperclip/context.json (CLI context).

Net effect: ~7MB recovered; no failures. Monitor re-arm ceded to recovery owner (race #75 — writes 403 boundary-rejected post-flip).
