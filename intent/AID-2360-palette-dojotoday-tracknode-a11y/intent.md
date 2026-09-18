# Intent: Palette explicit ARIA labels for dojoToday track nodes (PR #487)

Author: google-labs-jules[bot] (Palette, a11y) on founder login · Change-id: AID-2360-palette-dojotoday-tracknode-a11y · Status: gated-on-countersign (FPE verdict GO posted; merge awaits QA countersign or founder merge, per §PRs automatizados)

> Originates from Paperclip triage AID-2360 (SM audit AID-2358 Registro #1,
> 2026-09-17 19:51Z window). Producer record registered by the FPE (agent
> fa8130d5, dispatched by AID-2360) per docs/sdlc/README.md §PRs
> automatizados (fast path, antes do merge): an open bot PR is not a
> delivery; producer ≠ verifier is never waived.

## Problem

PR #487 (opened 2026-09-17T19:51:00Z, bot head `55f6edb2`, branch
`palette-dojotoday-tracknode-a11y-9261295508380994356`) adds a dynamic
`aria-label` to each `.track-node` `<li>` in the dojoToday "Sua trilha"
list and `aria-hidden="true"` to the inner generic text spans
(`.track-num`, `.track-title`). Today the lesson state (`is-mastered`,
`is-active`, `is-available`) is applied via CSS classes only, which is
invisible to screen readers — the list announces numbers/titles with no
state, so a screen-reader user cannot tell concluded from active lessons.

The PR carried no Paperclip chain (bot accounts have none), so this record
+ the FPE first-hand verdict + an independent countersign are required
before any merge (ordering binding AID-2219; recurrence class AID-767/F1).

## Proposed outcome

Each track node announces "Lição `<num>`: `<title>` (`<state>`)" with
state ∈ {concluída, ativa, disponível} mirroring the visual track
semantics; the visible text, layout, colors, and behavior are unchanged
(semantic layer only); the read-only surface contract of dojoToday
(never schedules, grades, or marks mastery) is untouched; repo root stays
clean (no debris files — verified: the PR changes exactly 1 file).

## Affected users and systems

`engines/dojoToday/src/main.ts` (+6/−3) — single hunk inside
`trackSection()` (`engines/dojoToday/src/main.ts:188`); no other file,
no test edits, no protected paths, no generated/derived paths.

## First-hand verification (FPE, 2026-09-17 ~20:5xZ — full evidence in the AID-2360 verdict comment)

- Diff-boundedness: 1 commit, 1 file, single hunk; no debris (contrast:
  PR #434 carried two root debris files).
- Injection safety: the new attribute is
  `aria-label="${escapeHtml(ariaLabel)}"`; `escapeHtml`
  (`engines/dojoToday/src/escape.ts`) escapes `"` → `&quot;` (plus
  `<>&'`), so the attribute stays well-formed under hostile titles —
  consistent with the dojoToday string-template defense-in-depth line
  (AID-2201, AID-2205).
- State text covers the complete `TrackStatus` union
  (`engines/dojoToday/src/types.ts:25`: mastered|active|available) with
  no fallthrough: mastered→concluída, active→ativa, else disponível.
- A11y semantics: `aria-label` on `<li>` (role `listitem`, name from
  author) + `aria-hidden` on the redundant inner spans avoids double
  announcement — same pattern accepted for Palette in #434/AID-2034 and
  #228 retro; the `<details class="play-how">` interactive element
  remains exposed (interactive content is not hidden).
- Non-blocking nit: the `is-next` highlight is not distinguished in the
  label ("ativa" covers both active and next) — optional follow-up, not
  a merge condition.
- DESIGN.md compliance: no color/token/layout change; state text mirrors
  the visual track semantics; "read-only in spirit" preserved
  (render-layer enrichment only).
- Test impact: no spec asserts track-node accessible names or strict
  track markup; `a11y-w0.spec.ts` contrast checks select `.track-num`
  by CSS selector (element kept, colors untouched → unaffected).
- CI first-hand on bot head `55f6edb2` (full pagination per AID-1618 §2):
  41 check-runs = 40 success + 1 skipped; `SDLC guardrails (diff)`
  present+success (the "absent" reading in the AID-2360 dispatch was a
  page-1-only pagination artifact — 30-item default page); `dojoToday
  (TS + substrate)` success; `product readiness (claims)` success. The
  single skip (`pixelDojo games/${{ matrix.game.name }} (TS)`,
  unrendered matrix name) is pre-existing on base `a6dd262d` — structural,
  not introduced by this PR.
