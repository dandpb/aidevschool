## 2024-07-04 - Unsafe Template Interpolation
**Vulnerability:** The Single Page Application (SPA) dashboard used direct innerHTML assignment with string templates, allowing unescaped data from projects.ts to be rendered directly as HTML. This introduces a Cross-Site Scripting (XSS) risk if the data ever becomes user-controlled or dynamically fetched.
**Learning:** In vanilla TypeScript applications that rely on string template literals for rendering, there is no automatic context-aware escaping (unlike React or Vue). Every dynamic variable insertion into innerHTML is a potential XSS vector.
**Prevention:** Always implement and enforce a mandatory `escapeHtml` utility function around any dynamic data variables when constructing HTML string templates, treating all external data as untrusted by default.

## 2024-07-04 - Unsafe Template Interpolation on Numeric Fields
**Vulnerability:** XSS vulnerability found in `engines/codexDojo/src/render/roadmap.ts` where `project.level` was directly interpolated without escaping.
**Learning:** Even fields that are conceptually numeric (like `level`) can become XSS vectors if the underlying type is not strictly validated or if the system is fed malicious non-numeric strings masquerading as numbers from external data sources.
**Prevention:** Apply `escapeHtml` consistently to ALL dynamic fields rendered via innerHTML templates, regardless of their expected data type.

## 2024-07-04 - Unsafe Template Interpolation on Numeric Properties and Formatting
**Vulnerability:** XSS vulnerability found in `engines/codexDojo/src/render/learner.ts` and `engines/codexDojo/src/render/overview.ts` where numeric-like fields (such as `stats.completionPercent` or values passed to `.toFixed()`) were interpolated into HTML string templates without escaping or strict type validation.
**Learning:** External data acting as numbers can easily be manipulated into strings containing XSS payloads. When attempting to use `.toFixed()` on these injected strings, the application crashes, allowing XSS if rendered unvalidated or causing a Denial of Service (DoS) during runtime string templating.
**Prevention:** Apply `escapeHtml` to all dynamic fields in innerHTML rendering. For numeric values formatted with `.toFixed()`, always perform a runtime type check (e.g., `typeof value === 'number' ? value.toFixed(2) : escapeHtml(value)`) to prevent runtime crashes when external untrusted data acts as a string payload instead of a number.
