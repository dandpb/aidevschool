## AID-187 — CSP framing fix for Dev candidate warehouse iframe

### Implemented fix

- Updated `engines/codexdojo-os-prototype/netlify.toml` CSP header from:
  - `frame-ancestors 'none'`
  to
  - `frame-ancestors 'self'`
- Added CSP regression coverage in `engines/codexdojo-os-prototype/scripts/pilot-bundle-lib.test.mjs`:
  - Confirms same-origin framing is allowed.
  - Confirms `frame-ancestors 'none'` is not present.
- This allows the `/apps/warehouse/` same-origin Dev candidate iframe to load inside its OS frame context and restores attempt/retry/verification flow.

### Validation

- `npm run test:pilot-bundle` — PASS, 16/16 tests.
- `npm run build:pilot` — PASS; built OS, LiteracyDojo, WAREHOUSE, WORMHOLE,
  and RELAY STATION into the complete pilot bundle.
- `npm run deploy:pilot -- --site 8bec714f-22cb-4468-8e2b-e3cd38652931 --json`
  — PASS.
- Immutable deploy ID: `6a8e2d5bb461eae9b9c38dff`.
- Immutable candidate:
  <https://6a8e2d5bb461eae9b9c38dff--aidevschool-codexdojo-os.netlify.app>.
- Remote probe of `/apps/warehouse/` — HTTP 200 and deployed
  `Content-Security-Policy` contains `frame-ancestors 'self'`.

### Release and QA handoff

- The immutable candidate above is published from this exact fix.
- Do **not** promote aliases or invite cohort in this change train.
- Route the immutable candidate to independent QA for:
  - iFrame load of `/apps/warehouse/` in Dev candidate path.
  - Evidence/retry/verify behaviors dependent on frame loading.
- Keep this issue in `in_review` while awaiting the QA pass on that immutable candidate.
