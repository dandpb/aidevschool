---
version: alpha
name: dojoToday — soft daily card
description: Read-only daily-lesson surface for programmers. Cream gradient canvas, indigo primary with deep variants, amber/success/trap semantic tracks, 22px radii and soft tinted shadows. Calm morning-newspaper energy.
colors:
  bg: "#fdf6ec"
  bg-grad-a: "#fdf6ec"
  bg-grad-b: "#f3e9ff"
  ink: "#1f1b2e"
  ink-soft: "#5b5570"
  muted: "#686378"
  card: "#ffffff"
  line: "#ece6f5"
  primary: "#4f46e5"
  primary-deep: "#312e81"
  amber: "#f59e0b"
  amber-deep: "#b45309"
  success: "#16a34a"
  success-deep: "#166534"
  success-soft: "#dcfce7"
  danger: "#e11d48"
  danger-soft: "#ffe4e6"
  trap: "#7c3aed"
  trap-soft: "#f3e8ff"
  on-primary: "#ffffff"
typography:
  body-md:
    fontFamily: system-ui
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 12px
  md: 22px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
components:
  lesson-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 24px
  primary-cta:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
  track-mastered:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success-deep}"
    rounded: "{rounded.sm}"
  track-review:
    backgroundColor: "{colors.trap-soft}"
    textColor: "{colors.trap}"
    rounded: "{rounded.sm}"
  track-attention:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
---

# dojoToday — soft daily card

## Overview

The programmer's "lesson for today" landing: FSRS due reviews, streak, active
unit — read-only, one glance. Calm morning-newspaper energy: soft cream-to-lavender
gradient, white cards, indigo CTA. It informs and sends you off; it never nags.

## Colors

- **bg gradient** (`#fdf6ec` → `#f3e9ff`): warm cream fading to soft lavender.
- **Ink ladder** (`#1f1b2e` → `#5b5570` → `#686378`): text at three volumes; `--muted` was AA-tuned in AID-1023/W0 (≥4.5:1 on every pair) — don't lighten it.
- **Primary indigo** (`#4f46e5` / deep `#312e81`): single interactive color; pill CTAs.
- **Track semantics** (soft bg + saturated text): success `#dcfce7`/`#166534` (deep per AID-1027/W1 — 6.49:1), review/trap `#f3e8ff`/`#7c3aed`, attention `#ffe4e6`/`#e11d48`, amber `#f59e0b`/`#b45309`. Pairs are atomic — never recombine.

## Typography

System stack, 15px body. Numbers (streak, counts) get weight; labels stay quiet.

## Layout

Vertical card stack on the gradient canvas; one primary action per view.

## Elevation & Depth

Soft tinted shadows (`--shadow` family, indigo-tinted) lift white cards off the
cream canvas — depth as calm, not drama.

## Shapes

22px card radius (`--radius`), pill buttons. Softer than codexDojo, rounder
than a spreadsheet.

## Components

Lesson cards are the unit; track glyphs use the soft+tint pairs with the deep
variant for text (the AA-corrected pattern).

## Do's and Don'ts

- Do keep AA-tuned values (`--muted`, `--success-deep`) — audits AID-914/1023/1027 fixed them deliberately.
- Don't add new accent hues; track semantics cover the states.
- Do keep it read-only in spirit: one primary CTA, quiet everything else.
- Don't hard-code colors in components — use the CSS variables.
