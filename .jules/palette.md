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

## 2024-11-20 - Ensure Selection State Readability with ARIA Attributes
**Learning:** Visual-only selection indicators (like `.is-active` CSS classes) hide the current state from screen reader users. This creates a confusing experience where users can interact with elements but cannot perceive the result of their actions.
**Action:** When creating custom interactive elements (like filter buttons, timeline steps, or list items), always pair the visual active class with the semantic ARIA attribute (e.g., `aria-pressed="true|false"` for toggles, `aria-current="step|true"` for current items).
