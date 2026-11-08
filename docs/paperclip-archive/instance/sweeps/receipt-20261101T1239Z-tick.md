# Storage sweep receipt — AID-6007 tick 12:35Z — 2026-11-01T12:35:29–12:39Z (UTC, from run logs)

Tick on time (armed 12:35:00Z → 12:35:29Z). Disk 90G avail (54%) — transient dip to 86G during passes was the 12:36Z vendor dump in flight; settled back.

## Six passes
sweep 0; aid2949 deleted 1 dir / quarantined 0 / protected-skipped 6; tmp+aid3353 0; quarantine manifest-only purge 0 (56 dirs, all <48h).
`porcelain(_default) 2026-11-01T12:36Z: git status --porcelain = 1 lines (branch aid3704/escola-dev-deeplink, HEAD ff62e5f5) [AID-1516/AID-3372]` — same untracked evidence dir `docs/product-readiness/evidence/observations/2026-10-20-ux-o1-moderado-empirico/` (AID-3704 lane, in_review) → kept, owner decides (3rd consecutive tick unchanged).

## Backups — hourly vendor cadence CONFIRMED
- Vendor slots observed: 10:38:05Z, 11:38:08Z, 12:33:30Z, 12:37:52Z (4 consecutive hours; 10:25Z was my manual fallback).
- First `VERIFY_GZ=1` check flagged CORRUPT on `paperclip-20261101-073543.sql.gz` — **false positive, the documented rev4 mid-write race** (gz mtime 12:36:34Z = check instant, same-stem .sql present); re-verify after 75s settle: **OK — gzip -t PASS, newest mtime-UTC 12:37:52Z, cadence intact, nothing owed**.
- `backups_retention.sh --apply`: kept 5 (3.50G), purged 0.
- **Correction to my 11:38Z receipt**: with the vendor hourly cadence restored, the 48h rolling window holds up to ~48 archives ≈ **~36G steady-state** (not 1.5–2G as I wrote). At 90G avail this is affordable; the AID-4789 fuse (never re-cross <15G avail) stands and retention keeps trimming to policy.

## Workspaces
Unchanged set (10 = 8 justified keeps + 2 platform-auto-recreated empty roots). Dirty-tree pendency stands: `0bfa47c1` UX 169MB, `616b5f9b` Verifier 2591MB — owners decide.

## Channel
Re-armed after this receipt: nextCheckAt **2026-11-01T13:35:00Z**, wake_owner (AID-3321 guard, GET-verified).

Open pendencies: gho_ token revocation (repo owner, receipt 0ec24b8c); 2 dirty workspaces 2.7GB (owners); watch 48h-window backup growth (~36G steady-state) against the 15G-avail fuse.
