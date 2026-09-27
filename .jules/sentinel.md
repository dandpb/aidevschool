# Sentinel — security learnings

## 2026-08-14 - Prevent XSS in dojoToday innerHTML Render Path
**Vulnerability:** Untrusted string interpolation directly into `innerHTML` without escaping in `engines/dojoToday/src/main.ts`.
**Learning:** The dojoToday MVP uses vanilla JS template strings for UI rendering, unlike engines that use React. This makes it uniquely susceptible to XSS if the TodaySnapshot data contains a malicious payload.
**Prevention:** Coerce and escape all interpolated text strings using the shared `escapeHtml` utility (`engines/dojoToday/src/escape.ts`) whenever updating `innerHTML`.

## 2026-08-14 - Escape conceptually numeric fields too
**Vulnerability:** XSS in codexDojo learner numeric fields (AIDI, CURR) via `.toFixed()` on non-number values.
**Learning:** Fields that are "conceptually numeric" can still carry untrusted strings if external data is corrupted; `.toFixed()` throws or templates the raw string.
**Prevention:** Guard with `typeof value === "number"` before `.toFixed()`, and fall back to `escapeHtml(value)` otherwise. `rel="noopener noreferrer"` on every `target="_blank"` link.

## 2026-08-31 - Prevent API Key exposure in BYOK Assistant Endpoint
**Vulnerability:** A learner configuring a custom "Bring Your Own Key" (BYOK) AI endpoint in `dojoToday` could unknowingly input an HTTP (unencrypted) base URL, causing their API key to be transmitted over plaintext on the local network.
**Learning:** Even though the AI feature runs entirely locally and the keys are stored in `localStorage`, network requests using `fetch` must still be secured to prevent interception, as user-configured endpoints may not enforce HTTPS on their own.
**Prevention:** In Bring-Your-Own-Key (BYOK) configurations, strictly validate the user-provided base URL to enforce the `https:` protocol (exempting `localhost` and `127.0.0.1` for local development endpoints) before making any outbound API requests.
## 2026-09-13 - Prevent Reverse Tabnabbing
**Vulnerability:** External links opening in new tabs (`target="_blank"`) without the `noopener` attribute can expose the application to reverse tabnabbing attacks in older browsers, where the malicious site can change the `window.opener.location` to a phishing page.
**Learning:** While `rel="noreferrer"` implicitly provides `noopener` behavior in modern browsers (Chrome >= 88), explicitly stating `noopener noreferrer` ensures broader protection across all environments and satisfies strict security linters.
**Prevention:** Always add `rel="noopener noreferrer"` to all `target="_blank"` external links in React applications (like `literacyDojo` and `codexdojo-os-prototype`) to enforce defense in depth.

## 2026-09-26 - Non-existent legacy rust-impl CORS report
**Vulnerability:** Audit alert reported `CorsLayer::permissive()` in `curriculum/15_metrics_collector/rust-impl/src/lib.rs`.
**Learning:** The legacy `rust-impl` directory was deleted in AID-1671 as part of standardizing on Node/TS across curriculum projects. The current `node-impl` in `curriculum/15_metrics_collector/node-impl/src/server.ts` does not enable CORS or use permissive origins.
**Prevention:** When investigating legacy implementation vulnerability reports, verify if the implementation track was removed or superseded by curriculum policy changes.
