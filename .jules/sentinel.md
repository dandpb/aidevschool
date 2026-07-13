## 2024-07-04 - Unsafe Template Interpolation
**Vulnerability:** The Single Page Application (SPA) dashboard used direct innerHTML assignment with string templates, allowing unescaped data from projects.ts to be rendered directly as HTML. This introduces a Cross-Site Scripting (XSS) risk if the data ever becomes user-controlled or dynamically fetched.
**Learning:** In vanilla TypeScript applications that rely on string template literals for rendering, there is no automatic context-aware escaping (unlike React or Vue). Every dynamic variable insertion into innerHTML is a potential XSS vector.
**Prevention:** Always implement and enforce a mandatory `escapeHtml` utility function around any dynamic data variables when constructing HTML string templates, treating all external data as untrusted by default.

## 2024-07-04 - Unsafe Template Interpolation on Numeric Fields
**Vulnerability:** XSS vulnerability found in `engines/codexDojo/src/render/roadmap.ts` where `project.level` was directly interpolated without escaping.
**Learning:** Even fields that are conceptually numeric (like `level`) can become XSS vectors if the underlying type is not strictly validated or if the system is fed malicious non-numeric strings masquerading as numbers from external data sources.
**Prevention:** Apply `escapeHtml` consistently to ALL dynamic fields rendered via innerHTML templates, regardless of their expected data type.
## 2026-07-13 - [Numeric Fields XSS Vulnerability]
**Vulnerability:** XSS via unescaped numeric fields interpolated directly into `innerHTML` (e.g. `completionPercent`, `retryCount`, `aidi.current`).
**Learning:** Even fields structurally typed as `number` in TypeScript can contain malicious XSS strings if their underlying source (like JSON or YAML) is unvalidated at runtime.
**Prevention:** Every dynamic value inserted into `innerHTML` must be run through `escapeHtml()`, and when calling numeric methods like `.toFixed()`, a runtime `typeof value === 'number'` check must be performed to gracefully fallback to returning the escaped payload instead of causing a crash.
