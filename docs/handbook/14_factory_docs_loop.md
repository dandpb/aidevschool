# Factory docs loop

Run a documentation change through the agentic factory so that a doc commit is
promoted only with deterministic, independently reproduced evidence — the same
rail used by code changes. This page is the docs-author path; the
[factory README](../../factory/README.md) owns the motor internals and the
P1–P5 exit criteria, and [the SDLC loop](../sdlc/README.md) owns the
intent → spec → plan → checks contract format.

Use it when a documentation change must carry proof that survives review:
dated claims, resolvable links, structure a verifier can re-check by command.

## Prerequisites

- A checked-out repo at the agreed base commit (`origin/main` after the
  factory PRs merged) and Python ≥ 3.11. No external services; runtime state
  stays under gitignored `.scratch/factory/`.
- A versioned contract at `intent/<change-id>/` with `intent.md`, `spec.md`,
  an approved `plan.md` (`Status: approved` in the header block), and a
  `checks.md` whose checks are **deterministic commands over the docs
  artifacts** (structure, dated claims, index rows, link resolution). A docs
  change does not need to run product code to be provable.
- Two contexts: one author context and one verifier context. The factory
  refuses promotion when they are the same (producer never verifies its own
  work).

## Step by step

From the repo root, with the contract already written:

```bash
python3 -m factory intake --event-id FE-DOCS-1 --origin <issue> --scope "docs: <what>" --risk low
python3 -m factory claim  FE-DOCS-1 --context agent-docs-author
python3 -m factory freeze FE-DOCS-1 --change-id <change-id> --context agent-docs-author
python3 -m factory build  FE-DOCS-1 --context agent-docs-author --cmd "<writes the doc commit>"
python3 -m factory prove  FE-DOCS-1 --context agent-docs-verifier
python3 -m factory gate   FE-DOCS-1 --context coordinator --pr-head <branch-head-sha>
```

What each station contributes for a docs change:

1. **intake/claim** — the event enters the queue and one lease is taken;
   a second claim is refused (exit 2).
2. **freeze** — the contract is copied and digest-locked before any writing.
   Later edits to `intent/<change-id>/` block promotion.
3. **build** — the author writes the doc and the index row in an isolated
   worktree pinned to the base SHA and commits; the commit SHA is receipted.
4. **prove** — a distinct verifier re-runs the checks in a clean-room worktree
   at the build SHA. Non-code checks are first-class: exit 0 of a doc
   assertion is proof like any other.
5. **gate** — fail-closed evaluation (digest, SHA binding, producer ≠
   verifier, proof anchors, PR head). `promote` requires every gate to pass.

Open the PR from the promoted worktree commit so the PR head is exactly the
proven SHA, and let CI run on that head.

## Verification

- `python3 -m factory ledger FE-DOCS-1 --verify` revalidates the hash chain
  and the external head anchor; a promote verdict without a verifiable chain
  is not evidence.
- The run receipt (`.scratch/factory/runs/run-FE-DOCS-1/receipt.summary.json`)
  records verdict, SHA, contract digest, author/verifier contexts, and proof
  anchors. Quote it in the issue thread with file paths.
- A docs claim in the promoted page must stay dated and sourced: "Last
  verified" below is the freshness contract for this page itself.

Last verified: 2026-09-26 · base `e0f6a3d8` · evidence: factory run
`run-FE-DOCS-2698` (issue AID-2698), 3/3 checks passed in clean-room by a
verifier context distinct from the author.
