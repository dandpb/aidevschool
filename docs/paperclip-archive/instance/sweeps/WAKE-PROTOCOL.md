# Wake-ending protocol — AID-2968 (2026-09-26)

Mandatory for every Storage Engineer wake. Also embedded in agent instructions
(`agents/92d055bc…/instructions/AGENTS.md`, section "Wake-ending protocol").

## Mechanism (verified from run records + server.log)

- Liveness classifier reads the run's final message. Prose endings are
  auto-linked as issue comments and classified `needs_followup`
  ("useful output but no concrete action evidence") → harness re-enqueues
  `issue_continuation_needed` ~30s later → infinite no-op loop.
- Evidence: 9 automation runs 17:19:23–17:24:23Z on AID-2952 (~30s apart);
  same pattern on AID-2963 17:10–17:18Z; earlier loops documented in
  AID-2901/AID-2909, AID-2941/AID-2943/AID-2944, and productivity review AID-2967.
- A `plan_only` ending is honored terminally: run `8a53266c` (16:13:52Z,
  AID-2952) ended with the exact "Next, check …" line → zero automation runs
  for 62 minutes, until the scheduled 17:15Z monitor tick. The harness does
  NOT re-wake after a terminal end — the loop was caused by our own endings.

## Rules

1. **No-op wake** (nothing due before the armed monitor):
   - Reads-only: ≤1 GET (issue/monitor), optional local `df`.
   - NO comment POST, NO PATCH, NO attachments, NO sweep, NO re-arm.
   - Append one line to `/paperclip/storage/sweeps/continuation-notes.log`.
   - Final message EXACTLY: `Next, check the monitor tick at <nextCheckAt>.`
2. **Real cycle** (sweep / verification / escalation):
   - Do the work. POST exactly ONE receipt comment. Re-arm the channel
     monitor +1h `wake_owner` **only if disarmed or overdue** (AID-3321),
     verify by GET. See "Re-arm idempotency" below.
   - Final message EXACTLY: `Next, check the monitor tick at <new time>.`
3. Forbidden in the final line (classifier trigger words):
   `blocked`, `approval`, `escalate`, `waiting on`, `needs`.
   Substance lives in the comment, never in final-message prose.
4. One comment per real cycle. No-op wakes are silent (run output + log line
   only). The armed monitor is the only wake path between real cycles.

## Guard-pass protocol (sweep receipt hygiene — AID-3372, 2026-09-29)

The 5 standard guard passes (sweep.sh, aid2949_extended, tmp_pass,
aid3353 extra/dirs, /paperclip/tmp) are closed by a 6th pass: the
**porcelain citation** of the shared checkout `_default`. Every sweep-ops
receipt (real cycle) carries a first-hand line from
`/paperclip/storage/sweeps/porcelain_default.sh`:

```
porcelain(_default) <ts>: git status --porcelain = <N> lines (branch <b>, HEAD <sha>) [AID-1516/AID-3372]
```

Rule AID-1516 (`docs/sdlc/README.md` §Mapping onto Paperclip; template
`docs/sdlc/templates/receipt.md` §Clean-tree proof): the count is cited
BEFORE any `done` flip; anything non-empty is committed or deleted with
justification cited in the receipt's disposition table. Coaching class
(not defect): 3 recurrences AID-3364/3365/3369 — SM verified porcelain
was actually 0 lines each time; only the citation was missing.

## Re-arm idempotency (AID-3321, 2026-09-29 — root cause AID-3320)

AID-3320 diagnosis (verified first-hand in activity_log): the scheduler fires
every tick that REMAINS armed until due, ≤0.5min late (e.g. AID-3039
nextCheckAt 06:05:00 → triggered 06:05:07). The "3–6h late ticks" were caused
by OUR sibling cycles PATCHing the monitor to (HH+1):05 seconds before the
armed HH:05 tick fired (e.g. 2026-09-29T07:03:25Z: previousNextCheckAt
07:05 → 08:05, 95s before due).

Rules — closing ANY sibling cycle on the sweep channel (AID-3039 lineage):

- Close via `/paperclip/storage/sweeps/rearm_monitor.sh AID-3039 <target-ISO>
  [notes]`. It PATCHes `executionPolicy.monitor` ONLY when `nextCheckAt` is
  null or overdue >90s (grace covers 30s scheduler heartbeat + ≤0.5min
  trigger latency; inside grace the tick is presumed imminent — no PATCH).
- A future armed tick is NEVER superseded (script exits 0 "NO-OP", correct).
- Tick runs (`wake issue_monitor_due`) keep re-arming the next tick at their
  end, as always — the tick is the cadence anchor, siblings are fallback.
- Verification query (embedded PG, user/db `paperclip`):
  `select created_at,action,details from activity_log where action like
  'issue.monitor%' and entity_id='<issue-uuid>' order by created_at` —
  on-time = `monitor_triggered` within 1min of the last scheduled
  `nextCheckAt`, with no sibling `monitor_scheduled` between arming and
  trigger.

## Right-sizing note (AID-3430 verdict, 2026-09-30)

10th productivity review (AID-3430) flipped verdict: job legitimate,
provisioning inefficient — 27 real cycles vs 26 no-op continuation wakes
(~30s post-close) + 8 review-children wakes over 3d6h. Response, by lever:

- **No-op wakes (owned)**: handling already minimal — 1 GET + `df` + log
  line, zero writes. The re-enqueue itself fires even after exact one-line
  endings on comment-posting cycles; stopping it is platform-side (see
  recommendation below). No further trimming possible on our side.
- **Sibling/tick overlap (owned)**: ~:01 assigned cycle + :05 tick both run
  the 6-pass routine. Kept deliberately — the tick is the cadence anchor
  (AID-3321 outranks dedup) and passes are idempotent, single-flight, <30s.
- **Recommendation to Platform & CI (not owned here)**: (1) honor terminal
  one-line endings on runs that POST comments, so post-close continuations
  stop firing; (2) allowlist standing channels (or raise the threshold) for
  `long_active_duration` reviews — 10 consecutive PRODUCTIVE/no-action
  verdicts on a by-design perpetual carrier is review spend with no yield.
  Recorded here and in the AID-3039 receipt of 2026-09-30T07:07Z; no new
  issue created to avoid churn — reviewer/CEO can adopt directly.
  → 2026-10-01 (AID-3629): recommendation (1) superseded by the verified
  mechanism below and routed as a scoped child issue; see next section.

## Post-close continuation runs — verified spawn mechanism (AID-3629, 2026-10-01)

Delegated finding (AID-3628 → AID-3629): "drop the post-close no-op run".
First-hand verification from run records (GET /api/issues/AID-3039/runs,
comments; AID-2952 run history for 2026-09-26):

1. **The continuation run is platform-spawned, not scheduled by us.** Every
   cycle classified `advanced` (i.e. every real cycle that posts a receipt —
   concrete action evidence) on an in_progress issue gets exactly one
   recovery run ~25–85s later:
   `contextSnapshot.source = issue.productive_terminal_continuation_recovery`,
   `wakeReason = issue_continuation_needed`, `retryOfRunId = <tick run>`.
   Example: tick `f0681539` (2026-10-01T13:05:18Z, advanced) → continuation
   `e468e79b` (13:06:49.618Z, retryOf=f0681539). 1:1 with every tick for
   30+ h (2 runs/hour steady; 185 runs on channel at audit time). We do not
   emit, schedule, or request it — arming the monitor is already done inside
   the tick run. It cannot be declined or suppressed agent-side while real
   cycles post receipts (receipt ⇒ advanced ⇒ recovery). `plan_only` endings
   do NOT spawn recovery (verified 09-26 17:32:54Z run → no successor).
2. **The no-op comment is an auto-link, not a POST.** Runs that post no
   comment themselves get their final message auto-linked as an issue
   comment at run finish (observed +28ms: e468e79b finishedAt
   13:07:05.340Z → comment 13:07:05.368Z). Runs that DO post (tick receipt)
   get no auto-link (exactly 2 comments/hour). A bare one-liner final
   message still auto-links (sample 2026-09-26T17:33:09.444Z, body = the
   one-liner alone) ⇒ wording changes cannot suppress the comment either.
3. **Per-wake cost** (usageJson, e468e79b): input 3,813 (765,120 cached),
   output 362, costUsd 0 — ×24/day of pure overhead with zero writes
   (every continuation-notes.log line since 09-30: "no POST/PATCH/sweep").
4. **Rule 1 stands unchanged** (bare one-liner ending keeps the recovery
   run terminal `plan_only`, preventing the 30s re-churn of AID-2901/2968;
   any prose prefix risks `needs_followup` classification and a chain).
5. **The only lever that halves volume is platform-side**: skip
   `issue.productive_terminal_continuation_recovery` when
   `executionPolicy.monitor.nextCheckAt` is armed and in the future — the
   armed monitor IS the scheduled continuation. Expected effect: 48→24
   runs/day and 48→24 comments/day on AID-3039 with sweep cadence, receipts
   and liveness evidence unchanged. Routed: child issue of AID-3629
   (Platform & CI Engineer).
   → 2026-10-07 (AID-4230 QA verdict; AID-3630 review closed): the lever is
   already ACTIVE — the 10-01T21:46Z restart activated the staged snapshot
   armed-monitor guard, so the post-close no-op stream is EXTINCT (last
   10-04T19:05Z; AID-3039 last 24h: 24 runs = 15 ticks + 9 wake-cycles, every
   wake a productive [due→trigger-landing] race win, fall-through by design).
   The 10-04T22:22Z disk head (AID-3975 fresh-read; applied under AID-3976/
   AID-3977; NOT yet running, pid 18 booted 10-01) would suppress 0/9 of the
   residual wakes — its live value is AID-2889 flap suppression (14/14,
   freshread-replay A) + AID-3783 grace activation. Activation + §5
   re-measure: AID-3990 (founder accepted
   `confirmation:AID-3990:restart-activate-guards` 10-05T09:53:46Z).
   Integrity note: md5 is UNTRUSTED on this host for ≥1 artifact
   (AID-4230 §2 — valid 6442-byte file, empty-file md5, sha256 clean);
   pin evidence with sha256 only.

## Backup filenames are TZ-local — never read the digits as UTC (AID-4546, 2026-10-11)

Audit #536 (AID-4545) flagged the 2nd occurrence of tick receipts reading
`paperclip-YYYYMMDD-HHMMSS.sql.gz` filenames as UTC. Filenames are stamped in
server-local time (America/New_York, -0400 EDT / -0500 EST); receipts on
2026-10-10/11 declared false "HH:47Z–HH:47Z owed / catch-up" slots while the
hourly cadence was intact. First-hand proof (2026-10-11T08:37Z): for all 77
files, filename-as-(-0400)→UTC matches mtime-UTC within 13–100s (backup
duration); zero mtime-UTC gaps >1.6h since 2026-10-08T06:48Z; newest
`paperclip-20261011-034710.sql.gz` = 03:47 **local** = mtime-UTC 07:48:30Z.

Rules for every tick receipt's Backups line (audit acceptance):

1. Freshness derives ONLY from mtime (`stat -c %Y`, TZ-independent epoch).
   Run `/paperclip/storage/sweeps/backups_check.sh` and paste its one line.
2. A REAL gap = newest mtime-UTC age ≥ 2h (hourly job ⇒ 1 missed slot is
   1h; threshold absorbs clock/startup jitter). Below that: "cadence intact,
   nothing owed" — no "owed"/"catch-up" wording from filename arithmetic.
3. Filename digits may appear only as an identifier, never as a timestamp
   claim. If a ≥2h gap is real, escalate with mtime-UTC evidence (and check
   server.log + backup job) instead of accumulating per-tick "owed" lists.

## Backup retention policy (AID-4830, 2026-10-15 — founder decision AID-4789 card 210313d0 option a)

Every tick, AFTER `backups_check.sh`, run
`/paperclip/storage/sweeps/backups_retention.sh` (idempotent, single-flight,
mtime-only): KEEP all `paperclip-*.sql.gz` with mtime age ≤ 48h PLUS the
newest archive per UTC day for the 3 most recent distinct days beyond the
window; DELETE the rest of the live set (never the incident-aid4683/
quarantine, never in-flight `.sql` partials, never non-matching names).
Supersedes AID-2950 tiers. First applied 2026-10-15T14:2xZ: 9 rm, 5.76G
recovered, 26 held (17.0G); fuse target: never re-cross <15G avail
(audit #624/AID-4788). While the scheduler is wedged (AID-4683), vendor
pruneOldBackups never fires — this pass is the operative retention; when the
scheduler returns, vendor prune keeps a superset on <3d and this pass still
trims to policy (net converges). Manual fallback `paperclipai db:backup`
remains the RPO path while wedged (~2h cadence, deadline = newest mtime +2h).
Path quirk (first applied 2026-10-15T22:07Z): the CLI writes to
`/paperclip/.paperclip/instances/default/data/backups/` (double-nest) —
`mv` the archive into the canonical
`/paperclip/instances/default/data/backups/` before re-running
backups_check.sh (VERIFY_GZ=1), then apply retention. Do NOT delete
`/paperclip/.paperclip/context.json` (CLI context, uncertain purpose —
surfaced, owner decides).

## Quarantine retention (2026-10-12, first applied at 22:05Z tick)

`/paperclip/storage/quarantine/aid2949-*`, `aid3353-*`, `tmp-*` dirs are
byproducts of every sweep run (~2–3/h since 09-26). Rule:

1. A quarantine dir whose only file is a `MANIFEST.tsv` with **no rows besides
   its own self-row** holds zero quarantined data → provably discardable once
   dir mtime >48h. Purge with `rm -rf` (753 dirs / ~6.7MB / ~753 inodes
   recovered on first application; 932→179 dirs, content-bearing set intact).
2. Any dir with content beyond the manifest (e.g. `code/aid1501_*.py`,
   literacydojo json, w2711/w2810/w2858mw, opencode-20260927) is **never**
   purged by the hourly job — quarantined code/data stays claimable until its
   owner decides (standing pendency in tick receipts).
3. Re-apply opportunistically during any real cycle (idempotent; fresh <48h
   dirs age into eligibility).

## Standing monitors (post-fix)

- AID-2952 (sweep channel, diretiva AID-2949): nextCheckAt 18:15:00Z, `wake_owner`.
- AID-2963 (aggressive tier, founder): nextCheckAt 18:11:52Z, `wake_owner`.

## Verification plan (AID-2968 in_review)

Monitor on AID-2968 at ~18:35Z: assert that after ~17:35Z the only runs on
AID-2952/AID-2963 are the two monitor-fired ticks (plus at most one bounded
plan_only successor each). If 30s-cadence automation runs persist after a
plan_only ending, report run ids on AID-2968 for platform-side investigation.
