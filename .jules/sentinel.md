## 2026-08-11 - Prevent XSS in DojoToday HTML interpolations
**Vulnerability:** String interpolations assigning dynamic unescaped values directly to innerHTML in DojoToday main.ts.
**Learning:** The frontend engine was concatenating untrusted or dynamic state snapshot fields into vanilla HTML template literals without sanitization before assigning to innerHTML.
**Prevention:** Create and consistently apply an `escapeHtml` utility to all dynamic interpolations before assigning to innerHTML.
