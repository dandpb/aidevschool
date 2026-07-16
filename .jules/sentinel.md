## 2024-07-04 - Unsafe Template Interpolation
**Vulnerability:** The Single Page Application (SPA) dashboard used direct innerHTML assignment with string templates, allowing unescaped data from projects.ts to be rendered directly as HTML. This introduces a Cross-Site Scripting (XSS) risk if the data ever becomes user-controlled or dynamically fetched.
**Learning:** In vanilla TypeScript applications that rely on string template literals for rendering, there is no automatic context-aware escaping (unlike React or Vue). Every dynamic variable insertion into innerHTML is a potential XSS vector.
**Prevention:** Always implement and enforce a mandatory `escapeHtml` utility function around any dynamic data variables when constructing HTML string templates, treating all external data as untrusted by default.

## 2024-07-04 - Unsafe Template Interpolation on Numeric Fields
**Vulnerability:** XSS vulnerability found in `engines/codexDojo/src/render/roadmap.ts` where `project.level` was directly interpolated without escaping.
**Learning:** Even fields that are conceptually numeric (like `level`) can become XSS vectors if the underlying type is not strictly validated or if the system is fed malicious non-numeric strings masquerading as numbers from external data sources.
**Prevention:** Apply `escapeHtml` consistently to ALL dynamic fields rendered via innerHTML templates, regardless of their expected data type.

## 2024-07-16 - Safe Escape of Numeric Formats
**Vulnerability:** XSS vulnerability found in `engines/codexDojo/src/render/learner.ts` where numeric/enum fields like `aidi.current` and `snapshot.activeUnit.state` were directly interpolated without escaping. Escaping numeric functions like `.toFixed()` would cause a runtime crash on string payloads.
**Learning:** When escaping numeric fields that use operations like `.toFixed()`, a type check is required to ensure that testing XSS string payloads does not cause runtime crashes (`TypeError: aidi.current.toFixed is not a function`).
**Prevention:** Apply a type-check wrapper when escaping numeric variables formatted with methods (e.g., `typeof value === "number" ? value.toFixed(2) : escapeHtml(value)`).
