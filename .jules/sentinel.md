## 2024-07-04 - Unsafe Template Interpolation
**Vulnerability:** The Single Page Application (SPA) dashboard used direct innerHTML assignment with string templates, allowing unescaped data from projects.ts to be rendered directly as HTML. This introduces a Cross-Site Scripting (XSS) risk if the data ever becomes user-controlled or dynamically fetched.
**Learning:** In vanilla TypeScript applications that rely on string template literals for rendering, there is no automatic context-aware escaping (unlike React or Vue). Every dynamic variable insertion into innerHTML is a potential XSS vector.
**Prevention:** Always implement and enforce a mandatory `escapeHtml` utility function around any dynamic data variables when constructing HTML string templates, treating all external data as untrusted by default.

## 2024-07-04 - Unsafe Template Interpolation on Numeric Fields
**Vulnerability:** XSS vulnerability found in `engines/codexDojo/src/render/roadmap.ts` where `project.level` was directly interpolated without escaping.
**Learning:** Even fields that are conceptually numeric (like `level`) can become XSS vectors if the underlying type is not strictly validated or if the system is fed malicious non-numeric strings masquerading as numbers from external data sources.
**Prevention:** Apply `escapeHtml` consistently to ALL dynamic fields rendered via innerHTML templates, regardless of their expected data type.

## 2024-07-04 - Type Coercion Exploits in Unvalidated Numeric Formats
**Vulnerability:** XSS vulnerability found in `engines/codexDojo/src/render/learner.ts` and `overview.ts` where dynamically retrieved numeric data (including floats using `.toFixed()`) was directly interpolated into innerHTML.
**Learning:** When string templates handle numbers formatted via `.toFixed()`, directly wrapping them in `escapeHtml` causes runtime crashes during automated XSS payload testing because strings don't have `.toFixed()`. This forces developers to skip escaping or write complex ternary logic, leading to unescaped seams.
**Prevention:** When escaping numeric fields that require formatting, always use type guarding (e.g., `typeof value === 'number' ? value.toFixed(2) : escapeHtml(value)`) to ensure both safe runtime execution during payload testing and robust XSS protection.
