# Receipt: <one-line title>

Author: <agent role/runtime> · Change-id: <AID-###-slug | YYYY-MM-DD-slug> · Date: <YYYY-MM-DD HH:MMZ>

> Build/completion receipt posted as the task record (Paperclip issue comment
> or PR description). Established by AID-1516 (prevention) after three
> incidences of untracked receipts/work-products in the shared checkout
> `_default` (class AID-1353-F1: AID-1354/PR #338, AID-1442/PR #343,
> AID-1514/F2). A receipt without the clean-tree proof below is incomplete.

## What was produced

Exact paths + branch/commit SHA/PR for every artifact (receipts,
work-products, evidence). One line each; no vague references.

## Verification run (first-hand, same session as the change)

Exact commands with exit codes or output digests. No claim (release,
performance, mastery, parity) without a cited check. Producer ≠ verifier:
cite the independent verdict/countersign when the gate requires one.

## Clean-tree proof (mandatory — AID-1516)

- [ ] `git status --porcelain` run in the shared checkout `_default` returns
      empty output **before the issue is flipped `done`**.
- Record first-hand: the observed output (`0` lines / empty, or the listing),
      plus the checkout branch and HEAD SHA at proof time.
- Anything that appears is either (a) committed — receipt/work-product/
      evidence — or (b) deleted, with the justification cited in this
      receipt's disposition table. "Leave it for later" is not a disposition.

## Disposition of every untracked/modified path

| Path | Action (commit/delete) | Justification (cite issue/precedent) |
| --- | --- | --- |

(Empty table only if the porcelain proof was empty.)

## Follow-ups

Issues/PRs opened or cited (blockers, delegated work, CEO merge request).
