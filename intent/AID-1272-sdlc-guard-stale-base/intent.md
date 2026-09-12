# Intent: PR guard comparison base must be the current base branch tip, not the PR-creation sha

Author: Paperclip AID-1272 (BUG CI MED, assigned to FPE) · Change-id: AID-1272-sdlc-guard-stale-base · Status: accepted (issue scope assigned by harness dispatch; minimal bounded CI-only fix)

> One source of truth: the AID-1272 issue body. Title (quoted): "guard
> protect-tests classifica teste MODIFICADO como ADICIONADO quando a base do
> PR é stale (range cumulativo); edição sem trailer passa no head e só
> vermelha no main". Downstream incident already on record: main-tip PR #327
> (AID-1268) re-asserted a trailer-less literacyDojo test edit after the guard
> went red only on main.

## Problem

The `sdlc-guards` job resolves its comparison base as
`github.event.pull_request.base.sha` (.github/workflows/ci.yml, "resolve
comparison base" step). That payload field is frozen at PR creation. Once main
advances after the PR opens and the branch merges it, the wrapper's
`git diff <merge-base(stale_base,head)> head` range is cumulative and a test
that MAIN added after the branch point appears as `A` — the existence mirror
leaves it unmaterialized and `protect-tests.sh` applies its
new-test-allowed branch. The trailer-less edit of an existing test therefore
passes at the PR head, and the same edit is only flagged after merge, when the
main push run (`github.event.before..HEAD`) diffs against the real main tip
and sees `M`.

Reproduced synthetically (worktree `fpe/aid-1272/sdlc-guard-stale-base`,
scratch repo with the real hooks): stale base → `A tests/unit/test_x.py`,
guard rc=0; current base tip → `M tests/unit/test_x.py`, rc=1; main-push range
after merge → rc=1. Exactly the reported symptom.

## Proposed outcome

For `pull_request` events the guard compares against the CURRENT base branch
tip (`origin/${{ github.event.pull_request.base.ref }}`; `fetch-depth: 0`
fetches all branches so the ref resolves, and the existing fallback warns and
runs the self-test only if it ever does not). A trailer-less edit of an
existing test is then red at the head, before merge — same verdict at head and
on the post-merge main run. Push events keep `github.event.before` (previous
main tip; already current-at-event).

## Affected users and systems

`.github/workflows/ci.yml` (sdlc-guards job base resolution only),
`scripts/sdlc_guard_check.sh` (`--self-test` gains the merged-advance and
stale-base scenarios), `docs/sdlc/README.md` (§Runtime-agnostic enforcement
documents the base semantics), this intent chain. No engine runtime, learner
state, curriculum content, or hook semantics change — the canonical
`protect-tests.sh` is untouched.

## Constraints

- Hooks stay the single source of truth: only the caller's base resolution
  changes; the wrapper's diff→hook mapping is not forked.
- No override semantics change: the trailer path (`SDLC-ALLOW-TEST-EDIT`) and
  its owner-approval trust model are untouched.
- Bounded CI-only fix; no product/engine code in the diff.

## Open questions

None. (Wrapper-side staleness detection was considered and rejected: the
wrapper cannot know the true branch tip; only the caller can pass it.)
