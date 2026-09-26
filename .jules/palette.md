## 2025-03-09 - Accessible external links

**Learning:** When using target="_blank" for external links, wrapping the text in a native `<span>` along with an explicit `sr-only` span containing context like "(abre em nova aba)" avoids the problem of `aria-label` overriding inner content completely, and prevents screen readers from losing the tab-opening context.
**Action:** Remove `aria-label` entirely and use structural, visually hidden `.sr-only` context for external links to meet both native accessibility APIs and linter (`a11y/useAnchorContent`) requirements.
