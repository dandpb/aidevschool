# codexDojo OS Design System

## 1. Atmosphere & Identity

codexDojo OS feels like a focused educational Linux workstation at night: dense, tactile, and
calm enough for sustained learning. Its signature is the illuminated desktop workspace—deep navy
surfaces, contextual coral/cyan signals, and live application windows layered over the dojo
wallpaper. This document codifies the existing prototype; it does not redesign it.

## 2. Color

### Palette

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Canvas/deep | `--ink` | `#070b14` | Terminal and deepest shell surface |
| Canvas/default | root background | `#07101f` | Browser fallback and desktop field |
| Surface/translucent | `--panel` | `rgba(10, 17, 31, 0.92)` | Window and overlay material |
| Surface/solid | `--panel-solid` | `#0d1525` | Application bodies |
| Surface/soft | `--panel-soft` | `#121d31` | Controls and nested surfaces |
| Text/primary | root foreground | `#eef3ff` | Primary labels and headings |
| Text/muted | `--muted` | `#a3aec4` | Secondary copy and metadata |
| Border/default | `--line` | `rgba(255, 255, 255, 0.1)` | Layer boundaries |
| Accent/action | `--coral` | `#ff755d` | Current mission and primary action |
| Accent/mentor | `--violet` | `#9b82ff` | Mentor and laboratory state |
| Accent/system | `--blue` | `#4d8fff` | Filesystem and system affordances |
| Accent/context | `--cyan` | `#4dd8d0` | Learn Mode and keyboard focus |
| Status/success | `--success` | `#63d899` | Available, installed, completed |

### Rules

- The desktop remains warm navy rather than neutral black or generic purple SaaS.
- Accent colors communicate state or ownership; they are not decorative gradients.
- New colors must be declared here and as CSS tokens before components use them.

## 3. Typography

### Scale

| Level | Size | Weight | Line height | Usage |
| --- | --- | --- | --- | --- |
| Display | `clamp(22px, 2.2vw, 32px)` | 700 | 1.05 | Application headings |
| H2 | `22px` | 700 | 1.05 | Learn Mode context |
| H3 | `18px` | 700 | 1.1 | Mission title |
| Body | `12px` | 400–700 | 1.55 | Dense workstation copy |
| Body/sm | `10px` | 400–700 | 1.5 | App and catalog descriptions |
| Caption | `9px` | 700–850 | 1.4 | Metadata and state labels |
| Overline | `8–10px` | 800–850 | 1.3 | Uppercase section labels |
| Code | `12px` | 400 | 1.65 | Terminal output and commands |

### Font Stack

- Primary: `"Avenir Next", Avenir, "Segoe UI", ui-sans-serif, system-ui, sans-serif`
- Mono: `"SFMono-Regular", Consolas, "Liberation Mono", monospace`

### Rules

- Density is intentional, but actionable text must remain legible at the tested viewport.
- Headings may scale with `clamp()`; body text does not scale with viewport width.

## 4. Spacing & Layout

### Base Unit

Spacing follows a 4px base: `4`, `8`, `12`, `16`, `20`, `24`, and `32px`. Existing compact
desktop measurements that are not multiples of four are accepted debt and should not multiply.

### Grid

- The shell fills `100dvh` and supports a 320px minimum width.
- Desktop: 38px top bar, 64px dock, movable windows, optional 310px learning rail.
- Tablet/mobile: one useful window fills the workspace and Learn Mode becomes a stacked surface.
- Verification breakpoints: 375px, 768px, and 1280px.

## 5. Components

### Desktop Chrome

- **Structure**: top bar, shortcuts, dock, window layer, optional learning rail.
- **States**: running, focused, minimized, maximized, launcher open, Learn Mode open.
- **Accessibility**: named buttons, visible cyan focus, no color-only active state.
- **Motion**: transform/opacity for hover and overlay transitions; window dragging follows pointer input.

### Desktop Window

- **Structure**: titled window, window controls, scroll-contained application content.
- **States**: default, focused, minimized, maximized, closed.
- **Accessibility**: title remains text; controls retain accessible names and keyboard focus.

### Launcher

- **Structure**: search, category navigation, result count, application grid, maturity dot.
- **States**: default, query, filtered, empty, runnable, laboratory, planned.
- **Accessibility**: search has a visible label/name; results are buttons; empty state is explicit.

### Learning Rail

- **Structure**: canonical unit context, concepts, challenge, deterministic local mentor.
- **States**: canonical data, generated empty state, question, response, closed.
- **Boundary**: local mentor/XP interactions never write learner mastery or evidence.

### Canonical Learner Status

- **Structure**: current streak/counts in the top bar; active unit, state, project, and retry
  receipt inside Trilhas Dojo.
- **States**: presenting, practicing, evaluating, mastered, and generated zero state.
- **Accessibility**: every state is visible text; no status depends on color alone.
- **Boundary**: this is a read-only substrate projection. Local app actions cannot mutate it.

### Core Application Surface

- **Variants**: Dojo, Terminal, Files, Architecture, App Center.
- **States**: app-specific default, interactive, empty/error when relevant.
- **Accessibility**: actions use semantic controls and preserve visible focus.

### Engine Hub

- **Structure**: OS host summary, exhaustive engine selector, adapter workspace, and explicit
  learner/mastery boundary notice.
- **States**: overview, selected, embedded loading, embedded ready, URL unavailable, local action
  idle/running/pass/fail, and bridge unavailable.
- **Material**: reuse `--panel-solid`, `--panel-soft`, `--line`, and the existing functional accent
  tokens; engine cards do not introduce a new decorative color system.
- **Accessibility**: every engine is a named button, the selected engine uses visible text and
  `aria-pressed`, runtime output is announced through a status region, and embedded frames have a
  descriptive title plus visible keyboard focus.
- **Boundary**: embedded games may emit unverified evidence receipts. The Hub never calls a
  verifier, writes learner state, or presents a local bridge result as mastery.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | `150ms` | `ease` | Hover, focus, running-state feedback |
| Standard | `200ms` | `ease-in-out` | Launcher and learning-rail transitions |

- Motion must communicate focus, launch, state change, or spatial window behavior.
- Do not animate layout properties except direct pointer-driven window movement.
- `prefers-reduced-motion` must remove non-essential transitions.

## 7. Depth & Surface

Strategy: mixed tonal shift, borders, and restrained functional elevation.

- Nested navy tones establish most hierarchy.
- Fine translucent borders define window and overlay edges.
- Shadows are reserved for floating windows, the launcher, toast, and learning rail.
- Backdrop blur belongs only to translucent system chrome and overlays, not every card.

Accepted debt: the current stylesheet still contains undeclared one-off color values and compact
measurements. The integration refactor may split files and introduce semantic tokens, but visual
changes require fresh evidence and must not be bundled into behavior wiring.

## 8. Progress HUD — contrato cross-engine

Os elementos "onde estou" (streak, medidor de progresso, mastery) seguem o
contrato do HUD de progresso do ecossistema —
`docs/design/design-foundations.md` **§7** (v2.0, AID-5010; aliases
AID-5141/W5): **papéis e estados são contratuais, a paleta é engine-local**.
O OS declara os 11 tokens `--ads-*` enumerados na tabela §7.1 (o titular "10" do plano AID-5010 conta os nomes errado) em `src/styles/foundation.css`
mapeando os valores locais atuais (zero delta visual):

| Papel | Tokens (§7.1) | Mapeia hoje |
| --- | --- | --- |
| Rótulos do HUD | `--ads-progress-text` / `--ads-progress-muted` | `--school-ink` / `--school-muted` (hub-chips, progress-summary) |
| Medidor | `--ads-progress-track` / `--ads-progress-fill` | `.hub-mission-progress` `#ded8cd` / `#1f8259` (W6: fill #49c98f→#1f8259, B9b 1.48→3.37:1) |
| Streak | `--ads-streak-accent` | `--coral` (Flame do topbar do desktop chrome) |
| Mastery | `--ads-mastery-text` / `--ads-mastery-bg` | nós lavados pós-W4 `#3f4a64` / `--school-primary-soft` (7.68:1 — B9a já coberto) |
| Revisão devida | `--ads-review-text` / `--ads-review-bg` | "próximo passo": `--school-primary-dark` / `--school-primary-soft` |
| Atrasada | `--ads-attention-text` / `--ads-attention-bg` | nós in-progress/evidence-pending: `--school-muted` / `#fff6df` |

**FSRS/revisões ficam fora do escopo do OS por design** (§7.4 do contrato:
experiência read-only; a ausência é documentada, não tratada como dívida) —
os pares review/attention mapeiam os estados locais mais próximos apenas
para satisfazer a existência+mapping do contrato. Tier de acessibilidade do
HUD: **B9** (§7/§4 — AAA 7:1 texto, 3:1 não-texto; B2 AA continua o piso
geral). Anatomia canônica de 4 papéis, testids
`hud-streak`/`hud-progress`/`hud-mastery-badge`/`hud-review-due` e
responsividade 375/768/1280 chegam na W7 (AID-5010) — até lá os tokens são
declaração+mapping, sem consumidores. **AID-5177/W6 — retune AAA aplicado**
(contrato §4 B9a): `--school-muted` #657089→#3f4a64 (8.05:1 sobre
`--school-paper`, 8.84:1 sobre branco) e `--muted` dark #8f9bb0→#a3aec4
(8.17:1 sobre `--panel-solid`) — os marcadores `@deprecated → --ads-* (B9)`
destes pares foram removidos (janela fechada na W6) e o override local W4
dos nós lavados (journey.css) saiu: os nós lavados herdam
`var(--journey-muted)` = `var(--school-muted)` = `#3f4a64` (7.68:1 no wash,
mesmo valor computado). Evidência: `tests/a11y-w6.smoke.spec.ts` +
`playwright.aid5177.config.ts` (getComputedStyle; 0 falhas B9a/B9b/B2).
