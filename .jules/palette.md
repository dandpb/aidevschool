## 2024-11-20 - Communicating Visual Timelines and Graph Nodes to Screen Readers
**Learning:** Purely visual states in custom interactive UI elements, such as `.is-complete` on timeline step buttons or spatial position in a visual node graph (like the agent topology map), are opaque to screen readers. If these elements represent steps or specific entities, their full context—including their dynamic status—must be explicitly announced via `aria-label`.
**Action:** When styling custom UI elements where state is conveyed purely via CSS classes or layout position, compute a dynamic string containing the index, name, and current status, and apply it via `aria-label`. Ensure this is updated synchronously with the visual state changes.

## 2025-02-19 - Disconnected visual states and semantics in dynamic UI

**Learning:** When using custom interactive UI elements, purely visual indicators (such as spatial positions like node-1, node-2, or CSS `.is-complete` classes) must be explicitly announced to screen readers. Relying solely on inner HTML text without descriptive semantic mappings causes screen readers to misread the context (like skipping state or reading elements out of logical order). For accessibility in codexDojo, purely visual states in custom interactive UI elements (such as `.is-complete` classes or spatial node positions) must be explicitly announced by computing a dynamic string containing the index, name, and current status, and applying it via `aria-label`.

**Action:** Before rendering lists, sequences, or spatial maps of buttons, proactively compute an explicit `aria-label` merging the visual layout details (index, state, name, or owner) and apply `aria-hidden="true"` to inner spans to prevent redundant stuttering and noise.

## 2024-07-22 - Explicit ARIA Announcements for Visual States
**Learning:** Purely visual states in custom interactive UI elements (such as `.is-complete` classes on timeline step nodes) are invisible to screen readers, causing a loss of context.
**Action:** When a UI element uses visual classes for state that cannot be represented by standard HTML attributes (like `disabled` or `checked`), explicitly compute a dynamic string containing the index, name, and current status, and apply it via `aria-label`. Ensure inner visual text is hidden with `aria-hidden="true"` to prevent redundant reading.

## 2024-07-23 - Announcing Visual State in codexDojo
**Learning:** In codexDojo's custom interactive UI elements, purely visual states like `.is-complete` classes or spatial node positions (e.g. `.agent-node` map locations) are not announced by default, leading to accessibility gaps.
**Action:** Explicitly pair these visual states with semantic announcements by computing a dynamic string containing the index, name, and current status, applying it via `aria-label`, and hiding the redundant inner textual labels with `aria-hidden="true"`.
## 2026-08-04 - Skip to content accessibility
**Learning:** When implementing a skip-to-content link, the target container must have `tabindex="-1"` so it can programmatically receive focus, and we must remove the default focus outline to maintain visual polish without sacrificing accessibility.
**Action:** Always pair `<a href="#content">` with `id="content" tabindex="-1"` and `:focus { outline: none; }` on the target.
