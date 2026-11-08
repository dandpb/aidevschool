<!-- issue: AID-814 | key: upstream-defect-report | doc_id: 8c697439-dffe-4049-93fd-e9ae6009ef55 | updated: 2026-09-06 10:47:42.613+00 -->

# upstream-defect-report

(AID-814)

# Upstream defect report — task-watchdog stop-fingerprint self-retrigger loop

**Product:** Paperclip self-hosted (`paperclipai` / `@paperclipai/server` **2026.626.0**, dist install)
**Area:** platform/task-watchdog scheduler
**Severity:** high — unbounded no-op agent runs with collapsing period (→scheduler cadence ~3min), budget burn, risk of masking genuine stops
**Regression of:** AID-727 (triaged 2026-09-03, routed upstream, fix never landed)
**Discovered by:** task watchdog AID-783 round 5 (2026-09-04T18:30Z); this issue AID-814
**Reported instance evidence window:** 2026-09-02 → 2026-09-04 (two independent outbreaks)

---

## 1. Primary defect: the "reviewed" fingerprint is a pre-round snapshot, but the round's own effects mutate the fingerprint inputs

`services/task-watchdogs.js` (dist, 2026.626.0):

- **Fingerprint inputs include volatile bookkeeping fields.** `classifyTaskWatchdogSubtree` builds each stopped leaf with `updatedAt`, `latestCommentAt`, `latestDocumentAt`, `latestWorkProductAt`, `status`, `pendingInteractionIds`, `pendingApprovalIds` (lines ~199–216); `stableStopFingerprint` (lines ~89–97) hashes those leaves.
- **The reviewed stamp is taken from a pre-round snapshot.** When a round is dispositioned, `markTerminalWatchdogIssueReviewed` (lines ~765–811) stamps `lastReviewedFingerprint = reviewedFingerprintForWatchdogIssue(watchdogIssue)` (lines ~293–295), which resolves to the watchdog issue's `originFingerprint` — the fingerprint computed **before** the round's side effects landed.
- **The round's own side effects mutate the watched tree.** Dispatch/verdict comments on the reusable watchdog issue, platform ack comments on watched issues, and mention-backlink indexing bump `updatedAt`/`latestCommentAt` on watched-tree leaves seconds after each round completes (live evidence: AID-725 acks `209ba57c`/`192a9fb9`/`04fd9fdd` on 09-03; AID-810 backlink indexing at 18:29:54Z on 09-04).
- **Result:** next periodic reconciliation recomputes a fingerprint ≠ `lastReviewedFingerprint` → classification `stopped` again → re-trigger with **zero external delta**. The wake idempotency key `task_watchdog:{watchdogId}:{stopFingerprint}` (lines ~296–298) is new each cycle, so every cycle wakes a full agent run.

Observed dynamics: once self-bookkeeping dominates, the period collapses to the reconciliation cadence (~3–4 min). Outbreak 2 timeline (AID-783): 9.5h → 2.9h → 21m → 3m across 5 triggers (fingerprints `6baecc07`→`748b4ed4`→`ff669334`→`9cd162a1`→`c4a2466d`), watched tree bit-identical since 05:34:34Z.

**Cross-contamination:** any watched subtree overlapping another watchdog's dispatch surface re-triggers too (anchor watchdog on AID-670 fired in the same seconds as AID-780's: 18:30:11.375/.485/.573; watchdog on AID-644 fired coupled at 18:30:11/18:34:11 without any verdict comment).

## 2. Aggravator: containment is structurally barred for the actors who notice the loop

- `routes/issues.js` `rejectTaskWatchdogConfigMutation` (~1577): watchdog-scoped runs cannot change watchdog configuration → `DELETE/PUT /issues/:id/watchdog` = **403** "Task-watchdog runs cannot change watchdog configuration."
- `routes/issues.js` `assertAgentIssueMutationAllowed` (~1461) → `assertFreshTaskWatchdogSourceMutation` (~1490): watchdog-scoped mutations require fingerprint freshness — the defect itself keeps the fingerprint stale → **409** "review is stale… refresh the source state" (live: 409s at 18:35:08/18:35:40/18:36:12 on 2026-09-04).
- `services/recovery/service.js:1465`: `recordWatchdogDecision` is board/recovery-owner only → the watchdog agent of record gets **403** (AID-727 evidence), so it cannot snooze itself.

Net: the loop cannot be stopped from inside a watchdog run at all; a normal-scope agent or the board must intervene (this report's containment was executed from a normal CEO run).

## 3. Suggested fixes (server-side)

1. **Stamp post-effects** (either suffices for the primary defect): set `lastReviewedFingerprint` from a fingerprint recomputed **after** all post-round side effects settle, and/or exclude round-attributable mutations (dispatch/verdict comments on the watchdog issue, platform ack comments, mention-backlink-derived `updatedAt`/`latestCommentAt` bumps) from the leaf inputs hashed by `stableStopFingerprint`.
2. **Open a self-containment path:** allow the watchdog agent of record to record `snooze`/`disable` for its own watchdog (or at minimum exempt `DELETE /issues/:id/watchdog` from the freshness revalidation — disabling is the containment path, and staleness is exactly what it contains).
3. **Scheduler circuit breaker (recommended regardless):** after N consecutive triggers whose fingerprint delta is attributable only to self/round bookkeeping, auto-quarantine the watchdog and notify the board. Turns any future regression into a contained event instead of an accelerating loop.

## 4. Repro

Any watched subtree whose watchdog completes a round while external state is static. Period collapses to reconciliation cadence within hours. Reproduced twice on this instance (AID-726 on 2026-09-03; AID-783/AID-682/AID-813/AID-812 coupled on 2026-09-04).

## 5. Containment executed on this instance (2026-09-04T18:41–18:42Z)

- `DELETE /issues/AID-780/watchdog` (6e4029b6 — looping, triggerCount 6) — round-5 agent's own DELETE had failed 409/403
- `DELETE /issues/AID-670/watchdog` (255989ed — anchor, looping, triggerCount 9)
- `DELETE /issues/AID-802/watchdog` (4b5e4adb — looping, triggerCount 2)
- AID-810's watchdog (ddc901fd) already disabled by its own round-2 agent at ~18:31Z
- AID-644's watchdog (94a2a2e5) left armed: not self-sustaining (quiescent once cross-mutations stopped; own completion at 18:34:31 did not re-trigger); removal denied by issue-boundary (assignee scope) — recommend hygiene removal by its assignee
- Verification: all deleted → `GET …/watchdog` = null; disabled rows are excluded from reconciliation (`status='active'` filter)

**Coverage preserved for the d+7 gate (2026-09-09T17:16:03Z):** gate tokens AID-782/AID-802/AID-810 (structural blockers with single close condition `now >= gate`) + CEO manual sweep d+6 (ORDEM AID-779, 2026-09-08T17:16Z) + full re-arm instructions preserved (AID-783 round-5 final comment; original protocols also captured in this issue's working files and in watchdog issues AID-682/AID-783).

## 6. Ask (owner: founder — routing decided in AID-727 decision 1)

Relay this report to the Paperclip maintainers (defect is outside our product repo). Optional, founder-gated (P6): authorize a local hot-patch of the installed package + server restart — deliberately **not** done mid-pilot per AID-727 decision 3 (reversible by product-owner decision).

## Appendix: re-arm payloads (post-fix)

- AID-670 watchdog `255989ed` original instructions: preserved verbatim in working file `aid814_wd670_full.json` and in AID-682 history; protocol = janela-21d O3-C1 anchor (d+7 = 2026-09-09T17:16:03Z, d+21 = 2026-09-23T17:16Z).
- AID-780 watchdog `6e4029b6` original protocol: preserved in AID-783 round-5 final comment (gate execution runbook `checkpoint-d7-runbook` rev 604c8bba on AID-780).
- AID-802 watchdog `4b5e4adb` instructions: preserved in `aid814_wd802_full.json`.
- Re-arm only after the upstream fix lands (product-owner decision, AID-727 decision 2).

## Appendix B: related defect in the same relay package (added 2026-09-06, rev 2)

**AID-823 — `PATCH /issues/:id` silently discards a root-level `monitor` field.** Reproduced first-hand (steps 1–4 in AID-823's doc `defect-report`): a PATCH with `monitor` at the body root returns 200 and drops the field (`executionPolicy.monitor` stays null) — zod strips the unknown key in `updateIssueSchema` (`req.body = schema.parse(req.body)` in the validate middleware). The nested path `executionPolicy.monitor` does NOT have the defect and rejects correctly with an explicit 400 on invalid states. Classification: validation-ergonomics bug (silent loss instead of 4xx), not a scheduling-engine bug — but it silently ate a wake scheduling on this instance (evidence: AID-815 comment `5ed9dbc3`), so it belongs in the same watchdog/monitor relay. A verified 1-file patch proposal is tracked in AID-823. Full analysis: AID-823 doc `defect-report`.
