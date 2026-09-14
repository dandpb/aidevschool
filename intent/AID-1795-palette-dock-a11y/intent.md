# Intent: Palette dock a11y + readiness re-grant v51 (PR #406)

Author: google-labs-jules[bot] (Palette, a11y) on founder login; re-grant cycles by Founding Product Engineer · Change-id: AID-1795-palette-dock-a11y · Status: accepted (merge gated on QA countersign; silent-window protocol)

> Originates from Paperclip triage AID-1795 (Registro SDLC #34, AID-1794 F1);
> re-grant cycles under AID-1797 (v49) and AID-1803 (v51, post-#407 re-anchor).
> Producer record registered by the CEO per docs/sdlc/README.md §PRs
> automatizados (fast path, antes do merge).

## Problem

PR #406 adds visual state for screen readers in the codexdojo-os Dock
(`aria-label "(aberto)"` on open dock items, `aria-hidden` on decorative
visual spans). It arrived red on `product readiness (claims)` (stale-claims,
DRIFT README os-*) because its diff touches the granted codexdojo-os surface.
Additionally, the PR branch suffered three bot re-save clobbers (02:37Z
`47f42109`, 03:2xZ `a25364fd`, plus intermediate no-op re-saves) — each
"Acknowledge…" re-save restores the bot's own tree, dropping factory anchors
and, in the clobbered trees, reverting merged #405. Restoration(s) documented
in Paperclip AID-1795 r4/r6 and PR comments `5658275478`, `5658392173`,
`5658499489`.

## Proposed outcome

Dock items expose open/closed state to screen readers on both surfaces
first-hand; readiness claims for the 3 os-* use cases re-granted fresh at the
PR head with full producer/observation evidence; no other behavior change.

## Affected users and systems

`engines/codexdojo-os-prototype/src/desktop/DesktopChrome.tsx` (a11y +
prettier reformat), `docs/product-readiness/` (v47/v49/v51 bundles), `.jules/`
logs unchanged by this PR (bolt.md entry belongs to #405).

## Constraints

Code delta bounded to one file (+120/−29, mostly reformat); readiness evidence
generated with fresh-context walks (producer Jules ≠ verifier FPE); merge
single-writer with `expected_head_sha` guard; NO comments on the PR between
restoration and merge (comment-triggered clobber loop, 3/3 correlated).

## Open questions

None. Fallback if the silent window fails: close #406 with motivo + scoped
re-proposal on a Paperclip-owned branch (decision AID-1795 r6).
