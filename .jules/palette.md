## 2024-07-23 - Announcing Visual State in codexDojo
**Learning:** In codexDojo's custom interactive UI elements, purely visual states like `.is-complete` classes or spatial node positions (e.g. `.agent-node` map locations) are not announced by default, leading to accessibility gaps.
**Action:** Explicitly pair these visual states with semantic announcements by computing a dynamic string containing the index, name, and current status, applying it via `aria-label`, and hiding the redundant inner textual labels with `aria-hidden="true"`.
