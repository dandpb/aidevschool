## 2024-07-04 - Unsafe Template Interpolation
**Vulnerability:** The Single Page Application (SPA) dashboard used direct innerHTML assignment with string templates, allowing unescaped data from projects.ts to be rendered directly as HTML. This introduces a Cross-Site Scripting (XSS) risk if the data ever becomes user-controlled or dynamically fetched.
**Learning:** In vanilla TypeScript applications that rely on string template literals for rendering, there is no automatic context-aware escaping (unlike React or Vue). Every dynamic variable insertion into innerHTML is a potential XSS vector.
**Prevention:** Always implement and enforce a mandatory `escapeHtml` utility function around any dynamic data variables when constructing HTML string templates, treating all external data as untrusted by default.

## 2024-07-04 - Unsafe Template Interpolation on Numeric Fields
**Vulnerability:** XSS vulnerability found in `engines/codexDojo/src/render/roadmap.ts` where `project.level` was directly interpolated without escaping.
**Learning:** Even fields that are conceptually numeric (like `level`) can become XSS vectors if the underlying type is not strictly validated or if the system is fed malicious non-numeric strings masquerading as numbers from external data sources.
**Prevention:** Apply `escapeHtml` consistently to ALL dynamic fields rendered via innerHTML templates, regardless of their expected data type.

## 2026-07-15 - Unescaped Numeric and Conceptual Fields in codexDojo Rendering
**Vulnerability:** Found unescaped values injected directly into HTML within the `renderLearnerDashboard` logic (`engines/codexDojo/src/render/learner.ts`). While the fields conceptually represented numbers or counts (e.g., `snapshot.activeUnit.retryCount`, `snapshot.aidi.current`), they were inserted directly into the template string.
**Learning:** Even fields structurally typed as numbers must be properly escaped before HTML interpolation. A threat actor who manages to corrupt the backend state (via insecure deserialization or bypassing validation) could inject an XSS string payload instead of a number. Furthermore, numeric methods like `.toFixed(2)` or `.repeat()` would throw runtime TypeErrors when operating on injected strings, causing a Denial of Service (rendering crash) alongside the XSS vector. Testing these edge cases requires mocking the application state in XSS test suites using string casts (`as any`) for numeric fields. Finally, new rendering modules can easily slip past XSS test coverage if the regression suite relies on manually maintaining a list of modules to verify (e.g., the `renderers` array in `escapeCoverage.test.ts`).
**Prevention:**
1.  **Always type-check and fallback:** Before invoking methods like `.toFixed()` on dynamic data, explicitly check the type (`typeof val === "number"`). If the type does not match, treat the data as untrusted and pass it through the escaping utility function.
2.  **Escape everything:** All dynamic interpolations in HTML templates must be wrapped in `escapeHtml`, even if the expected value is an integer count.
3.  **Comprehensive Coverage:** Whenever adding a new view/rendering module (like `renderLearnerDashboard`), explicitly ensure it is registered in the regression coverage suite (`escapeCoverage.test.ts`) so XSS payloads are systematically injected into all of its data seams.
