## 2024-05-24 - Progress Bar Accessibility
**Learning:** Adding standard ARIA properties (`role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`) to custom progress bars ensures screen readers can announce the current progress to users, instead of just reading "Progresso do ciclo".
**Action:** When creating custom meter or progress bar components using basic divs and spans, always include appropriate ARIA roles and value attributes.

## 2024-05-24 - Active Navigation Item Accessibility
**Learning:** Using `aria-current="page"` on the active item in a navigation list provides crucial context to screen reader users about where they currently are within the application. Visual cues like an 'is-active' class are not enough.
**Action:** Always add `aria-current="page"` to the active link or button in navigation menus.
