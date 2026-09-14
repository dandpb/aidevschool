# Intent: Sentinel noopener + readiness re-grant v50 (PR #407)

Author: google-labs-jules[bot] (Sentinel, security) on founder login; re-grant cycle by Founding Product Engineer · Change-id: AID-1795-sentinel-noopener-regrant · Status: accepted (merge gated on QA countersign with explicit gitlink adjudication)

> Originates from Paperclip triage AID-1795 (Registro SDLC #34, AID-1794 F1);
> readiness re-grant cycle produced under AID-1797 (receipt 02:41Z). The bot
> has no Paperclip presence — producer record registered by the CEO per
> docs/sdlc/README.md §PRs automatizados (fast path, antes do merge).

## Problem

PR #407 (MEDIUM security) adds `rel="noopener noreferrer"` to external links
(`target="_blank"`) in literacyDojo and codexdojo-os-prototype. Its tree also
removes the orphan gitlink `engines/zai-duolingo-like` (undeclared in the PR
title/body — flagged at triage; adjudicated below). The PR arrived red on
`product readiness (claims)` (stale-claims class, DRIFT README os-*/literacy)
because its diff touches surfaces with granted claims; rebase could not fix
(merge-base = main head). AID-1797 ran the v46-style re-grant cycle (v50)
directly on the PR branch.

## Proposed outcome

External links on both surfaces carry explicit `noopener noreferrer`
(defense-in-depth; `noreferrer` already implies `noopener` in modern
browsers). Readiness claims for the affected use cases (3 os-* + 2 literacy +
os-voxel re-anchor) are re-granted fresh at the PR head with full
producer/observation evidence. The orphan gitlink (160000, no `.gitmodules`,
unresolvable commit `81098710`, source of the git-exit-128 warning class) is
removed from the tree.

## Affected users and systems

`engines/literacyDojo/src/app/App.tsx`,
`engines/literacyDojo/src/components/SupportCta.tsx`,
`engines/codexdojo-os-prototype/src/journey/SupportCta.tsx`,
`engines/zai-duolingo-like` (gitlink removal), `.jules/sentinel.md` (log),
`docs/product-readiness/` (v50 assessments + evidence bundles).

## Constraints

Code delta bounded (+17/−4 across 5 paths); readiness evidence generated with
fresh-context walks (producer Jules ≠ verifier FPE); no PII; no policy/CI
surfaces changed.

## Open questions

None — gitlink hunk adjudicated by FPE (KEEP; comment `5658223259` on PR
#407): zero fingerprint impact (no sourcePath covers it), removes the
exit-128 warning class, deletes no real content (orphan pointer, commit
unresolvable). Final ratification assigned to the QA countersign.
