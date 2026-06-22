# PixelDojo Quest Design System

## 1. Atmosphere & Identity

PixelDojo Quest feels like a small arcade lab terminal: crisp, dark, compact, and evidence-driven.
The signature is a low-chrome 8-bit HUD over a readable playfield, where amber gate accents and cyan
review signals make the current learning loop obvious without covering the map.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
| --- | --- | --- | --- | --- |
| Surface/primary | `--surface-primary` | `#101827` | `#070a10` | Page and panel background |
| Surface/canvas | `--surface-canvas` | `#080b12` | `#080b12` | WebGL scene background |
| Surface/overlay | `--surface-overlay` | `rgba(8, 11, 18, 0.88)` | `rgba(8, 11, 18, 0.88)` | HUD chips |
| Surface/button | `--surface-button` | `#172333` | `#172333` | Buttons |
| Text/primary | `--text-primary` | `#edf4f8` | `#edf4f8` | Primary HUD and panel text |
| Text/accent | `--text-accent` | `#f6dd88` | `#f6dd88` | Rewards, gate state, panel headings |
| Text/info | `--text-info` | `#9ee0ff` | `#9ee0ff` | Prompts and review due state |
| Border/default | `--border-default` | `#263a4e` | `#263a4e` | HUD chips |
| Border/strong | `--border-strong` | `#cfa64a` | `#cfa64a` | Panels and primary buttons |
| Border/canvas | `--border-canvas` | `#20283a` | `#20283a` | Playfield frame |
| Focus/default | `--focus-default` | `#74d4ff` | `#74d4ff` | Keyboard focus |

### Rules

- Cyan is reserved for review timing, prompts, and input-ready states.
- Amber is reserved for gates, rewards, panel headings, and primary affordances.
- The playfield stays darker than the HUD so sprites and tiles remain readable.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
| --- | --- | --- | --- | --- | --- |
| H2 | `17px` | 700 | 1.2 | 0 | Panel titles |
| Body | `14px` | 400 | 1.45 | 0 | Panel body text |
| Body/sm | `13px` | 400 | 1.2 | 0 | Desktop HUD chips |
| Caption | `12px` | 400 | 1.2 | 0 | Mobile HUD chips |

### Font Stack

- Primary: `"Courier New", Courier, monospace`
- Mono: `"Courier New", Courier, monospace`
- Serif: not used

### Rules

- Keep text short and scannable; panels are game state, not documentation pages.
- Preserve the mono stack for the retro terminal feel.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of 4px.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-2` | `8px` | Compact chip and button padding |
| `--space-3` | `12px` | Button horizontal padding |
| `--space-4` | `16px` | Panel padding and viewport edge offset |
| `--space-5` | `20px` | Prompt chip bottom offset |
| `--space-6` | `24px` | Encounter top offset rhythm |

### Grid

- Max canvas width: `1120px`
- Max canvas height: `840px`
- Canvas aspect: `4 / 3`
- Breakpoint: `720px`

### Rules

- Persistent HUD lives at the edges; the center of the playfield stays clear.
- Panels may cover the lower middle only during dialogue, journal, or encounter mode.

## 5. Components

### HUD Chip

- **Structure**: absolutely positioned `div` inside `.hud`
- **Variants**: objective, status, phase, prompt
- **Spacing**: `--space-2` to `--space-3`
- **States**: passive display only
- **Accessibility**: concise text; no interactive role
- **Motion**: none

### Panel

- **Structure**: `section.panel` with `h2`, body copy, and `.panel-actions`
- **Variants**: dialogue, gate message, encounter, journal
- **Spacing**: `--space-4`
- **States**: visible, hidden
- **Accessibility**: buttons use native `button`; focus ring uses `--focus-default`
- **Motion**: none in the current slice

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | `100ms` | ease-out | Future button press feedback |
| Standard | `200ms` | ease-in-out | Future panel transitions |

### Rules

- Keep the current slice static unless motion carries game feedback.
- Future motion should use opacity or transform only.
- Respect `prefers-reduced-motion` for non-essential effects.

## 7. Depth & Surface

### Strategy

Borders-only with one hard pixel shadow for modal-like panels.

| Type | Value | Usage |
| --- | --- | --- |
| Default | `2px solid var(--border-default)` | HUD chips |
| Strong | `2px solid var(--border-strong)` | Panels and buttons |
| Canvas | `2px solid var(--border-canvas)` | Playfield frame |
| Panel shadow | `0 12px 0 rgba(0, 0, 0, 0.32)` | Large panels only |
