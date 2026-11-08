<!-- issue: AID-823 | key: defect-report | doc_id: 9777d441-33a8-4de2-a7ed-4ed9e2a660b5 | updated: 2026-09-10 15:37:07.111+00 -->

# defect-report

(AID-823)

# AID-823 — Defect report: PATCH silently discards top-level `monitor` field

**Status:** CONFIRMED first-hand (CEO run 2026-09-05, this issue, steps 1–4 below)
**Severity:** high (silent wake-scheduling loss, no error signal)
**Component:** `@paperclipai/server` route `PATCH /api/issues/:id` + zod body validation
**Scope note:** the defect is status-independent (any PATCH with top-level `monitor` is a silent no-op); it *bites* hardest on `blocked` issues because the nested path intentionally 4xx-es there, so clients reaching for a "wake on blocked issue" shape get a 200 no-op.

## 1. First-hand reproduction (this run, on this issue)

| Step | Request | Result | Verdict |
|---|---|---|---|
| 1 | `in_progress` + `executionPolicy.monitor` (nextCheckAt 2026-09-08T17:20Z) | 200; `executionPolicy.monitor` persisted; `monitorNextCheckAt` set | Baseline honored |
| 2 | PATCH `status: "blocked"` (first-class blocker), monitor left in policy | 200; monitor cleared, `executionState.monitor.clearReason = "invalid_status"` | By-design clear on status transition |
| 3 | `blocked` + explicit `executionPolicy.monitor` | **HTTP 400 "Monitor can only be scheduled on issues assigned to an agent in in_progress or in_review"** | Explicit 4xx — CORRECT |
| 4 | `blocked` + top-level `monitor: {nextCheckAt…}` | **200, no error, `executionPolicy.monitor = null`, `monitorNextCheckAt = null`** | **DEFECT — silent discard** |

Step 4 is the mechanism behind the AID-815 evidence (`5ed9dbc3`, run AID-820): the client sent `monitor` at the body root, got a 200, and the scheduled wake never existed.

## 2. Root cause (installed build, exact locations)

- `packages/shared` → `updateIssueSchema` (bundled `dist/index.js:2276`): plain `z.object(...).partial()` — **Zod default strips unknown keys silently**. There is no top-level `monitor` property on any issue PATCH/create schema; `monitor` only exists at `executionPolicy.monitor` (`issueExecutionMonitorPolicySchema`, `dist/index.js:2098`).
- `@paperclipai/server/dist/middleware/validate.js`: `req.body = schema.parse(req.body)` — the stripped object replaces the body; the handler can never see the dropped key.
- `@paperclipai/server/dist/routes/issues.js:4737`: `router.patch("/issues/:id", validate(updateIssueRouteSchema), …)` — route accepts the strip; no rejection, no warning.
- Monitor state machine (correct, not defective): `services/issue-execution-policy.js` — `issueAllowsMonitor` (line 166): agent-assigned + `in_progress`/`in_review` only; `applyMonitorTransition` (line 690): explicit monitor update on invalid status → 4xx (`MONITOR_INVALID_MESSAGE`); status transition away → silent clear by design. OpenAPI documents only `executionPolicy.monitor`.

**Defect class:** semantically-loaded unknown key silently stripped by zod on a mutation endpoint = silent data loss instead of 4xx. Same class likely applies to `POST /issues` and child-create (same schema family) — flagged for the vendor, not patched here.

## 3. Proposed fix (verified against the server's own zod)

Minimal, surgical, route-local — one file, no shared-schema ripple:

```js
// @paperclipai/server routes/issues.js (source + dist), next to the existing route schema:
const updateIssueRouteSchema = updateIssueSchema.extend({
  interrupt: z.boolean().optional(),
  monitor: z.unknown().optional().refine((value) => value === undefined, {
    message:
      "Field 'monitor' is not accepted at the top level of PATCH /api/issues/:id. " +
      "Schedule monitors via executionPolicy.monitor (allowed only on agent-assigned issues in in_progress or in_review).",
  }),
});
```

Verified with the exact installed zod (`node_modules/zod`):
- top-level `monitor` present (any value incl. `null`) → validation error, `path: ["monitor"]`, actionable message → surfaces as **HTTP 400** via the existing error pipeline ("never discard silently" ✓);
- field absent → parse unchanged (zero behavior change for all existing clients);
- nested `executionPolicy.monitor` → untouched.

Recommended vendor follow-up (same pattern): `POST /issues`, `POST /issues/:id/children`, and consider a general audit of mutation schemas for stripped unknown keys that carry scheduling semantics.

## 4. Why not hot-patched in this run

- Server PID 24 (`node /usr/local/bin/paperclipai run`) is the parent of every agent run, including the current one; a restart from inside a run cascade-kills the container (entrypoint's last command is `paperclipai run`).
- Node caches loaded modules — a dist edit has zero effect until restart, and a bad edit would brick the next boot.
- Platform binary is vendor product: hot-patching ahead of founder/vendor decision risks silent loss on any reinstall/upgrade. Decision belongs to the founder (instance owner) — relayed via card `97f3b5d6` on AID-814.

**Rollout plan when approved:** apply patch to `dist/routes/issues.js` (keep original for diff) → `node --check` + subprocess import validation → founder-initiated maintenance restart window → re-run repro steps 3–4 of §1 (expect 400 on both monitor-on-blocked shapes) → verify normal PATCH traffic unaffected.

## 5. Workaround (effective immediately, zero code)

Never send top-level `monitor` on any issue mutation. Monitors:
- are only schedulable via `executionPolicy.monitor`;
- are only valid on agent-assigned issues in `in_progress` or `in_review`;
- are NOT available on `blocked` issues by design — for time-gated blocked issues use first-class blocker issues + a wake path that exists (hourly founder routine, watchdogs when the AID-814 regression is fixed, or keep the holding issue `in_progress` with a monitor).

Treat any 200 that did not echo the intended monitor fields as a failed write; always re-GET to confirm.

---

## Annex W4 — same class, different field: silent `assigneeAgentId` drop on carrier mutations (tracking [AID-871](/AID/issues/AID-871))

Added 2026-09-05 (CEO, ORDER AID-869) so this relay package carries the full *write-without-echo* class, not just the `monitor` instance.

**Observation (2026-09-05 ~11:0xZ, CEO sweep AID-851):** carrier issues AID-832 and AID-814 (both `in_review`, monitor armed, `recoveryPolicy: wake_owner`) were found with `assigneeAgentId: null` after earlier mutations; no error had been returned to the writers. Restored immediately by PATCH and re-verified by re-GET. Independent confirmation: SDLC Audit #8 (AID-400, 2026-09-05 11:15Z), §3 line W4.

**Impact:** `wake_owner` fires with no target — armed temporal gates lose their wake silently. On 09-05 this only failed to become a lost gate because the CEO sweep ran ~1h before the 12:05Z trigger (accidental detection margin).

**Repro status — NOT pinned:** scratch probe (AID-870, 2026-09-05 ~20:0xZ, via AID-869): create-with-assignee PRESERVES the field; two subsequent PATCHs were rejected with explicit 409 `Issue run ownership conflict` (that path is by-design and correct). Silent drop NOT reproduced in 2 probes. Request to maintainers: audit mutation paths that can clear `assigneeAgentId` (PATCH handler in `routes/issues.js` plus any recovery/watchdog-driven mutations) for branches that persist the issue without echoing or validating the assignee field.

**Expected behavior:** same contract as the W1 fix above — a mutation either preserves `assigneeAgentId` or rejects with an explicit 4xx; never a 200 that silently nulls it.

**Interim mitigation (instance-side, R1 "write-echo checklist", CEO decision in ORDER AID-869):** after ANY `PATCH /api/issues/{id}`, the writing run MUST re-GET and verify the continuity triple `status` + `assigneeAgentId` + `monitorNextCheckAt`, citing all three values in its receipt (e.g. `re-GET: in_review / 501cb456 / 09-09T17:20Z ok`). Divergence = failed write: retry or escalate. This would have caught the `monitor` drop and the `assigneeAgentId` drop at write time.


## 6. Vendor status (2026-09-10, blocker-resolved round)

- Blocker AID-814 closed done 2026-09-10T15:09Z; founder card `97f3b5d6` (relay upstream) **accepted**. Defect report routed to maintainers.
- Instance server restarted 2026-09-08 10:10Z — same unfixed binary (2026.626.0, build Jun 29).
- Fix **absent** in public releases checked first-hand from the npm registry: `latest` 2026.831.1 and `canary` 2026.910.0-canary.3 — `updateIssueRouteSchema` still has no top-level-monitor guard and `validate()` still strips unknown keys. (Package `paperclipai` is public; server ships as `@paperclipai/server` dependency.)
- Defect therefore remains live on this instance. Remaining decision is the founder's: **(A) wait for vendor release** (adopt via instance upgrade when it ships) or **(B) authorize local hot-patch now** (§3 patch + §4 rollout: founder-chosen restart window; upgrade later supersedes the local patch). CEO recommendation: **B**, A continues in parallel regardless — B removes the silent-loss class today and the patch is verified against the installed zod.

Post-fix acceptance (unchanged): re-run repro steps 3–4 → both monitor-on-blocked shapes must return explicit 4xx; normal PATCH traffic unaffected; then close AID-823 done.

## 7. Local hot-patch APPLIED (2026-09-10, founder authorization B)

Founder accepted option **B** via checkbox confirmation `42e4fdb2` (resolved 2026-09-10T15:32:07Z, user W4VteLICaS…): local hot-patch authorized. Executed same day by CEO run 758a0ca2:

- **File patched:** `@paperclipai/server/dist/routes/issues.js` (installed 2026.626.0) — guard added to `updateIssueRouteSchema` exactly per §3 (rejects top-level `monitor` with 400 + actionable message; provenance comment cites AID-823 + upstream #13155).
- **Backup (byte-identical to pre-patch original, md5 `4903e4ee618197a54a0255eeec98ef7a`):** `…/dist/routes/issues.js.aid823-orig` (+ `/tmp/opencode/issues.js.aid823.orig`).
- **Validation done (pre-restart):** guard semantics verified against the installed zod (normal PATCH unchanged / root `monitor` object or null → error `path:["monitor"]` / other unknown keys still stripped); `node --check` OK; full ESM subprocess import of the patched file OK (`IMPORT_OK`).
- **Diff:** +7 lines, single hunk at the schema definition (lines 36–45). Patched md5 `7468ee771974883e8582bb21d01a0f88`.
- **NOT active yet:** the running server (PID 24, started 2026-09-08) still executes the old code in memory. Activation requires a maintenance restart performed from the host OUTSIDE agent runs (restart from inside a run cascade-kills the container — §4). Founder restart gate: checkbox confirmation (wake_assignee).
- **Rollback if ever needed:** `sudo cp …/issues.js.aid823-orig …/issues.js` + restart.
- **Post-restart acceptance (unchanged, §6):** re-run repro steps 3–4 → both monitor-on-blocked shapes must return explicit 4xx; normal PATCH traffic unaffected; then close AID-823 done. Vendor upgrade later supersedes the local patch (AID-1290 continues tracking upstream).
