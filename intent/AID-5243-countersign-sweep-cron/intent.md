# Intent: countersign-sweep — proactive ~hourly deletion alert for Countersign citations

Author: Paperclip AID-5243 (follow-up AID-5235 item 4; the §11 lazy-deletion
deviation was ratified as merge-sufficient in AID-5241 disposition A3,
2026-10-20 — the original cron spec is tracked here so it is not silently
abandoned) · Change-id: AID-5243-countersign-sweep-cron · Status: implemented
(this change)

> One source of truth: AID-5243 (this issue) + the AID-5235 item-4 spec quoted
> in it. Acceptance: an ~hourly GitHub Actions sweep that snapshots Countersign
> citation comments per OPEN PR (Actions cache only, no repo commits) and posts
> a PR comment + annotation when a snapshotted citation disappears — confirmed
> by a second read — without replacing or relaxing the countersign-gate.

## Problem

The gate's §11 deletion alert is lazy by design: it fires only when the gate
re-runs on the same head. An abandoned open PR with a stale green check whose
citations are deleted is never re-evaluated (no new push, no merge attempt) —
the exact AID-5233 incident shape (~5 min between green and deletion).

## Proposed outcome

`scripts/countersign_sweep.py` + `.github/workflows/countersign-sweep.yml`
(cron `23 * * * *`, ~hourly; `workflow_dispatch` drill with optional single-PR
input; serialized by a `countersign-sweep` concurrency group):

- Snapshot: per OPEN PR, the ids of comments carrying a canonical
  `Countersign:` line — the gate's own `CITATION_RE` and fence-stripping,
  imported (no drift; precedent: receipt canon cross-imports from the gate).
- Detection: a snapshotted id missing from the conversation, CONFIRMED by a
  second independent fetch (pagination-glitch guard), posts a DELETION ALERT
  comment (fence-safe: quoted citation fenced, no operative
  `Countersign:`/`Provenance:` lines, idempotency marker per comment id) and
  `::error` annotations; the scheduled run reddens on purpose (rc 1 — honest
  detector signal; not a required check).
- State: snapshot JSON in the GitHub Actions cache ONLY (`cache/restore` +
  `cache/save`, unique key per run so newest wins; missing/corrupt/wrong-
  schema snapshot re-baselines silently — never alert from an absent
  baseline).
- Boundaries: post-hoc detection only; it changes no gate, no required check,
  no branch protection; closed/merged PRs are out of scope (the gate's
  merged-PR audit owns those); a newer citation does not launder a recorded
  deletion; each deleted id alerts exactly once.
- Fail-closed: transport/parse failure anywhere → rc 2, snapshot untouched;
  unconfirmable deletion → rc 2 with the previous snapshot preserved; a
  self-test failure in CI blocks alerting (no verdict from a broken
  evaluator — the gate's own doctrine).

## Acceptance evidence

- `python3 scripts/countersign_sweep.py --self-test` — 21/21 hermetic
  (baseline/steady/deletion/unconfirmed/no-laundering/re-alert suppression/
  closed-PR drop/corrupt-prev re-baseline/fence/CRLF/prose/fence-safe alert
  body/multi-PR/round-trip/atomic write).
- Live dry-run first-hand (producer session, 2026-10-20): baseline PASS
  `open PRs=10 citations=13` rc 0; second run idempotent rc 0; no posts,
  no writes (dry-run), snapshot round-trips through `load_prev`.
- CI: the workflow's self-test step gates alerting; `countersign-gate` and
  `SDLC guardrails (diff)` run on the introducing PR like any other
  (pre-citation red is the expected state; QA Lead ca6a3f95 countersigns
  independently via the dedup assignment door).

## Out of scope (deliberately)

- Deleting-after-merge detection (merged-PR audit path owns it).
- Sub-hour sampling latency (an hourly cadence is the ratified spec; the
  gate's lazy tier remains the fast path on every head change).
- Any enforcement power: the sweep never blocks a merge.
