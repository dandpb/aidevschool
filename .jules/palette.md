## 2024-07-05 - Static ARIA labels breaking dynamic button text states
**Learning:** Adding a static `aria-label` to a button (e.g., `aria-label="Copiar prompt"`) overrides its inner text for screen readers. When the button changes state dynamically (like changing text to "Copiado"), the screen reader still announces the static label and ignores the state change.
**Action:** For buttons with dynamic text that announces state changes, avoid static `aria-label`s. Instead, use `aria-live="polite"` on the button (or a dedicated status region) to ensure screen readers announce the updated inner text when the state changes.

## 2024-07-03 - Added aria-current="page" to active navigation buttons
**Learning:** Found that the main navigation component correctly handled visual active states via `is-active` class, but missed the semantic `aria-current="page"` attribute for screen readers. This is a common pattern in vanilla JS/TS template literal rendering.
**Action:** When implementing custom active state styling logic via classes, always pair it with the appropriate `aria-current` or `aria-selected` semantic attribute to ensure parity between visual and assistive experiences.
