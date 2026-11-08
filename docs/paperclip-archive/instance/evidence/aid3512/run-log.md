# AID-3512 — execution log (evidence)

Pin check (2026-09-30 ~20:54 UTC):
- GET /repos/dandpb/aidevschool/pulls/618 -> state open, head sha 7d2d6e6cf7f76e0a423daca57b6f9d8584429838, base 1975e2c7967cbd4a8af817271de89bf0f70bd617, changed_files 1 (+6/-4). MATCHES issue pin.
- Open PR scan: only #618 touches dojoToday a11y; #615/#616/#617/#619 are curriculum/literacy/docs fronts. No competing carrier.
- git fetch origin pull/618/head -> FETCH_HEAD = 7d2d6e6cf7f76e0a423daca57b6f9d8584429838 (re-verified).
- base is ancestor of head: OK.

Isolated review env:
- git worktree add --detach /tmp/opencode/aid3512 7d2d6e6cf7f76e0a423daca57b6f9d8584429838
- git worktree add --detach /tmp/opencode/aid3512-base 1975e2c7967cbd4a8af817271de89bf0f70bd617
- engines/dojoToday: npm ci --include=dev (both). Vite dev 6.4.3 OK.

Review-only spec (temporary, deleted from worktree after run; copies in this dir):
  aid3512-review.spec.ts + aid3512-review.config.ts (servers: head 5190 / base 5191) + r5-pixdiff.spec.ts

Run: npx playwright test -c review-tmp/aid3512-review.config.ts
  Running 4 tests using 1 worker
    r1 initial accessible names exclude emoji; visual text intact; aria wiring (295ms) PASSED
    REOPEN frame src: about:blank          <- pre-existing reopen quirk (also at base)
    FOCUS-VISIBLE outline: {"style":"solid","width":"3px","color":"rgb(79, 70, 229)"}
    r2 play button open/close/reopen via keyboard PASSED (588ms)
    r3 config button click transitions + deterministic ask() auto-open PASSED (495ms)
    HEAD play: {"text":"▶ Jogar aqui (inline)","fontSize":"13.12px","fontWeight":"800","color":"rgb(79, 70, 229)","textDecorationLine":"underline","padding":"6px 0px","rect":{"x":503,"y":2166,"w":147,"h":27}}
    BASE play: identical
    HEAD cfg: {"text":"⚙️ Configurar assistente (opcional)",...,"rect":{"x":503,"y":2260,"w":259,"h":27}}
    BASE cfg: identical
    PNG byte-identical collapsed card (with animations): false (91917 vs 91890 — CSS animation frame timing)
    r4 PASSED (1.2s)

Run r5 (animations disabled, caret hidden):
    PNG byte-identical (animations disabled): true sizes: 91996 91996 -> mission-card-head-1280-noanim.png == mission-card-base-1280-noanim.png

Viewports: desktop 1280x720 (card element shot 444x396; expanded 444x1176), mobile 375x667 (fullPage 375x3542). timezoneId UTC.

Existing checks (limited):
- npx tsc --noEmit -> exit 0 (clean)
- npx biome check src/main.ts -> "Checked 1 file in 111ms. No fixes applied." (clean)
- npx playwright test a11y-w2 (existing product spec touching #soc-config-btn) -> 5 passed (37.5s)

Not executed: real screen reader announcement (no NVDA/VoiceOver in env); full engine suite (continuity/hosted-os/readiness/selfcheck + w0/w1/w3) — out of limited scope, unchanged code paths.

Worktree left clean (review-tmp deleted); no product/test file modified; nothing pushed.
