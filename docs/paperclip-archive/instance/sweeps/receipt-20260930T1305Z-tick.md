# AID-3039 sweep receipt — 2026-09-30T13:05Z tick (real cycle, issue_monitor_due)

Cadence-anchor tick, conservative tier (avail 72G ≥ 20G, used 63% ≤ 85% —
AID-2974 aggressive tier not triggered). Sibling `issue_assigned` cycle
(AID-3470, receipt-20260930T1301Z) closed 13:01Z with the headline event:
**/tmp/.pnpm-store 441MB deleted** at first eligibility (crossed the 72h
cache floor 12:11Z; guards verified first-hand: 0 live fd/cwd refs, 0 pnpm
processes, stale operation-locks also removed; recreatable via pnpm
re-download). This tick re-ran the routine and confirmed the store absent.

## Passes (all under single-flight lock, sequential)

| pass | result |
|---|---|
| sweep.sh (6h floor) | 0 eligible; 0 pendencies; root scratch dirs clean |
| aid2949_extended.sh | 11 files (tmp_3428_* dumps: ix_3307/3428/3422/3424/3317, c, 3307, all, comments et al.); 0 quarantined; 6 protected-skipped |
| tmp_pass.sh | 1 transform-cache .so (>12h) + 19 stale /tmp/opencode dumps ≥18h (a3317, a3377, aid3376_body/tracker.py, hb68_* ×7 incl. 2MB, others) + pytest-of-node subdirs >12h pruned |
| aid3353_extra.sh | 0 eligible; live-refs basis 2 paths |
| aid3353_dirs.sh | .pnpm-store confirmed absent/empty (deleted by sibling AID-3470); kept: oparent_gate.py (code), state.json (learner dump); fresh-kept=3 (new fresh dirs, <floor) |
| porcelain_default.sh (guard-pass 6) | `porcelain(_default) 2026-09-30T13:05Z: git status --porcelain = 0 lines (branch aid3453/unify-school, HEAD e28119a5)` — clean tree cited (AID-1516/AID-3372); note branch switched from beta-hub-aid2669 (checkout activity upstream, tree clean) |

## Pendancies (unchanged, carried)

- /tmp/node-compile-cache root-owned (2.7MB): rm Permission denied —
  recreatable, negligible, root can clear at will; no escalation.
- AID-2928 watch: R2 creds still absent (storage/aidevschool/creds/
  ads-media.env) — cutover stays gated, unchanged.
- Decision items inherited from AID-3005 (never auto-deleted by policy):
  beta/school-entry (350MB git repo, owner decides);
  w2417_gho.env (18/set, cred-adjacent, manual removal by owner only).
- 0 quarantined this cycle; nothing new of uncertain purpose found.

## Watches

- **df drift accelerating**: avail 77G→76G→75G→72G over 10:05–13:05Z
  (~2–3G/h now, used 63%). Root cause consistent with instance-data growth
  (Paperclip DB dumps ~340MB+ hourly; CEO decision issue open on backup
  retention/retention config). At sustained rate: 20G aggressive-tier
  threshold ~17h out; sweep-only cleanup cannot offset instance-data growth
  — decision rests with the CEO issue already open.
- Branch switch in shared checkout noted (aid3453/unify-school); porcelain
  clean; no storage action required.

## Outcome

- 31 files deleted this tick (~23MB internal tally; df 121G used / 72G
  avail / 63% — net drift driven by instance data, not sweep scope).
- Monitor re-armed 13:05Z tick → 14:05:00Z `wake_owner` via
  rearm_monitor.sh (PATCH applied from disarmed state; verified by GET).
- Disposition: cycle complete; channel stays in_progress via armed monitor.
