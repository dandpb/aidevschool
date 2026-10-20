---
version: alpha
name: dojoToday — soft daily card
description: Read-only daily-lesson surface for programmers. Cream gradient canvas, indigo primary with deep variants, amber/success/trap semantic tracks, 22px radii and soft tinted shadows. Calm morning-newspaper energy.
colors:
  bg: "#fdf6ec"
  bg-grad-a: "#fdf6ec"
  bg-grad-b: "#f3e9ff"
  ink: "#1f1b2e"
  ink-soft: "#4f4a5e"
  muted: "#4e495b"
  card: "#ffffff"
  line: "#ece6f5"
  primary: "#4f46e5"
  primary-deep: "#312e81"
  amber: "#f59e0b"
  amber-deep: "#b45309"
  success: "#16a34a"
  success-deep: "#12502a"
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
- **Ink ladder** (`#1f1b2e` → `#4f4a5e` → `#4e495b`): text at three volumes; `--muted`/`--ink-soft` were AAA-retuned in AID-5177/W6 (HUD pairs ≥7:1, hue preserved) — don't lighten them.
- **Primary indigo** (`#4f46e5` / deep `#312e81`): single interactive color; pill CTAs. HUD eyebrows use the W6 local pair value `#3b37b6` (≥7.4:1 on the worst gradient endpoint, same hue).
- **Track semantics** (soft bg + saturated text): success `#dcfce7`/`#12502a` (deep per AID-5177/W6 — 8.67:1), review/trap `#f3e8ff`/`#7c3aed`, attention `#ffe4e6`/`#e11d48`, amber `#f59e0b`/`#b45309`. Pairs are atomic — never recombine.

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

## Progress HUD — contrato cross-engine

Os elementos "onde estou" (streak, medidor de progresso, mastery, revisões
FSRS) seguem o contrato do HUD de progresso do ecossistema —
`docs/design/design-foundations.md` **§7** (v2.0, AID-5010; aliases
AID-5141/W5): **papéis e estados são contratuais, a paleta é engine-local**.
O dojoToday declara os 11 tokens `--ads-*` enumerados na tabela §7.1 (o titular "10" do plano AID-5010 conta os nomes errado) em `src/styles.css`
mapeando os valores locais atuais (zero delta visual):

| Papel | Tokens (§7.1) | Mapeia hoje |
| --- | --- | --- |
| Rótulos do HUD | `--ads-progress-text` / `--ads-progress-muted` | `--ink` / `--muted` |
| Medidor | `--ads-progress-track` / `--ads-progress-fill` | `--line` / `--primary` (início do gradiente local) |
| Streak | `--ads-streak-accent` | `--amber` (chama `.streak-flame.is-lit`, decorativa `aria-hidden`) |
| Mastery | `--ads-mastery-text` / `--ads-mastery-bg` | par atômico `--success-deep`/`--success-soft` |
| Revisão devida | `--ads-review-text` / `--ads-review-bg` | chip `.tone-success` pós-W4 (`#ffffff` sobre `--success-deep`) |
| Atrasada | `--ads-attention-text` / `--ads-attention-bg` | chip `.tone-danger` (`#ffffff` sobre `--danger`) |

Tier de acessibilidade do HUD: **B9** (§7/§4 do contrato — AAA 7:1 texto,
3:1 não-texto; B2 AA continua o piso geral). Anatomia canônica de 4 papéis,
testids `hud-streak`/`hud-progress`/`hud-mastery-badge`/`hud-review-due` e
responsividade 375/768/1280 chegam na W7 (AID-5010) — até lá os tokens são
declaração+mapping, sem consumidores. **AID-5177/W6 — retune AAA aplicado**
(contrato §4 B9a/B9b): `--muted` #686378→#4e495b, `--ink-soft`
#5b5570→#4f4a5e, eyebrow do HUD `#3b37b6` (valor local do par; `--primary`
segue #4f46e5 em CTAs/medidor), `--success-deep` #166534→#12502a — os
marcadores `@deprecated → --ads-* (B9)` destes pares foram removidos
(janela fechada na W6; remoção final auditada 2 ciclos após). Evidência:
`playwright/a11y-w6.spec.ts` (getComputedStyle; 0 falhas B9a/B9b/B2).

## Do's and Don'ts

- Do keep the AAA-retuned values (`--muted`, `--ink-soft`, `--success-deep` eyebrow `#3b37b6`) — AID-914/1023/1027 fixed AA deliberately and AID-5177/W6 raised the HUD pairs to AAA; don't lighten them.
- Don't add new accent hues; track semantics cover the states.
- Do keep it read-only in spirit: one primary CTA, quiet everything else.
- Don't hard-code colors in components — use the CSS variables.
