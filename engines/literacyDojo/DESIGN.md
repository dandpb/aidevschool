---
version: alpha
name: literacyDojo — warm friendly learning
description: Light, warm, approachable microlearning for nontechnical people. Paper-toned surfaces, violet primary, pastel mint/sun/coral accents, generous 18px radii and playful offset shadows. Every control looks pressable.
colors:
  bg: "#f8f4ea"
  surface: "#fffdf8"
  surface-strong: "#ffffff"
  text: "#17213a"
  muted: "#454f6a"
  muted-strong: "#3f4a66"
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
  success-text: "#0d5c3b"
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
- **Semantic pairs** (bg+text): success `#e8f8ef`/`#0d5c3b`, error `#fff0ed`/`#b83a31`. Keep pairs together; don't mix tints.

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

## Progress HUD — contrato cross-engine

Os elementos "onde estou" (streak, medidor de progresso, mastery, revisões
FSRS) seguem o contrato do HUD de progresso do ecossistema —
`docs/design/design-foundations.md` **§7** (v2.0, AID-5010; aliases
AID-5141/W5): **papéis e estados são contratuais, a paleta é engine-local**.
O literacyDojo declara os 11 tokens `--ads-*` enumerados na tabela §7.1 (o titular "10" do plano AID-5010 conta os nomes errado) em `src/styles.css`
mapeando os valores locais atuais (zero delta visual) — este é o formato de
referência do par mastery (§7.1):

| Papel | Tokens (§7.1) | Mapeia hoje |
| --- | --- | --- |
| Rótulos do HUD | `--ads-progress-text` / `--ads-progress-muted` | `--text` / `--muted` |
| Medidor | `--ads-progress-track` / `--ads-progress-fill` | `#e5e9f0` / `#4f46e5` (início do gradiente local de `.progress-fill`) |
| Streak | `--ads-streak-accent` | `--sun` (accent quente dos glifos decorativos; pill "Sequência" não tem glifo hoje) |
| Mastery | `--ads-mastery-text` / `--ads-mastery-bg` | par atômico stat-done `--success-text`/`--success-bg` (referência do contrato) |
| Revisão devida | `--ads-review-text` / `--ads-review-bg` | lista `reviews-due` / `card-review` (`--text` sobre `--surface`) |
| Atrasada | `--ads-attention-text` / `--ads-attention-bg` | par de alerta local `--error-text`/`--error-bg` |

Tier de acessibilidade do HUD: **B9** (§7/§4 do contrato — AAA 7:1 texto,
3:1 não-texto; B2 AA continua o piso geral). Anatomia canônica de 4 papéis,
testids `hud-streak`/`hud-progress`/`hud-mastery-badge`/`hud-review-due` e
responsividade 375/768/1280 chegam na W7 (AID-5010) — até lá os tokens são
declaração+mapping, sem consumidores. **AID-5177/W6 — retune AAA aplicado**
(contrato §4 B9a/B9b): `--muted` #657089→#454f6a, `--muted-strong`
#4f5a75→#3f4a66, par stat-done `--success-text` #14734d→#0d5c3b (fundo
`#e8f8ef` inalterado) e **extremo do gradiente do medidor** `#0ea5e9`→
`#0284c7` (não-texto 2.28:1→3.36:1 sobre a trilha `#e5e9f0`, WCAG 1.4.11) —
os marcadores `@deprecated → --ads-* (B9)` destes pares foram removidos
(janela fechada na W6). Evidência: `playwright/a11y-w6-hud-aaa.spec.ts`
(getComputedStyle; 0 falhas B9a/B9b/B2).

## Do's and Don'ts

- Do keep the violet for interactive elements only.
- Don't use dark surfaces; this surface is always light and warm.
- Do pair semantic colors with their own text tint.
- Don't shrink radii below 12px — roundness is the personality.
- Do keep the `--ads-*` alias tokens (AID-1089 state contract) working; they
  map to local values and must not drift.
