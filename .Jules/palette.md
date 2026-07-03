## 2024-07-03 - Added aria-current="page" to active navigation buttons
**Learning:** Found that the main navigation component correctly handled visual active states via `is-active` class, but missed the semantic `aria-current="page"` attribute for screen readers. This is a common pattern in vanilla JS/TS template literal rendering.
**Action:** When implementing custom active state styling logic via classes, always pair it with the appropriate `aria-current` or `aria-selected` semantic attribute to ensure parity between visual and assistive experiences.
