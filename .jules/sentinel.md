# Sentinel — security learnings

## 2026-08-14 - Prevent XSS in dojoToday innerHTML Render Path
**Vulnerability:** Untrusted string interpolation directly into `innerHTML` without escaping in `engines/dojoToday/src/main.ts`.
**Learning:** The dojoToday MVP uses vanilla JS template strings for UI rendering, unlike engines that use React. This makes it uniquely susceptible to XSS if the TodaySnapshot data contains a malicious payload.
**Prevention:** Coerce and escape all interpolated text strings using the shared `escapeHtml` utility (`engines/dojoToday/src/escape.ts`) whenever updating `innerHTML`.

## 2026-08-14 - Escape conceptually numeric fields too
**Vulnerability:** XSS in codexDojo learner numeric fields (AIDI, CURR) via `.toFixed()` on non-number values.
**Learning:** Fields that are "conceptually numeric" can still carry untrusted strings if external data is corrupted; `.toFixed()` throws or templates the raw string.
**Prevention:** Guard with `typeof value === "number"` before `.toFixed()`, and fall back to `escapeHtml(value)` otherwise. `rel="noopener noreferrer"` on every `target="_blank"` link.

## 2024-05-20 - Enforce HTTPS on BYOK Endpoints
**Vulnerability:** User-configured AI base URLs (Bring-Your-Own-Key) allowed arbitrary HTTP connections.
**Learning:** This exposes sensitive API keys (like OpenAI keys) in plaintext over unencrypted connections if a user configures a malicious or non-HTTPS endpoint (excluding local development like localhost).
**Prevention:** Always validate user-provided URLs for sensitive integrations, enforcing the `https:` protocol (with exceptions for `localhost` and `127.0.0.1` during local dev).
