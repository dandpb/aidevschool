# Validation — school entry

Implementation run: 17 September 2026. This is local evidence, not deployment or product-readiness approval.

## Automated proofs

- `npm test`: 22 passing tests, zero failures/skips. Covers release persistence, auth/CSRF/origin, optimistic writes, current eligibility, ranking, malformed responses, fallback, validation, launch, public-origin configuration, storage failure, expiry/logout/rate limits, and real Chromium health transport.
- `npm run test:browser`: five passing tests, zero failures/skips. Anonymous recommendation and navigation; no-match/fallback/empty; operator login/toggle/logout; 390px and 1440px overflow; newest request ownership.
- `npm run check`: syntax check of every server/browser/script/test JavaScript module.
- `npm run test:live`: real TypeSafe HTTP, actual 13 catalog descriptions, two synthetic student requests. Eligibility deliberately injected for this proof. Reported model `jev-1.13.0`. It does not prove 13 engines online or language-domain accuracy.
- Docker build and container smoke: Node server HTTP 200, initially zero offered engines, SQLite opens as non-root, installed Chromium opens an enabled control. Linux arm64 image tested on this machine; no remote deployment.

The test-specific C06 timeout was initially 800ms by mistake; it was aligned to the already approved 10-second contract. Assertions and checklist obligations were not weakened.

## Real local journey

Actual SDLC Quest source served on local port5291. The entry used production assembly in development mode with only that target configured and an isolated SQLite file under `.scratch/school-entry-runtime/`. Browser logged in with a generated local operator secret, enabled SDLC Quest, logged out, submitted a synthetic software-learning goal, received the real TypeSafe recommendation, and clicked through to Quest. The configured dynamic mission control was visible and enabled. This is one actual local engine, not a synthetic availability claim for the rest.

Artifacts from that run: `test-results/real-flow.json`, `entry-real-desktop.png`, `entry-real-mobile.png`, `admin-desktop.png` (generated, untracked). The private password file is outside source and not included in evidence.

## Visual comparison

Reference: `entry-concept.png`; implementation screenshot `test-results/entry-fixture-desktop.png`. Native reference dimensions read directly from PNG. Both were inspected with the image viewer, plus real mobile and admin screenshots. The three-result visual fixture is explicitly synthetic; it is not the live availability list.

Browser fallback: Chrome DevTools wrapper earlier failed snapshot validation with a required-page identifier; browser-harness subsequently timed out. Installed Playwright Chromium was used for isolated functional and visual verification.

| Comparison | Evidence / adjustment |
|---|---|
| Hierarchy and composition | Brand/header, centered question, input, action, results and footer preserved. Three columns collapse to one at mobile width. |
| Typography | Desktop heading raised to60px and header reduced to60px after direct comparison; mobile heading34px. Native controls explicitly inherit typography. |
| Palette | White background, ink text, teal primary actions and thin gray rules; no added image tint or gradients. |
| Container model | Only result cards framed, with teal top rule; no marketing sections or invented metrics. Admin extends the same tokens with a row list. |
| Copy | Heading, subtitle, field, privacy helper, primary CTA and footer match reference. Dynamic names/descriptions come from catalog; no fabricated claims from the concept are shipped. |
| Reasons | Replaced repeated descriptions with short documented capabilities. Corrected the concept's unsupported suggestion of assessed learning in miniTown. |
| Responsive behavior | Actual390px screenshot and test show readable single-column controls and no horizontal overflow. |

Intentional, documented differences: manual catalog action was included as an accessible useful path; valid engine metadata replaces image fixture copy; reason label is “Por que pode combinar com você” to avoid overclaiming an ideal match; no fictitious recommendations appear before an actual request. Longer source-grounded descriptions and the manual catalog action make the full result page taller than the concept. No production artwork is needed; all UI remains code-native.

## Limits

Probe success proves a configured initial control, not the whole learning journey. Wrong selectors can be too permissive; configure and review per engine. Public probes accept only final URLs and same-origin read-only resources. Authenticated or incompatible engines fail closed. Single server instance, persistent disk, TLS ingress and production credentials are deployment obligations. Shared-proxy rate-limit behavior is documented in README. SQLite in Node22 is experimental. External model examples are a smoke test, not a calibrated quality guarantee.

Independent verifier report is separate and must account for checklist C01–C26 before final completion is claimed.
