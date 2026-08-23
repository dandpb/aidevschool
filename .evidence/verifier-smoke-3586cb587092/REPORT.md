# Verifier Smoke Report — HEAD `3586cb587092`

**Executor:** Cloud Agent (Verifier test runner)  
**Date:** 2026-08-23  
**Branch:** `cursor/verifier-smoke-evidence-bcba` (evidence archive only; no `src/` changes)

## Environment notes

- Playwright browsers were missing on first LiteracyDojo run; installed via `npx playwright install chromium` and re-ran successfully.
- No `playwright-report/` HTML bundles were produced (both engines use the `list` reporter, not `html`).
- Screenshots are `only-on-failure`; all captured screenshots are from CodexDojo OS failures.

## Suite summary

| Engine | Command | Overall | Log |
| --- | --- | --- | --- |
| LiteracyDojo | `npm run test:e2e` | **PASS** (6/6) | `.evidence/.../literacyDojo/test-e2e.log` |
| CodexDojo OS | `npm run test:readiness` | **FAIL** (pilot 3/3 pass; dev phase 2/5 pass) | `.evidence/.../codexdojo-os-prototype/logs/test-readiness.log` |

`learning-slice.smoke.spec.ts` is **not** invoked by `test:readiness`; it was run separately for canonical coverage (see below).

---

## 1) LiteracyDojo — `playwright/vertical-slice.spec.ts`

| Test | Result |
| --- | --- |
| readiness literacy-retry: Mapa Inicial encaminha erro, dica e nova tentativa para a rota guiada | **PASS** |
| readiness literacy-happy-path and literacy-resume: acerto de primeira encaminha para a rota intermediária | **PASS** |
| Mapa Inicial continua utilizável em viewport compacto | **PASS** |

**Claim check (spec read):** l02 Mapa Inicial flow; `lessonStatus.l02 === "completed"` with `currentLessonId === "l03"`; evidence records valid with `verifierRequired`; no `mastered` in progress JSON.

**Other specs in same `npm run test:e2e` run (not canonical list):** gamification (2) **PASS**, pwa (1) **PASS**.

**Artifacts:**
- `engines/literacyDojo/test-results/readiness/literacy-retry.json`
- `engines/literacyDojo/test-results/readiness/literacy-happy-path.json`
- `engines/literacyDojo/test-results/readiness/literacy-resume.json`
- Archive: `.evidence/verifier-smoke-3586cb587092/literacyDojo/`

**Screenshots:** none (all tests passed).

---

## 2) CodexDojo OS — canonical specs

### `tests-pilot/pilot-build.smoke.spec.ts` (via `test:smoke:pilot`)

| Test | Result |
| --- | --- |
| readiness os-onboarding-track-choice and os-literacy-hosted-mission: IA Prática mission mounts from the bundled build | **PASS** |
| readiness os-voxel-hosted-missions and os-verification-recovery: hosted simulation mounts … verifier honestly | **PASS** |
| a corrected WAREHOUSE retry supersedes the failed attempt verification state | **PASS** |

**Claim check:** bundled `/apps/` missions mount on OS origin; static deploy shows “Ainda não enviada” / “Verificador indisponível” (producer ≠ verifier).

**Artifacts:** `.evidence/.../codexdojo-os-prototype/test-results-pilot/`, log `logs/test-smoke-pilot-rerun.log`

### `tests/chapter-continuity.smoke.spec.ts` (via `test:readiness` phase 2)

| Test | Result |
| --- | --- |
| preserves both complete three-mission chapters across switches and reloads | **FAIL** — timeout waiting for `Começar missão` after reload post-l02 |

**Failure screenshot:** `.evidence/.../test-results-readiness-phase2/chapter-continuity.smoke-p-d9b45-across-switches-and-reloads-desktop-1280/test-failed-1.png`

### `tests/readiness-recovery.smoke.spec.ts` (via `test:readiness` phase 2)

| Test | Result |
| --- | --- |
| readiness os-returning-recovery: cleared local state returns to onboarding without completion | **PASS** |

**Claim check:** fresh browser context → onboarding; zero “missão concluída” / “mastered” text.

### `tests/learning-slice.smoke.spec.ts` (run separately — not in `test:readiness`)

| Test | Result |
| --- | --- |
| completes l02 through the mission-first host without changing canonical mastery | **FAIL** — `Verificação independente aprovada` not visible |
| shows independent FAIL separately from local and canonical progress | **FAIL** — `Verificação pede nova tentativa` not visible |

**Failure screenshots:**
- `.evidence/.../test-results-learning-slice/learning-slice.smoke-compl-27e1d--changing-canonical-mastery-desktop-1280/test-failed-1.png`
- `.evidence/.../test-results-learning-slice/learning-slice.smoke-shows-7f6e0-ocal-and-canonical-progress-desktop-1280/test-failed-1.png`

### `tests/renderer-fallback.smoke.spec.ts` (via `test:readiness` phase 2 — bonus, not in user canonical list)

| Test | Result |
| --- | --- |
| reduced motion selects the keyboard-operable semantic projection | **FAIL** — `Verificação independente aprovada` not visible |
| context loss degrades and retries without resetting simulation or evidence identity | **FAIL** — same |
| forced WebGL unavailability fails over without blocking mission controls | **PASS** |

**Failure screenshots:** `.evidence/.../test-results-readiness-phase2/renderer-fallback.smoke-*/test-failed-1.png` (×2)

---

## Hypothesis: 4 claims ↔ specs

| Claim (oferta) | Spec coverage | Observed at HEAD |
| --- | --- | --- |
| Literacy Mapa Inicial l02; completed ≠ mastered | `vertical-slice.spec.ts` | **PASS** — explicit `completed` assertion, no mastery |
| IA Prática + voxels mount from bundled build | `pilot-build.smoke.spec.ts` | **PASS** |
| Chapter continuity l01–l03 + WAREHOUSE/WORMHOLE/RELAY; resume | `chapter-continuity.smoke.spec.ts` | **FAIL** at l03 resume after reload |
| Recovery / clear; no mastered | `readiness-recovery.smoke.spec.ts` | **PASS** |
| l02 hosted mission; completed ≠ mastered | `learning-slice.smoke.spec.ts` | **FAIL** — verifier UI strings absent (likely dev-bridge / local verifier path) |

Common failure mode on CodexDojo dev-server specs: expectations for independent verifier UI (`Verificação independente aprovada`, `Verificação pede nova tentativa`) not met — consistent with missing or inactive local verifier bridge in this environment (pilot static build correctly reports verifier unavailable).

---

## Screenshots generated (5 total)

```
.evidence/verifier-smoke-3586cb587092/codexdojo-os-prototype/test-results-readiness-phase2/chapter-continuity.smoke-p-d9b45-across-switches-and-reloads-desktop-1280/test-failed-1.png
.evidence/verifier-smoke-3586cb587092/codexdojo-os-prototype/test-results-readiness-phase2/renderer-fallback.smoke-re-48f6d-perable-semantic-projection-desktop-1280/test-failed-1.png
.evidence/verifier-smoke-3586cb587092/codexdojo-os-prototype/test-results-readiness-phase2/renderer-fallback.smoke-co-99327-lation-or-evidence-identity-desktop-1280/test-failed-1.png
.evidence/verifier-smoke-3586cb587092/codexdojo-os-prototype/test-results-learning-slice/learning-slice.smoke-compl-27e1d--changing-canonical-mastery-desktop-1280/test-failed-1.png
.evidence/verifier-smoke-3586cb587092/codexdojo-os-prototype/test-results-learning-slice/learning-slice.smoke-shows-7f6e0-ocal-and-canonical-progress-desktop-1280/test-failed-1.png
```

---

## Verifier disposition

- **No product changes.**
- **No customer-ready or mastery granted.**
- **Evidence archived** under `.evidence/verifier-smoke-3586cb587092/`.
