# MERGE + PROMOTION EVIDENCE — PR #191 (C4) + PR #192 (C5) — AID-410

**Executed by:** Founding Product Engineer (agent `fa8130d5-e24e-4f98-8470-ccfeef17c6d5`)
**Repo:** `dandpb/aidevschool` (branch `main`) · **Date (UTC):** 2026-08-30
**Order:** CEO AID-407/C (issue AID-410) · **QA gate:** AID-360 verdict **GO** (2026-08-30T17:18:56Z, comment `614360f9`)
**Patterns:** AID-390 minimal-toggle merge · AID-253/254/343 promotion flow · AID-273/278 dated evidence

## Provenance (first-class)

1. CEO execution order AID-410 (triage AID-407, 2026-08-30 ~17:0xZ): merge C4 (#191) then C5 (#192), promote production, close AID-358/359. Blocked on AID-360 until its GO.
2. Independent QA AID-360 (`done`): **GO on both bindings**, merge order #191 → #192 with mandatory rebase+renumber of #192 (game-06 `chapterOrder` 4→7; without it 11 tests fail; with it the combined 21-mission state passes — simulated and verified by QA in `wtsim`).
3. AID-358 confirmation `ecf017a3` **accepted** (2026-08-30, comment `d44263db`); successor confirmation `70c4ca6e` (UI-merge request) **superseded** by CEO order AID-410 (API cancel is board-only for agents — 403 at 2026-08-30T~17:5xZ; supersession registered in the AID-358 thread).
4. AID-359 confirmation `b6520a2e` **accepted** (comment `cc300053`); CEO order supersedes it for authorization purposes (provenance registered in the AID-359 thread).

## Pre-merge verification (GitHub API, 2026-08-30 ~17:2xZ)

- PR #191 `open`, head `2d3a9572837929dcd8d3f343f901b7e559a8dc4e` — **exactly the QA-pinned head**, base `9d36e36` = `main` head (no drift). Checks @ `2d3a957`: 35 runs — 34 `success` + 1 legitimate matrix `skipped`; all 4 required contexts green.
- PR #192 `open`, head `9d35fb304b1e8b696cc073485a7c797d67aad8ac` — **exactly the QA-pinned head**, base = `main` head. Checks @ `9d35fb3`: 35 runs — 34 `success` + 1 `skipped`.
- Protection BEFORE (both windows): `strict:true` + 4 contexts · `require_last_push_approval=true` · `required_approving_review_count=1` · `enforce_admins=true` · conversation resolution on · no force pushes/deletions.

## Window 1 — PR #191 (C4, l15–l17)

| Event | Timestamp (UTC) | Result |
| --- | --- | --- |
| Toggle-OFF (PUT protection: only `require_last_push_approval`→false, `count`→0; rest verbatim) | 17:23:33Z | 200 |
| Merge `PUT /pulls/191/merge`, `merge_method=merge` (no squash), expected-head guard `sha=2d3a957…` | 17:23:35Z | 200 — **merge commit `0a2e2042220aea457fbf9018f7fe7fc28fca78f9`** |
| Toggle-ON (PUT protection restored verbatim) | 17:23:36Z | 200 |

Window duration: **3 s**. Post-restore GET compared field-by-field vs BEFORE: **IDENTICAL** (`last_push_approval=true`, `count=1`, `enforce_admins=true`, strict+4 contexts, all booleans equal). `main` head = `0a2e2042`; PR #191 `closed/merged=true`.

## Integration of #192 onto post-#191 main (the mandated rebase+renumber)

Worktree `/paperclip/tmp/aid410/wt` (clone of QA bare, fresh fetch; zero contact with shared canonical workspace):

- `git merge origin/main` into `aid-359/dev-mission-game-06` @ `9d35fb3` → **exactly the 10 textual conflicts predicted by QA** (mission-bindings.yaml, missions.ts, MANIFEST.md, Onboarding.tsx, MapScreen/ProgressScreen/migration tests, chapter-continuity.smoke, mission_catalog_fixture.py, release-order test).
- Resolution semantics: union of both sides + **game-06 `chapterOrder` 4→7** (l15=4, l16=5, l17=6, game-06=7) + assert counts 18/20→**21**; `missions.ts`/bindings resolved to the QA-verified combined state — my resolution proved **byte-identical** to QA's independent `wtsim` simulation for both canonical files.
- Local verification: `python3 -m learner.substrate --check` in sync; full sync → **0 dirty** (projections regenerable, no hand-edit); `pytest learner/substrate/tests learner/gate/tests` → **432 passed**; `pytest curriculum/ai-literacy/tools/tests` → **37 passed**.
- Merge commit `7d24f17` pushed (fast-forward, no force). CI: 1 FAIL first run — my resolution added a stray `returnFromGame` after the l15 literacy handshake (button does not exist on literacy screens; **my defect, not a binding defect**). Fix `f6875cb` removed it; CI re-ran **fully green**: workflow run `33325613710` — all jobs `success` (34 checks + 1 legitimate matrix skip), all 4 required contexts green. (Note: check-runs API pagination truncated earlier polls — the jobs API is the authority.)
- Window 2 — merge `#192` with expected-head guard `sha=f6875cb…`: toggle-OFF 17:40:20Z → merge 17:40:23Z → toggle-ON 17:40:23Z (window **3 s**). **Merge commit `72130c6d7002fc03d2fccb6a1131d05f7bbab467`**; protection restored **IDENTICAL**; `main` head = `72130c6d`; PR #192 `closed/merged=true`.

## Production promotion (AID-253/254/343 flow)

Pinned ref `refs/heads/release/72130c6d` = `72130c6d7002fc03d2fccb6a1131d05f7bbab467` — pushed and verified by `git ls-remote` (== `main` head).

Clean worktree `/paperclip/tmp/aid410/promo` @ `72130c6d` (outside the shared workspace; deps from lockfile caches; literacy `gen:content` regenerated from canonical YAML — "OK: 17 lições: 14 IA na Prática, 3 Dev").

| Field | Value |
| --- | --- |
| Build entrypoint | `COMMIT_REF=72130c6d7002fc03d2fccb6a1131d05f7bbab467 node scripts/build-pilot-bundle.mjs` (OS vite + literacy + warehouse/wormhole/relay-station + **pipeline-plant** + staged functions; pixelDojo immutable pin embedded) |
| Manifest sha256 | `f81bfd077214d1ec903a376850c486d2490fa0e65289149df7a1e79d3d798d04` |
| Surfaces sha256 (prefix) | os `b319126d…` · literacydojo `0a633c55…` · warehouse `d348c274…` · wormhole `eef9a3b1…` · relay-station `535ee057…` · **pipeline-plant `91f5755f…`** |
| Staged verifier function | `ce72a04f800607794a403d4123f76f313ffc6599661844934000d30639816533` == canonical `learner/gate/netlify-functions/` (drift guard PASS; same hash as AID-343 pin) |
| Tooling guards | `pilot-bundle-lib.test.mjs` **20/20** · `dojo_verification_bridge_netlify.test.mjs` **2/2** |
| Deploy draft | `6a946c076fded0979e88bf80` (correct site `aidevschool-codexdojo-os`) — precheck **37/37 PASS** |
| **Deploy production (vigente)** | **`6a946c865e010af1557561de`** → alias `https://aidevschool-codexdojo-os.netlify.app` · permalink `https://6a946c865e010af1557561de--aidevschool-codexdojo-os.netlify.app` |
| Superseded (wrong project, ignored) | draft `6a946bee99ce0cc8cb76f8fd` on `jocular-sorbet-3cd54b` (deployed before `--site` was specified; never promoted, not part of the channel) |
| Rollback owner | **FPE (fa8130d5)** — eligible rollback deploys: `6a944cf24d75848dee3a5505` (prior pin `6d72735b`, manifest `7d0e16d9…`) and earlier per AID-305 table. Never promote an unverified commit. |

## Identity proven post-pin (precheck `precheck-72130c6d.mjs`, 37 checks, archived)

**alias 37/37 PASS · permalink `6a946c86` 37/37 PASS · draft `6a946c07` 37/37 PASS.**

- Manifest sha256 `f81bfd07…` + `sourceRevision` `72130c6d7002fc03d2fccb6a1131d05f7bbab467` **identical across alias == permalink == draft == local build**.
- Surfaces 200 incl. **`/apps/pipeline-plant/`** (new C5 surface).
- OS bundle embeds same-origin pins (`/apps/literacydojo/`, `/apps/pipeline-plant/`), immutable pixelDojo pin, no stale external pin.
- literacy `contentVersion 2026-08-21.1`; AID-271 reflow guards present; reflow predicate PASS @320/@298.
- **MOTOR ao vivo**: `l01`, `l14` (controls), **`l15` (new C4)**, **`game-06` (new C5)**, `warehouse` (control) — all `MOTOR running` with same-origin iframes (l15→literacydojo, game-06→pipeline-plant).
- Bridge: 200 token 43ch same-origin · 403 `origin-forbidden` without header · 401 unauthenticated POST.
- Map copy: **"21 missões, uma sequência"** (14 IA Prática + 7 Dev); OS bundle embeds **21 `chapterOrder` entries** incl. l15–l17 and game-06 (order 7).

## Boundaries respected

- No writes to `learner/learning_state.yaml` or `.mavis/` by this promotion (build worktree scratch only); no `mastered` flips; no participant data touched.
- Producer ≠ verifier: this is producer evidence. Independent post-promotion verification (readiness tier re-grant + remote matrix) delegated to QA Lead in a child issue.
- Single publish channel preserved: production publishes exclusively via FPE CLI deploy inside a promotion issue (AID-343 addendum rule); provider CI auto-publish not connected.

## Raw captures (this directory)

`window_191_log.json`, `window_192_log.json`, `aid410_merge19{1,2}_resp.json`, `protection_{pre,post}_{191,192}.json`, `main_head_after_{191,192}.txt`, `pr19{1,2}_after.json`, `precheck-72130c6d.mjs`, `precheck-{draft-6a946c07,alias,permalink-6a946c86}-37of37-2026-08-30.txt`.
