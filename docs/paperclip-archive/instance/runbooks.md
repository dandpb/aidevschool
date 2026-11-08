# Runbook — opencode.db compaction window (AID-3012 #1, CEO decision AID-3009; amended AID-3025)

Target: `/paperclip/.local/share/opencode/opencode.db` (5.4G, live SQLite, WAL active).
Measured 2026-09-26T22:07Z: event=3.42GB (2.42M rows, 64%), part=1.38GB (651K rows, 26%),
indexes≈0.4GB. All sessions created within last 30d. Sessions older than 7d hold 2.05M
events (84%). Verified backup: `/paperclip/storage/opencode-db/backups/opencode-20260926T220737.db`
(5.70GB, sha256 c2e80f9520087ef4639d42dfd91b12ba5667ad8cda1d07be3f7e9d155bc10d37,
integrity_check=ok, row counts match live).

## Forbidden minute schedule (AID-3025 — incident AID-3023 postmortem)

Window #1 (2026-09-26T23:30Z) passed the old ":17–:40 opening-minute" guard at :28,
then prune+VACUUM crossed :30 and collided with concurrent agent starts → 4
`adapter_failed` runs, 2 agents in `error`, AID-3020 blocked. The guard now ensures
the **estimated start+end of the whole exclusive-write phase** avoids:

| Minute-of-hour | What runs there | Source |
|---|---|---|
| `:00–:16` | hourly monitor tick cluster (:11/:15/:16 + runtime) + :00 smoke burst | AID-3012 |
| `:20–:22` | zai-beta-tunnel smoke burst (:00/:20/:40 cadence, ~1–2 min) | COMPACTION-LOG #1 |
| `:30–:32` | SDLC Scrum hourly tick + QA recovery dispatch | AID-3023 |
| `:40–:42` | zai-beta-tunnel smoke burst | COMPACTION-LOG #1 |

Guard mechanics (`opencode_db_compact.py`, `window_violation()`): budget the write
phase at **WRITE_BUDGET_S=480s** (prune ~2 min observed + VACUUM 55 s observed /
2–6 min estimated) and refuse if `[start, start+480s]` touches any forbidden minute
(hour-wrap aware). With this schedule the natural-quiet slot is **:43–:51** each
hour (`--check-window` prints the live verdict + next safe slot). Touching the
tick minute with the tail of the budget (e.g. start :24, end exactly :30) is
refused — conservative by design. Extend `AGENT_TICKS` when new scheduled ticks
are mapped.

## Preconditions (ALL must hold — never VACUUM with agents actively waking)

1. **Verified backup < 24h**: latest file in `/paperclip/storage/opencode-db/backups/`
   with `meta.json` sha256 matching and `integrity_check ok` recorded. If stale, take a
   fresh one first (Python `sqlite3` backup API — safe under WAL, ~25s).
2. **Maintenance window** — either:
   - **(preferred)** the AID-2984 board-restart pause (restart window approved and
     board quiesced), or
   - **natural quiet**: no OTHER session updated <5 min (`active ≤ 1`, own run
     excluded) AND live `max(event.id)` stable across 60s AND the crossing-aware
     window guard above passes (`--check-window` for a quick verdict).
3. **Single-flight lock**: `flock -n /paperclip/instances/default/tmp/opencode-db-compaction.lock`.
4. Disk headroom ≥ 12G (VACUUM builds a temp copy; 96G free at writing).

## Steps (execute inside the window)

```bash
# 0. quick verdict: are we in a safe slot? prints violation + next safe slot
python3 /paperclip/storage/runbooks/opencode_db_compact.py --check-window
# 1. lock + fresh backup at window open (see preconditions 1)
python3 /paperclip/storage/runbooks/opencode_db_compact.py --backup
# 2. prune sessions older than PRUNE_DAYS (default 7) — dependency order, then VACUUM
python3 /paperclip/storage/runbooks/opencode_db_compact.py --compact --prune-days 7
# 3. verify (integrity_check + counts + sizes) and print receipt numbers
python3 /paperclip/storage/runbooks/opencode_db_compact.py --verify
```

The script (same path) implements: backup (online API) → `DELETE FROM event WHERE
aggregate_id IN (old sessions)` → `DELETE FROM part|message|session|todo` for those
sessions → `VACUUM` → `PRAGMA wal_checkpoint(TRUNCATE)` → report sizes before/after.
Exit codes: 2 stale backup, 3 not quiet, 4 window guard, 5 VACUUM skipped.
Timeouts: expect 2–6 min for VACUUM at this size. **Do not run the compact step if any
precondition fails; the script re-checks quietness AND the window guard after its 60s
probe (real write-start minute), and again immediately BEFORE VACUUM (15s probe +
VACUUM-only budget 360s) — if that re-check fails, the prune stays committed (safe;
only space unreclaimed) and VACUUM is deferred: just rerun `--compact` in the next
safe slot (`--check-window`). `--force` bypasses both checks for approved AID-2984
restart pauses only.**

## Expected result / success criteria

- Prune ≈2.05M events + tied part/message rows (sessions >7d: 2465 of 2923).
- Post-VACUUM size ≲1.5G (from 5.4G) → ≥3.9G recovered.
- `PRAGMA integrity_check` = ok; recent sessions (<7d) intact and resumable.

## Rollback

Restore from the window's backup via Python backup API (source=backup, target=live db
path — only after confirming the opencode process is not mid-write), or file-level
replace of `opencode.db` (delete stale `-wal`/`-shm`) during a restart pause.

## Retention policy (this db)

- Sessions + events older than **7 days**: pruned each maintenance window.
- Backups: keep **last 2** verified dumps in `/paperclip/storage/opencode-db/backups/`
  (≈11.4G peak); older ones deleted only after the newer one passes integrity_check.
  Off-site replication optional follow-up (R2, ~US$0.02/mo at 1–2 compressed copies —
  within budget cap, CEO already owns R2 usage).
