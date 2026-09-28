---
type: synthesis
title: "Field Guide: Agentic Factory after the stress program"
created: 2026-09-26
updated: 2026-09-26
tags:
  - research
  - factory
  - sdlc
  - evidence
status: developing
related:
  - "[[Product vs Production Readiness]]"
sources:
  - "Paperclip AID-2681 (program umbrella) — friction-log + improvements-backlog docs, 22 POC receipts (AID-2682..AID-2702)"
  - "factory/README.md + factory/tests/ (150 passing at base e0f6a3d8)"
  - "PR #550 (docs lane, AID-2698) and PR #551 (content lane, AID-2697)"
---

# Field Guide: Agentic Factory after the stress program

A field guide compiled from the FACTORY-STRESS program (umbrella AID-2681,
owner order in AID-2676): every agent ran one real change through the
agentic factory and reported evidence-backed frictions. Audience: the next
author (docs, content, code) who wants the rail to carry their work — and
the operator deciding what to fix next. Compiled 2026-09-26; sources are the
issue threads and docs named above, not memory.

## Overview

The factory (`factory/`, merged in PR #527) moves one unit of work through
`intake → claim (lease) → freeze (digest-locked contract from
intent/<change-id>/) → build (isolated worktree at the pinned base) → prove
(independent verifier, clean-room at the build SHA) → gate (fail-closed
P1–P5) → PR`. Runtime state lives in gitignored `.scratch/factory/`.
Hardened during the program itself: P1 fencing (PR #529), canonical-registry
freeze fix (PR #543), ledger/state/proof binding X4–X6 (PR #544), clean-room
verify (PR #532), atomic takeover (PR #540), idempotent resumption (PR #533).
Suite at base `e0f6a3d8`: 150 tests passing.

## Key Findings

### 1. The rail carries every work type tested — 22/22 POCs promoted

| Lane | Evidence (first-hand receipts) |
| --- | --- |
| Docs-only diff (structure, dated claim, index, link checks) | AID-2698 — 3/3 doc checks in clean-room, promote bound to PR head (#550) |
| Content lesson (Duolingo-like, 5 exercise types) | AID-2697 — lesson + tests 132/132, tsc, eslint; ~80s factory overhead; CI 44/44 on the proven head (#551) |
| Learning-engine item e2e | AID-2687 |
| Curriculum platform change (YAML validator) | AID-2699/AID-2689 (PR #536) |
| Custom a11y proof (fail-closed) | AID-2693 (PR #539) |
| Concurrency 40 items × 8 workers | AID-2684 — 40/40 promoted |
| Crash-recovery / resume | AID-2685 |

The core product question is answered: **the proof accepts non-code**, and
"a lesson a day" content throughput fits the factory's shape (~80s of
factory overhead per lesson, per AID-2697).

### 2. What still bites (open items, by severity)

1. **Gate decides on ledger/state, not the live tree** (cluster B4, P0):
   promote without `--pr-head` passes; tracked-file edits between build and
   prove and post-prove `--amend` were invisible. Until fixed: ALWAYS gate
   with `--pr-head`, never touch the worktree after prove.
2. **Receipt never reflows to the versioned registry** (AID-2698 D1):
   `copy_receipt_into_registry` has no caller, and the summary cannot enter
   the promoted head (P5 would block the moved head) — the audit trail in
   `intent/` is manual today.
3. **Contract checks do not run in GitHub CI** (AID-2698 D4): P5 is
   head-equality only; the frozen obligations protect the promote, not the
   merge.
4. **Environment purity** (AID-2697 E1): checks inherit the operator's env
   (`NODE_ENV=production` + global `omit=dev` silently broke `npm ci`);
   sanitize inside the check command (`env -u NODE_ENV npm ci --include=dev`).
5. **Retry lineage** (AID-2697 E2/E3): repeated `resume` composes
   `retry1-retry1-…` ids and loses the original origin; `resume run-<id>`
   errors with `no run state for run-run-<id>` (CLI expects the event id).
6. **Parser and format limits** (AID-2693 A1/A4): `\|\|` in check commands
   is silently rewritten to `\|`; per-check timeout/severity are not
   expressible; no sanctioned artifact channel for structured proof reports.
7. **Platform (Paperclip, outside the repo)**: assignee-only boundaries
   forced every cross-agent GO/replication through relays or delegated
   children (frictions #1/#11; hit again by AID-2697 via child AID-2829);
   `in_progress` issues with an active checkout generate ~1/min continuation
   wakes that registered monitors did not suppress (mitigation that worked:
   release the checkout; blocked-with-dependency stopped the loop).

### 3. Recipes that worked (field-tested)

- **Docs author** (AID-2698): checks are assertions over files — required
  sections, a `Last verified: <ISO date>` claim line, index row present,
  relative links resolve. One-line stdlib commands, no `|` in the command
  text (parser). Keep `risk low`; verify with
  `factory ledger <event> --verify` and quote the receipt in the issue.
- **Content author** (AID-2697): freeze the contract first, then one commit
  that carries content + tests + the `intent/` registry; checks = engine
  gates (`npm ci --include=dev && npm test`, `tsc --noEmit`, eslint);
  expect the verifier to re-run them in a clean-room (~36s for 132 tests).
- **Custom proofs** (a11y, AID-2693): exit codes are the contract —
  violations must exit non-zero; severity handling stays inside the command
  until the format grows `severity=`.
- **Blocked builds are cheap**: fail-closed blocked runs keep the ledger;
  re-enter with a fresh event (mind E2 lineage) — the AID-2697 run
  `retry1-retry1-retry1-retry1` promoted on the fourth attempt with the
  fail-closed blocks being author errors, not factory errors.

### 4. Improvement backlog (program output, prioritized by the SM)

P0: B4 (gate re-derivation + mandatory `--pr-head`), B5 (canonical registry
freeze — fixed via #543, verify countersign), B1 (evidence anchoring —
merged via #544). P1: B2 clean-room residue, B3 lease lifecycle/heartbeat,
B6 crash fail-closed, B7 runtime hygiene (~210 MB/run). New from wave 2:
`factory handoff` station (promote→PR receipt, kills orphan SHAs),
contract↔CI bridge (re-run frozen checks on the PR head), receipt reflow v2
(sanctioned second commit), env-pure contracts, stable retry lineage,
content-lane contract templates. Full list with repro commands: AID-2681
docs `friction-log` (rev 14+) and `improvements-backlog`.

## See also

- `factory/README.md` — motor internals and P1–P5 enforcement map
- `docs/handbook/14_factory_docs_loop.md` — the docs-author quickstart
  (PR #550)
- `docs/sdlc/README.md` — intent/spec/plan/checks contract format
