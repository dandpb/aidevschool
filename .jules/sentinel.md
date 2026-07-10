## 2024-07-04 - Unsafe Template Interpolation
**Vulnerability:** The Single Page Application (SPA) dashboard used direct innerHTML assignment with string templates, allowing unescaped data from projects.ts to be rendered directly as HTML. This introduces a Cross-Site Scripting (XSS) risk if the data ever becomes user-controlled or dynamically fetched.
**Learning:** In vanilla TypeScript applications that rely on string template literals for rendering, there is no automatic context-aware escaping (unlike React or Vue). Every dynamic variable insertion into innerHTML is a potential XSS vector.
**Prevention:** Always implement and enforce a mandatory `escapeHtml` utility function around any dynamic data variables when constructing HTML string templates, treating all external data as untrusted by default.

## 2024-07-04 - Unsafe Template Interpolation on Numeric Fields
**Vulnerability:** XSS vulnerability found in `engines/codexDojo/src/render/roadmap.ts` where `project.level` was directly interpolated without escaping.
**Learning:** Even fields that are conceptually numeric (like `level`) can become XSS vectors if the underlying type is not strictly validated or if the system is fed malicious non-numeric strings masquerading as numbers from external data sources.
**Prevention:** Apply `escapeHtml` consistently to ALL dynamic fields rendered via innerHTML templates, regardless of their expected data type.
## 2024-07-10 - Unsafe Numeric Interpolation
**Vulnerability:** XSS risk via unescaped numeric and typed fields in innerHTML templates.
**Learning:** Even statically typed numeric or enum fields must be escaped because runtime data (like API responses) can bypass TypeScript checks and inject malicious strings.
**Prevention:** Apply `escapeHtml` to ALL dynamic fields rendered via innerHTML, and update escape coverage tests to mock string payloads into numerical fields using `as any` to verify defenses.
