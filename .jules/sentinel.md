## 2026-08-14 - Prevent XSS in dojoToday innerHTML Render Path
**Vulnerability:** Untrusted string interpolation directly into `innerHTML` without escaping in `engines/dojoToday/src/main.ts`.
**Learning:** The dojoToday MVP uses vanilla JS template strings for UI rendering, unlike the main engine which uses incremental DOM or React. This makes it uniquely susceptible to XSS if the TodaySnapshot data contains malicious payload.
**Prevention:** Coerce and escape all interpolated text strings using a custom `escapeHtml` utility whenever updating `innerHTML`.
