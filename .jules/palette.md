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

## 2026-09-15 - Explicit ARIA Context for Navigation and Filters
**Learning:** In codexDojo, main navigation sections and filter buttons use generic text like 'Painel' or 'Todos'. These terms lack semantic context when announced by screen readers out of the visual flow, leading to confusion.
**Action:** When creating navigation links or filtering buttons with generic names, compute a fully contextual `aria-label` (e.g., 'Ir para Painel' or 'Filtrar por Todos'), provide a matching `title` tooltip, and wrap the visible inner text in `<span aria-hidden="true">`. Update corresponding test assertions that strictly assert the old string format.
## 2026-09-26 - Accessible Toggles
**Learning:** Buttons that toggle visibility of an element (like an iframe wrap) should use aria-expanded and aria-controls to properly announce their state to screen readers.
**Action:** Ensure all custom toggles use these ARIA attributes rather than relying solely on visual text changes (like ▶ to ▽).
## 2025-02-19 - Using .sr-only for links opening in new tabs
**Learning:** When warning screen reader users about a context switch for external links (`target="_blank"`), replacing the link content with `aria-hidden` and applying `aria-label` to the parent anchor triggers Biome's `a11y/useAnchorContent` linter error (because the anchor conceptually loses its text content).
**Action:** The preferred robust approach is to natively append a screen-reader-only span inside the anchor (e.g., `<span class="sr-only">(abre em nova aba)</span>`) alongside the visible text, leaving standard attributes alone. This satisfies linters, translation tools, and screen readers simultaneously.

## 2024-05-18 - Announcing Emoji-Based Visual Indicators
**Learning:** Emojis used purely as visual indicators (like ❄️ for freezes or 🔥 for streaks) create highly repetitive and noisy announcements for screen readers (e.g. 'floco de neve floco de neve').
**Action:** Wrap the emoji sequences in an `aria-hidden="true"` span to silence them, and provide a clear, semantic sentence summarizing their meaning in an adjacent `.sr-only` span.
## 2026-10-13 - Emojis in Togglable Buttons without Custom CSS
**Learning:** In environments lacking .sr-only classes, visual symbols in buttons must be wrapped in <span aria-hidden="true"> while the button needs an explicit aria-label. For dynamic buttons, innerHTML must be used instead of textContent to preserve the span.
**Action:** Use innerHTML for dynamic text updates involving emojis and hide emojis via aria-hidden alongside parent aria-labels.
## 2025-02-14 - Dynamic togglable UI buttons accessibility in dojoToday
**Learning:** When dynamically updating togglable UI buttons containing visual symbols (like emojis or Unicode arrows) in environments lacking `.sr-only` classes, modifying just `textContent` destroys the `aria-hidden` wrapper around the symbol. The symbol must be wrapped in `<span aria-hidden="true">` to prevent noisy or incorrect announcements by screen readers.
**Action:** Use `innerHTML` instead of `textContent` to safely replace the button text while preserving the `<span aria-hidden="true">` wrapper around the visual symbol, and simultaneously update the parent element's `aria-label` to match the new state.
## 2026-10-01 - Accessible Emojis using sr-only
**Learning:** For accessibility in UI elements containing emojis (e.g., in codexDojo), avoid applying `role="text"` and `aria-label` to the container, as they are often ignored or cause noisy announcements.
**Action:** Instead, wrap the descriptive text in a visually hidden `<span class="sr-only">` and hide the emoji itself with a `<span aria-hidden="true">`. Ensure you don't use `aria-label` on the container.
## 2026-10-21 - Empty State Guidance
**Learning:** Clicking a submit button without providing input and receiving no feedback leaves the user wondering if the system is broken or waiting.
**Action:** When a user triggers an action that requires input but none is provided, explicitly communicate the missing requirement using the existing error feedback patterns (e.g., `setReply` with an error state) and return focus to the input field so they can correct the issue immediately.
## 2026-10-23 - Explicit `for` attributes in implicit labels\n**Learning:** While wrapping an `<input>` inside a `<label>` (implicit labeling) is valid HTML and implicitly associates them, explicitly providing the `for` attribute is a robust accessibility best practice that ensures better support across a wider range of screen readers and assistive technologies.\n**Action:** In vanilla JS HTML string templates (e.g., `dojoToday`), use explicit `for` attributes on `<label>` elements matching the corresponding `<input>`'s `id`, rather than relying solely on implicit nesting, to ensure robust screen reader support and click-to-focus behavior.
## 2026-10-25 - Form Element Semantics for Implicit Submission
**Learning:** In configuration panels containing text inputs, using generic `<div>` wrappers and button click listeners prevents users from using native keyboard shortcuts like pressing `Enter` to submit the form. Custom keydown listeners are brittle and often miss edge cases.
**Action:** Wrap input groups in semantic `<form>` elements and change the primary action button to `type="submit"`. Update JavaScript to listen to the `submit` event (with `e.preventDefault()`) on the form itself. This natively supports implicit submission via `Enter` and provides a superior, standard keyboard experience.

## 2026-10-25 - Context-Aware Input Attributes
**Learning:** Inputs accepting system strings like API keys (`sk-...`) or model names (`gpt-4o-mini`) trigger noisy red squiggles from native browser spellcheckers, degrading visual polish. Additionally, generic text inputs for URLs fail to trigger the optimized virtual keyboard layout (with `.com` and `/` keys) on mobile devices.
**Action:** Always apply `spellcheck="false"` to inputs that accept API keys, model names, or system IDs. For URL inputs, explicitly set `type="url"` and `autocomplete="url"` to ensure optimal virtual keyboard invocation and browser autocomplete behavior.
## 2026-10-25 - Resubmitting with fresh branch to update PR body
**Learning:** When resubmitting PRs to resolve `countersign-gate` failures (such as missing `Provenance:` trailers), the `submit` tool does not update the body description of an existing PR. Pass a fresh branch name to `submit` so a new PR is opened with the updated description containing the `Provenance:` trailer.
**Action:** Always use a fresh branch name when calling `submit` to fix missing `Provenance:` trailers.
