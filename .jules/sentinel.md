## 2026-08-09 - Unsafe innerHTML in dojoToday
**Vulnerability:** Found unsanitized dynamic fields interpolated directly into `innerHTML` in `engines/dojoToday/src/main.ts` rendering pipelines.
**Learning:** In purely vanilla setups (no framework like React to auto-escape), concatenating strings directly into `innerHTML` introduces a systemic XSS vulnerability for any non-hardcoded strings, including data payloads parsed from JSON or APIs.
**Prevention:** In vanilla projects, all dynamic text interpolation targeting `innerHTML` must be proactively wrapped in a custom HTML entity encoder (like an `escapeHtml` utility).
