# Plan: dojoToday CI job must emit its producer readiness report

Change-id: AID-723-dojotoday-readiness-ci · From: intent/AID-723-dojotoday-readiness-ci/intent.md
(small-fix fast path: bounded CI-only change) · Status: approved (CEO order AID-721/A via
AID-723; scope mirror of defect AID-722's suggested fix)

## Files that change

- `.github/workflows/ci.yml` (modified, dojotoday job only) — after `npm run build`,
  three additions mirroring the literacydojo job (ci.yml:262-275):
  1. `npx playwright install --with-deps chromium` (browsers for the readiness spec);
  2. `npm run test:readiness` (= `selfcheck && playwright test && READINESS_TEST_RUN=passed
     node scripts/readiness-report.mjs`; emits
     `engines/dojoToday/test-results/readiness/dojotoday-active-unit-guidance.json`);
  3. `actions/upload-artifact@v4` with `name: dojotoday-readiness-${{ github.sha }}`,
     `path: engines/dojoToday/test-results`, `if-no-files-found: warn`, plus the shared
     automated-facts-only comment.
- `intent/AID-723-dojotoday-readiness-ci/{intent,plan}.md` (new — this chain).

## Order of work

1. intent/plan (this chain).
2. Workflow edit (done as specified; no other job touched).
3. Verify locally at HEAD: `npm run test:readiness` in `engines/dojoToday` green with
   report `gitSha` == HEAD; workflow YAML parses; `git check-ignore` confirms
   `engines/dojoToday/test-results` stays untracked (no stray artifacts in the diff).
4. Branch `dandpb/aid-723/dojotoday-readiness-ci`; single commit; PR to `main` with the
   defect evidence (run 33734625483 / job 100583454687) and the local proof in the body.
5. PR head CI must show: dojotoday job green, `dojotoday-readiness-$SHA` artifact listed,
   `product readiness (claims)` green. Receipt with links on AID-723 → `in_review`;
   signal merge to founder (dandpb). After merge: revalidate the gate green on the merge
   commit, then close AID-723 and coordinate AID-722 closure with QA.

## Risks

- Playwright first run in this job could add ~1-2 min (browser download) — acceptable;
  every other readiness-emitting job already pays it.
- `test:readiness` re-runs `selfcheck` (also a standalone step) — harmless redundancy,
  keeps the npm script the single source of truth (literacydojo has the same overlap).
- Flaky readiness spec would fail main — not observed (single local run green; QA ran it
  green @ 0b8148e5 too); if it flakes on the PR, that exceeds scope → stop and block per
  AID-723 limits rather than adding retries here.
- No `contentVersion`/grant/gate edits, so no endorsement-window conflict.

## Proof

- Local @ `59359d60`: `npm run test:readiness` → selfcheck OK, 1 passed, report emitted
  (`gitSha=59359d60b38d4cdd1b22f134f93d8f6bd4031732`, `outcome=pass`).
- Workflow YAML validated (`yaml.safe_load`) after the edit; diff is 10 added lines in
  one job.
- CI on the PR head is the executable gate proof (see receipt on AID-723).
