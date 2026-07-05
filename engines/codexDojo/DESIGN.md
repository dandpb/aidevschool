# codexDojo Design System

## 1. Atmosphere & Identity

codexDojo feels like a warm developer operations console: dark, compact, and instructional without becoming noisy. The signature is a brass-lit workbench where every panel teaches a concrete skill, with terminal-native density balanced by readable learning notes.

## 2. Color

### Palette

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Canvas | `--ink` | `#11110f` | Page background |
| Canvas RGB | `--ink-rgb` | `17, 17, 15` | Transparent overlays |
| Surface/default | `--panel` | `#1f1f1a` | Panels and app windows |
| Surface/strong | `--panel-strong` | `#282820` | Active controls and focused panes |
| Surface/subtle | `--charcoal` | `#1b1b18` | Secondary backgrounds |
| Text/primary | `--paper` | `#f5efe1` | Headings and primary labels |
| Text/muted | `--muted` | `#b7b09d` | Descriptions and metadata |
| Border/default | `--line` | `#3a362c` | Dividers and panel boundaries |
| Accent/primary | `--brass` | `#d8aa35` | Primary actions and active state |
| Accent/primary RGB | `--brass-rgb` | `216, 170, 53` | Accent overlays |
| Status/success | `--mint` | `#80e2a8` | Completed or healthy state |
| Status/info | `--cyan` | `#63d5df` | Code, network, and output state |
| Status/error | `--coral` | `#f16d4f` | Warning and failed state |

### Rules

- Warm near-black surfaces only; do not introduce cold blue-black canvases.
- Accent color is functional: active app, focus state, primary command, or learning checkpoint.
- New Linux Lab styling must use these tokens instead of adding local hex colors.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
| --- | --- | --- | --- | --- | --- |
| Display | `clamp(2.4rem, 5vw, 3.5rem)` | 400 | 0.92 | 0 | Main view heading |
| H2 | `clamp(1.6rem, 3vw, 2.4rem)` | 400 | 1.05 | 0 | Section title |
| H3 | `1.2rem` | 400 | 1.2 | 0 | Panel title |
| Body | `1rem` | 400 | 1.5 | 0 | Standard text |
| Body/sm | `0.85rem` | 400 | 1.4 | 0 | Secondary text |
| Caption | `0.72rem` | 800 | 1.3 | `0.03em` | Uppercase metadata |
| Code | `0.85rem` | 400 | 1.45 | 0 | Terminal and command output |

### Font Stack

- Primary: `"Avenir Next", "Trebuchet MS", Verdana, sans-serif`
- Display: `"Iowan Old Style", Georgia, serif`
- Mono: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`

### Rules

- Do not scale font size with viewport width except existing `clamp()` display sizes.
- Keep headings calm; avoid bold weights above 800 and decorative letter spacing.

## 4. Spacing & Layout

### Base Unit

All spacing maps to a 4px base.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-1` | `4px` | Tight inline gaps |
| `--space-2` | `8px` | Button and row gaps |
| `--space-3` | `12px` | Compact padding |
| `--space-4` | `16px` | Panel padding |
| `--space-5` | `20px` | Detail panel padding |
| `--space-6` | `24px` | Page padding |
| `--space-8` | `32px` | Major groups |

### Grid

- Shell: fixed `200px` sidebar plus fluid content.
- Linux Lab desktop: launcher, active app window, and lesson panel on desktop; single-column stack below tablet width.
- Stable app icons use fixed square dimensions so labels and hover states never shift the grid.

## 5. Components

### Sidebar Nav

- **Structure**: vertical `<button>` stack with active left border.
- **States**: default muted, hover brass overlay, active brass border, focus visible brass outline.
- **Accessibility**: real buttons with readable labels.

### Command Panel

- **Structure**: bordered section with primary heading, short text, and actions.
- **States**: static content surface; inner buttons own interaction state.
- **Motion**: hover and active transforms only on controls.

### Linux Desktop

- **Structure**: top system bar, launcher grid, active app window, terminal output, lesson panel.
- **Variants**: app tile, category filter, active app window, run receipt.
- **States**: selected app, selected category, run count, hover, active, focus.
- **Accessibility**: app tiles and filters are real buttons; active lesson is visible text, not only color.
- **Motion**: transform/opacity only; no layout animation.

### Data Card

- **Structure**: bordered compact panel with caption, title, body, and optional code.
- **Variants**: principle, process, exercise, output.
- **States**: static by default; hover only when clickable.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | `120ms` | `ease` | Button hover and active |
| Standard | `180ms` | `ease` | Tile selection and panel emphasis |

Rules:

- Animate only `transform`, `opacity`, `background`, `border-color`, or `color`.
- Every clickable element has hover, active, and focus-visible states.
- Respect reduced-motion by avoiding required animation for comprehension.

## 7. Depth & Surface

Strategy: border-only with tonal-shift.

- Page depth comes from `--panel`, `--panel-strong`, `--charcoal`, and `--line`.
- Shadows are avoided except for browser-native focus paint; panels should feel grounded.
- Generated concept reference: `shots/linux-lab-concept.png`
