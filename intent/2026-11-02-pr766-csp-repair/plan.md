# Plan: PR #766 CSP repair

1. Add browser regression coverage in `engines/dojoToday/playwright/csp.spec.ts`: real page and configured BYOK flow for HTTPS and the two documented HTTP loopback hostnames on other ports; same-origin behavior; block inline script, inline event handler, third-party script and non-loopback HTTP connection.
2. Change `engines/dojoToday/index.html`: prohibit inline scripts and unnecessary WebAssembly eval; keep same-origin scripts, style compatibility, HTTPS endpoints and same-origin requests; add only the documented HTTP loopback hostnames with any port. Do not broaden plain HTTP beyond these names.
3. Run the regression on the original PR first and record its failures, then change the policy and rerun. Run lint, selfcheck, production build and relevant existing Playwright tests. Confirm iframe and hosted app behavior.
4. Request fresh-context independent technical review; do not represent it as a Paperclip verdict. Preserve original Jules authorship and describe this repair as a separate Codex contribution. Required Paperclip registration, verdict and gate remain independent and mandatory.

Risks: policy is delivered via HTML meta (not an HTTP header), loopback services must still permit CORS, HTTPS services must satisfy normal browser security/CORS rules, and hosted iframe documents have their own policies. Tests cannot prove all deployments/providers. This CSP continues to allow arbitrary HTTPS connections because users choose their own HTTPS BYOK provider, as supported today.

## Verification record

- Original head f7269e1f: the new CSP regression failed on cross-port HTTP localhost and allowed inline script execution; failure screenshots, traces and videos were saved locally.
- Repair: `npm run lint`, `npm run selfcheck` and `npm run build` passed; 22 targeted Playwright tests passed in system Chromium. The new loopback test uses an actual server restricted to `127.0.0.1` and verifies OPTIONS and POST for both permitted hostnames. HTTPS provider behavior is exercised with a mocked response.
- Independent fresh-context Codex reviewer inspected the diff, reported no functional defect, and independently verified a real loopback request with CORS. The reviewer identified that the first test server bound to all interfaces; this was fixed by binding to `127.0.0.1`, and its regression test passed. This is a technical review, not a Paperclip FPE/QA verdict.
- Existing inline-game regression uses mocked iframe HTML. Real game bundle initialization was not verified: installing the voxel workspace stopped with `ERR_PNPM_IGNORED_BUILDS` pending dependency-script approval. No dependency approval or configuration change was made.
