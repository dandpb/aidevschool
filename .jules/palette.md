## 2024-07-22 - Explicit ARIA Announcements for Visual States
**Learning:** Purely visual states in custom interactive UI elements (such as `.is-complete` classes on timeline step nodes) are invisible to screen readers, causing a loss of context.
**Action:** When a UI element uses visual classes for state that cannot be represented by standard HTML attributes (like `disabled` or `checked`), explicitly compute a dynamic string containing the index, name, and current status, and apply it via `aria-label`. Ensure inner visual text is hidden with `aria-hidden="true"` to prevent redundant reading.
