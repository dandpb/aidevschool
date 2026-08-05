
## 2026-07-26 - Unescaped Numeric Fields XSS
**Vulnerability:** Conceptually numeric fields (`aidi.current`, `curr`, etc.) mapped through `.toFixed()` in HTML templates were passing external data unescaped because it was assumed they were always valid numbers.
**Learning:** If external data is cast or typed implicitly, an attacker or malformed data source can inject a string payload (e.g. `<script>...`) into a numeric field. If we don't handle this, it either crashes `.toFixed()` or bypasses XSS protection completely.
**Prevention:** When formatting numeric fields with methods like `.toFixed()` in rendering logic (like string templates), use a type check (e.g. `typeof val === 'number' ? val.toFixed(2) : escapeHtml(val)`) to ensure malicious strings are safely escaped.
