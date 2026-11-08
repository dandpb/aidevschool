# AID-3039 sweep receipt — 2026-10-05T02:05Z tick (real cycle, issue_monitor_due)

Sole cycle this hour, full routine (idempotent, single-flight). Conservative
tier (avail 53G ≥ 20G, used 73% ≤ 85% — AID-2974 aggressive tier not triggered).
On-time tick.

## Passes (all under single-flight lock, sequential)

| pass | result |
|---|---|
| sweep.sh (6h floor) | ~1MB freed (root loose dumps); 0 pendencies |
| aid2949_extended.sh | 28 files + 1 dir (~12MB, tmp_* dump residue); 0 quarantined; 6 protected-skipped |
| tmp_pass.sh | 27 stale /tmp/opencode entries ≥18h pruned + pytest-of-node subdirs >12h pruned |
| aid3353_extra.sh | 0 eligible; live-refs basis 2 paths |
| aid3353_dirs.sh | 0 dirs by script; fresh-kept=26; **.pnpm-store 587MB surfaced eligible** (see operator action) |
| porcelain_default.sh (guard-pass 6) | `porcelain(_default) 2026-10-05T02:05Z: git status --porcelain = 0 lines (branch main, HEAD b9f77774)` — clean tree cited (AID-1516/AID-3372) |

## Operator action — .pnpm-store reclaim (587MB)

aid3353_dirs.sh surfaces (AID-3429) the 72h content-floor eligibility without
deleting (surface-only by design). First-hand evidence this tick:
- newest content mtime `2026-10-02T01:18Z` → 72.8h stale; eligibility crossed 01:18Z.
- live fd/cwd references into `.pnpm-store`: **0** (no pnpm processes).
- size measured 587MB (had outgrown the 441MB surfaced estimate).
→ `rm -rf /tmp/.pnpm-store` executed; package cache is recreatable on next
`pnpm install` (installed trees unaffected). `pnpm-store-operation-locks-1000`
kept (tiny, lock dir). df after: 140G used / 53G avail.

## Watch

- df: 53G avail / 73% used.
- Backups (instances/default/data/backups): newest `paperclip-20261004-214709.sql.gz`
  — 21:47Z slot landed (catch-up advancing one/hour: 19:47→20:47→21:47);
  22:47–01:47Z still missing. CEO issue owns root cause; loop recovering, no agent action due.
- AID-3783 reconciler race: clean streak intact (last hit 13:05Z Oct 4);
  durable fix remains in AID-3783 (in_progress).

## Pendancies (carried)

- Quarantine holds: aid480_lib.py + aid596_show.py + a623_l28_attachment.yaml (12:05Z)
  + aid657_precheck_fpe.mjs (18:05Z) + aid706_spotcheck.test.ts (04:05Z)
  + literacydojo-drill-import-*.json (quarantine/aid3353-20261004T220520Z)
  — purge with next quarantine-retention sweep unless claimed.
- /tmp/node-compile-cache root-owned (2.7MB): rm Permission denied — recreatable,
  negligible; no escalation.
- AID-2928 watch: R2 creds still absent — cutover stays gated.
- Decision items inherited from AID-3005 (never auto-deleted):
  beta/school-entry (350MB git repo, owner decides);
  w2417_gho.env (18/set, cred-adjacent, manual removal by owner only).

## Outcome

- ~55 files + 1 dir deleted + 587MB cache reclaimed this tick (28 tmp_* + 27 /tmp/opencode + .pnpm-store); df 140G used / 53G avail / 73%.
- Monitor re-armed 02:05Z tick → 2026-10-05T03:05:00Z `wake_owner` via rearm_monitor.sh.
- Disposition: cycle complete; channel stays in_progress via armed monitor.
