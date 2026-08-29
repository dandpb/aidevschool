# Sentinel — security learnings

## 2026-08-14 - Prevent XSS in dojoToday innerHTML Render Path
**Vulnerability:** Untrusted string interpolation directly into `innerHTML` without escaping in `engines/dojoToday/src/main.ts`.
**Learning:** The dojoToday MVP uses vanilla JS template strings for UI rendering, unlike engines that use React. This makes it uniquely susceptible to XSS if the TodaySnapshot data contains a malicious payload.
**Prevention:** Coerce and escape all interpolated text strings using the shared `escapeHtml` utility (`engines/dojoToday/src/escape.ts`) whenever updating `innerHTML`.

## 2026-08-14 - Escape conceptually numeric fields too
**Vulnerability:** XSS in codexDojo learner numeric fields (AIDI, CURR) via `.toFixed()` on non-number values.
**Learning:** Fields that are "conceptually numeric" can still carry untrusted strings if external data is corrupted; `.toFixed()` throws or templates the raw string.
**Prevention:** Guard with `typeof value === "number"` before `.toFixed()`, and fall back to `escapeHtml(value)` otherwise. `rel="noopener noreferrer"` on every `target="_blank"` link.

## 2026-08-29 - Prevent API Key Exposure in BYOK Config
**Vulnerability:** The AI assistant configuration allowed arbitrary HTTP URLs, which could expose user API keys over unencrypted connections if configured maliciously or incorrectly.
**Learning:** In BYOK (Bring Your Own Key) architectures, user-provided endpoint URLs must be strictly validated. While `localhost` is safe for local models, external endpoints must enforce HTTPS to prevent interception of the Bearer token.
**Prevention:** Always validate and coerce custom endpoint URLs to HTTPS, exempting only `localhost` and `127.0.0.1`.
