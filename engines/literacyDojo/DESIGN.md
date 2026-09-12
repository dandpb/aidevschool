---
version: alpha
name: literacyDojo — warm friendly learning
description: Light, warm, approachable microlearning for nontechnical people. Paper-toned surfaces, violet primary, pastel mint/sun/coral accents, generous 18px radii and playful offset shadows. Every control looks pressable.
colors:
  bg: "#f8f4ea"
  surface: "#fffdf8"
  surface-strong: "#ffffff"
  text: "#17213a"
  muted: "#657089"
  muted-strong: "#4f5a75"
  primary: "#6657e8"
  primary-dark: "#4938c7"
  primary-soft: "#eeeaff"
  on-primary: "#ffffff"
  mint: "#49c98f"
  mint-dark: "#218b62"
  sun: "#ffbf47"
  coral: "#ff7d66"
  sky: "#bfe8f8"
  border: "#d9d3c7"
  success-bg: "#e8f8ef"
  success-text: "#14734d"
  error-bg: "#fff0ed"
  error-text: "#b83a31"
typography:
  body-md:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 12px
  md: 18px
  lg: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-press:
    backgroundColor: "{colors.primary-dark}"
    rounded: "{rounded.md}"
  chip-soft:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.full}"
  success-banner:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-text}"
    rounded: "{rounded.sm}"
  error-banner:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error-text}"
    rounded: "{rounded.sm}"
---

# literacyDojo — warm friendly learning

## Overview

AI microlearning for nontechnical audiences: warm, friendly, zero intimidation.
The UI should feel like a paper workbook — soft cream backgrounds, chunky
rounded cards, buttons that visibly press. Never corporate, never dark.

## Colors

- **bg/surface** (`#f8f4ea`/`#fffdf8`): warm paper canvas and card surfaces.
- **Primary violet** (`#6657e8`, dark `#4938c7`, soft `#eeeaff`): the only interactive brand color; soft tint for chips and washes.
- **Mint/sun/coral/sky**: pastel accents for lesson states and illustrations — friendly, never neon.
- **Semantic pairs** (bg+text): success `#e8f8ef`/`#14734d`, error `#fff0ed`/`#b83a31`. Keep pairs together; don't mix tints.

## Typography

System stack at comfortable sizes (16px body). Plain language, short lines,
no jargon — typography mirrors the teaching voice.

## Layout

Card-based single-column flow; generous whitespace. Mobile-first.

## Elevation & Depth

Playful offset shadows (`--shadow` family with hard bottom edges) make cards
and buttons feel physical and pressable — depth as affordance, not realism.

## Shapes

Large radii: 18px cards, 24px modals, full pills. Roundness is the brand.

## Components

Buttons use the press shadow (`--shadow-press`) and darken on press; banners
always use the semantic bg+text pairs; chips are soft-tinted pills.

## Do's and Don'ts

- Do keep the violet for interactive elements only.
- Don't use dark surfaces; this surface is always light and warm.
- Do pair semantic colors with their own text tint.
- Don't shrink radii below 12px — roundness is the personality.
- Do keep the `--ads-*` alias tokens (AID-1089 state contract) working; they
  map to local values and must not drift.
