# Intent: dojoToday togglable buttons — clean accessible names (single variant PR #679)

Author: ORDEM CEO (diretiva f0fa79ef, fila pós-#626) via Paperclip AID-4864 · Change-id: AID-4864-dojotoday-a11y-toggles · Status: accepted

> Origin: AID-4864 "ORDEM CEO (f0fa79ef, fila pós-#626): QA Lead — finalizar
> variante única PR #679 (intent/ + countersign próprio) e fechar duplicados
> #675/#681 + subsets #677/#678" (assigned to QA Lead, 2026-10-16T00:08Z).
> Runtime delta produced by Jules/Palette (task 6287823821326653033, commit
> 62e00ce4); this change record ratifies the single variant and documents the
> administrative close of the duplicated variants.

## Problem

`engines/dojoToday/src/main.ts` renders two togglable controls with decorative
emoji inside the accessible name: `#play-inline-btn` (▶/▽) and `#soc-config-btn`
(⚙️). Screen readers announce the symbols literally ("black right-pointing
triangle Jogar aqui (inline)"), and the dynamic toggle used `textContent`,
which would strip any wrapper markup on state change. Five Palette variants
landed on the same defect class between 2026-10-09 and 2026-10-14 (#675, #677,
#678, #679, #681), stalling the fix in a duplicate queue.

## Proposed outcome

1. Single merged variant (#679): decorative emojis wrapped in
   `<span aria-hidden="true">`, explicit `aria-label` on both buttons, and
   `innerHTML` + `aria-label` updates on the play toggle state change.
   Observable behavior: Chromium accessible names are
   `"Jogar aqui (inline)"`, `"Recolher jogo"` (expanded) and
   `"Configurar assistente (opcional)"` with no symbol in the name; visible
   text unchanged.
2. Registry entry in `.jules/palette.md` (2026-10-13 learning) travels with
   the fix; no other files change.
3. Duplicates closed with blob-level evidence: #675/#681 main.ts is
   byte-identical (blob `99fe05dc`) to #679 but lack the registry entry
   (#681 also adds a stray root `update_pr.md`); subsets #677 (no
   `aria-label`) and #678 (misses `soc-config-btn`) are strictly partial.

## Affected users and systems

`engines/dojoToday/` (read-only daily-lesson surface; renders generated
snapshot, never writes learner state). Screen-reader users of the mission card
controls. No substrate, no CI workflows, no learner state, no generated
projections in the delta.

## Constraints

- Producer (Jules) ≠ countersigner (QA Lead): independent verification per
  AID-2768; merge only through `scripts/merge_pr.sh` with countersign-gate
  green on the pinned head.
- dojoToday gates must pass on the exact head: biome lint, `tsc --noEmit`,
  `vite build`, substrate selfcheck, Playwright suite (8 specs), plus the
  required PR checks (`dojoToday (TS + substrate)`, `SDLC guardrails (diff)`,
  `product readiness (claims)`, `countersign-gate`).
- No new dependencies, no CSS changes (visual parity: `.link-btn` styles only,
  the added `<span>` inherits inline text flow).

## Open questions

None carried forward. Known cosmetic note: `aria-label` equals the visible
text (emoji excluded), so WCAG 2.5.3 label-in-name holds.
