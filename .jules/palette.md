## 2024-07-05 - Static ARIA labels breaking dynamic button text states
**Learning:** Adding a static `aria-label` to a button (e.g., `aria-label="Copiar prompt"`) overrides its inner text for screen readers. When the button changes state dynamically (like changing text to "Copiado"), the screen reader still announces the static label and ignores the state change.
**Action:** For buttons with dynamic text that announces state changes, avoid static `aria-label`s. Instead, use `aria-live="polite"` on the button (or a dedicated status region) to ensure screen readers announce the updated inner text when the state changes.

## 2024-07-03 - Added aria-current="page" to active navigation buttons
**Learning:** Found that the main navigation component correctly handled visual active states via `is-active` class, but missed the semantic `aria-current="page"` attribute for screen readers. This is a common pattern in vanilla JS/TS template literal rendering.
**Action:** When implementing custom active state styling logic via classes, always pair it with the appropriate `aria-current` or `aria-selected` semantic attribute to ensure parity between visual and assistive experiences.

## 2024-05-24 - Progress Bar Accessibility
**Learning:** Adding standard ARIA properties (`role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`) to custom progress bars ensures screen readers can announce the current progress to users, instead of just reading "Progresso do ciclo".
**Action:** When creating custom meter or progress bar components using basic divs and spans, always include appropriate ARIA roles and value attributes.

## 2024-05-24 - Active Navigation Item Accessibility
**Learning:** Using `aria-current="page"` on the active item in a navigation list provides crucial context to screen reader users about where they currently are within the application. Visual cues like an 'is-active' class are not enough.
**Action:** Always add `aria-current="page"` to the active link or button in navigation menus.
## 2025-07-08 - Accessible Active States in Vanilla Templates
**Learning:** The codexDojo dashboard uses vanilla TypeScript string templates for rendering and relies on `.is-active` CSS classes for visual state. However, interactive elements (like tabs, filters, and list items) often lacked corresponding ARIA attributes for screen readers.
**Action:** Always pair visual active state classes like `.is-active` with appropriate semantic attributes, such as `aria-pressed="true"` for toggle buttons or `aria-current="step"/"page"` for navigational/sequential elements in raw HTML strings.

## 2025-02-23 - Pairing visual active states with ARIA attributes
**Learning:** Found multiple places where visual active states (`.is-active`) were implemented using classes without semantic ARIA attributes (e.g. `aria-current="step"`, `aria-current="true"`, or `aria-pressed="true"`) to communicate this state to screen readers. This pattern existed in roadmap filters, cycle timeline steps, linux lab apps/categories, and agent lists.
**Action:** Always explicitly pair visual active classes on custom interactive elements (buttons acting as tabs/filters/steps) with semantic ARIA attributes (`aria-current` or `aria-pressed`) so that the active state is announced accurately.

## 2025-02-23 - Unique ARIA labels for repeated grid/list buttons
**Learning:** Found repeated action buttons (like "Abrir briefing" or "Read More") inside mapped grids/lists that lacked context for screen readers. When a screen reader reads "Abrir briefing" repeatedly without context, it's confusing and inaccessible.
**Action:** Always add a descriptive `aria-label` to repeated action buttons that includes the item's specific context (e.g., `aria-label="Abrir briefing: ${escapeHtml(project.title)}"`), disambiguating the action for screen reader users while keeping the visual label clean.
