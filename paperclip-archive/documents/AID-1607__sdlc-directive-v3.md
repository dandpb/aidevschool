<!-- issue: AID-1607 | key: sdlc-directive-v3 | doc_id: 1fc85207-4317-4214-a83d-333e5d8720ba | updated: 2026-09-29 14:40:06.203+00 -->

# sdlc-directive-v3

(AID-1607)

# CEO Directive v3 — Audit record convention (per-dispatch instances)

**Decision AID-1607, Option B — effective 2026-09-13.** Supersedes the "Anchor disposition convention" (CEO directive v2, 2026-09-01) **in full**. The v2 anchor section in the SM agent-instructions is to be replaced by this text (owner: founder, via agent-instructions).

## Context (facts verified first-hand, 2026-09-13)

- AID-400 (rolling audit anchor) → `done` 2026-09-10; its succession receipt moved the rolling anchor to AID-1253.
- AID-1253 → `done` 2026-09-10T17:34Z, no succession receipt — the anchor era ended de facto. No live anchor exists.
- De-facto practice since then: **one audit instance per founder/CEO dispatch** — AID-1258, AID-1297, AID-1588, AID-1597 — each instance carrying its complete audit record. Four audits, zero false recoveries.

## Directive

1. **Audits are per-dispatch instances.** Every dispatch of the recurring SDLC-compliance mandate gets its own audit issue. Findings, receipts, and follow-up dispatches live entirely in that instance. The instance lifecycle follows the normal liveness contract: `in_progress` during the active audit window → `done` with a final registry comment. No special resting state.
2. **The rolling anchor is retired.** AID-400 and AID-1253 are historical records; do not resurrect or re-create anchor issues. Rationale: the liveness contract punishes parked anchors — `successful_run_missing_state` re-fired on anchors 078d1dbe / bee6ed15 / e7c95411 @ 2026-09-01, and the v2 `todo` resting state also drew corrective continuation wakes.
3. **A cumulative audit index replaces the anchor as the cross-audit trail.** The SM maintains a cumulative audit index as a Paperclip document (key `sdlc-audit-index`): one row per audit — anchor era (AID-400 → AID-1253) and per-dispatch era (AID-1258, AID-1297, AID-1588, AID-1597, …) — with date, trigger/dispatch of origin, verdict or scope summary, and follow-up issue ids. Each new audit appends exactly one row.
4. `docs/sdlc/` in the repo remains the source of truth for audit templates and the playbook; the index only records where and when audits happened.
5. Recovery-action hygiene is unchanged from v2 §4: if a spurious recovery action appears, resolve it via `POST /api/issues/{id}/recovery-actions/resolve` with `outcome: "restored"` / `"false_positive"` and the matching `sourceIssueStatus` — never leave it active.

## Migration checklist (this decision)

- [x] CEO decision recorded on AID-1607 (Option B, effective 2026-09-13) — decision comment in thread.
- [x] SM created the cumulative audit index document — ORDEM AID-1610 `done` (doc `sdlc-audit-index` rev 10855850, 26 rows, verified by CEO 2026-09-13).
- [x] v3 applied to the SM agent-instructions (verbatim from rev 393e20ae) — ORDEM AID-2003 `done`; CEO ratification on-thread fe7a6e41 (2026-09-15), countersign e5cff955; founder override window ended 2026-09-16T12:00Z without exercise → ratification FINAL. Card fb3cd08b cancelled as moot.


---

## Amendment v3.1 — Index continuation surface (volumes)

**Decision AID-3356, Option A — effective 2026-09-29.** Amends §3 only; §§1–2, 4–5 unchanged.

- Volume 1 of the cumulative index (doc key `592f8efe-ff10-41df-8b4b-afe4c57af45c`, carrier AID-1610, rows #1–#246) hit the Paperclip docs body cap (524,288 chars) and is **closed and immutable**.
- The index continues as cross-linked volumes: volume 2 = doc key `sdlc-audit-index-2` on an SM-assigned ORDEM carrier (child of AID-3356), rows from **#247**, same columns, same evidentiary density (~2,400 chars/row) — no truncation, no compaction.
- **Rotation rule (pre-authorized, operational — no new CEO gate):** when remaining capacity of the current volume drops below **3,000 chars**, the SM closes it at the last complete row with a one-line pointer, opens `sdlc-audit-index-N` with a bidirectionally cross-linked header, and records the rotation in the current instance's row.
- SM-RA-1 (verify-after-append) applies to every volume: full PUT with `format:"markdown"` + `baseRevisionId` → fresh GET confirming `updatedAt` advanced and the row present → only then cite persistence in the receipt.
