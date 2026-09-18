# sdlc-quest bilingual PT/EN — Verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 522b33b..473d7bf (HEAD `473d7bf5d5192027176435dfc9cf955afc57a25f`) — 15 commits in range; the brief said 14, the 15th is the final docs backfill `473d7bf`
**Round**: 1 - full
**Verifier**: independent sub-agent (author != verifier)

All proofs re-run fresh at HEAD by the verifier, from `/Users/danielbarreto/Development/aidevschool/engines/sdlc-quest`. Chromium pinned to `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell` via `CHROMIUM_EXECUTABLE` (the default 1208 binary is absent).

## Binding sources

Step 1 (binding-source comparison against `.design/engines-bilingual-pt-en.md` etc.) did **not** run — profile: light. Its absence here is the profile, not an omission.

## Checks

| Check | Claim | Proof run | Evidence | Result |
|---|---|---|---|---|
| C1 | no saved key → pt-BR, `documentElement.lang === 'pt-BR'` | `python3 tests/i18n-browser.py` — `default-pt` PASS (14 checks, 0 errors, my run started 2026-09-18T17:57:04Z) | `tests/i18n-browser.py:41` — `check('default-pt',PT_MARKER in p.locator('#save-status').inner_text() and p.evaluate('document.documentElement.lang')=='pt-BR' … and p.evaluate("window.__store['sdlc-quest:lang']??null") is None)` | PASS |
| C2 | toggle EN swaps chrome, `lang='en'`, persists after reload | same journey — `toggle-en-chrome` and `lang-persisted-after-reload` PASS | `tests/i18n-browser.py:58` — `check('toggle-en-chrome',EN_MARKER in … and p.evaluate('document.documentElement.lang')=='en' … and p.evaluate("window.__store['sdlc-quest:lang']")=='en')`; `:110` — `check('lang-persisted-after-reload',EN_MARKER in … and p.evaluate('document.documentElement.lang')=='en')` after `p.close();p=load(b,saved)` | PASS |
| C3 | pt→en→pt leaves save byte-value and XP untouched | same journey — `progress-preserved-through-toggle` PASS | `tests/i18n-browser.py:90` — `check('progress-preserved-through-toggle',p.evaluate("window.__store['sdlc-quest-save-v1']")==before and p.locator('#xp').inner_text()==xp_before …)` | PASS |
| C4 | missing `_en` renders pt-BR field text, never raw key/empty | `node --test` batch (7 files, 96/96 pass) — `ok 58 - fallback renders pt-BR when _en is missing` | `tests/i18n.test.cjs:8` — `a.equal(L.field(record,'label','en'),'Promessa absoluta')` on a stub record with no `_en`; key-leak covered by ok 59 at `:17` | PASS |
| C5 | default pt byte-stable: gate green, no PT assertion edited | `npm run gate` exit 0 (my receipt, below); `git diff --name-status 522b33b..HEAD -- engines/sdlc-quest/tests/` | receipt `evidence-v1.3/runs/local-2026-09-18T17-58-10-791Z-53544/run.json`: 10 steps all `passed`, `inputsUnchanged: true`; diff = 4 additions + exactly 1 modification (`local-package.test.cjs`, only the 3 owner-approved lines: `lang:'pt'` in the two deepEqual shapes + `refs.length` 12→13); zero modifications to `tests/*.py`, `audit.test.cjs`, `golden.test.cjs` | PASS (precision note G3) |
| C6 | missing `_en` fails naming record id and field | batch — `ok 60 - walker reports record id and missing field` | `tests/i18n.test.cjs:75-83` — `delete data.missions[0].brief_en; a.equal(report.length,1); a.ok(text.includes("plan")); a.ok(text.includes("brief_en"))` | PASS |
| C7 | walker covers all displayable records, exclusions literal in test | batch — `ok 61` (actual name `walker covers missions/tasks/options/primers/glossary/sources and tlc modules` — checklist name is a prefix) and `ok 62 - walker green on real data` | `tests/i18n.test.cjs:29` — `EXCLUDE=new Set(["id","url","color","glyph","artifact","answer","type","boss","lines","budget","tag","version","checkedAt","install","flow","license","code","axis","skill","source"])`; `:84-112` plants 8 findings in data + 4 in tlc, asserts `report.length==8`/`==4` with id+field in the report; `:116-117` — `a.deepEqual(parityReport(questData),[]); a.deepEqual(parityReport(tlcData),[])` | PASS |
| C8 | EN mission dialog renders `brief_en`; intent options render `label_en`/`text_en` | journey — `mission-plan-en` and `intent options render label_en and text_en` PASS; batch `ok 62` | `tests/i18n-browser.py:77-78` — `p.locator('#mission-panel h2').inner_text()==qd['title_en'] and p.locator('#mission-panel p').first.inner_text()==qd['brief_en']`; `:81-85` — cards matched by id, `strong==o['label'] and p==o['text']` from `label_en`/`text_en` | PASS |
| C9 | EN chrome everywhere + single-file contains both langs | journey — `chrome-en`, `singlefile-both-langs` PASS; `node tools/build.cjs && grep` | `tests/i18n-browser.py:64-70` — brand/tlc-banner/harness-banner EN, `'GUARDIÕES DO RELEASE' not in body(p) and PT_MARKER not in body(p)`; `:115` — `PT_MARKER in H and EN_MARKER in H`; build deterministic (rebuilt file byte-clean vs git), markers in `sdlc-quest.html`: PT 2, EN 1 | PASS (precision note G1: `noscript` asserted at code/artifact level only) |
| C10 | EN wrong-answer feedback from core with `lang='en'`; existing node tests green unedited | journey — `wrong-answer-feedback-en` PASS; batch `ok 1-32` (audit) `ok 36-57` (golden) = 54/54; `git diff --quiet 522b33b..HEAD -- tests/audit.test.cjs tests/golden.test.cjs` exit 0 | `tests/i18n-browser.py:99-102` — `'The gate held the change.' in feedback and 'contract piece(s) missing' in feedback and 'Faltam' not in feedback` | PASS |
| C11 | `--lang en` on 4 tools, EN output; `--lang xx` → exit 64 `Argumento não suportado`; gate codes 0/1/2 kept | batch — `ok 94 - --lang en accepted`, `ok 95 - --lang xx rejected exit 64`, `ok 96 - gate exit codes preserved` | `tests/tools-lang.test.cjs:13-14` EN usage asserted (`assert.match(gateHelp.stdout,/Usage: node tools\/quest-gate\.cjs/)`, `doesNotMatch(/Uso:/)`); `:36-39` all 4 tools spawned → `assert.equal(rejected.status,64)` + `/Argumento não suportado/`; `:51-54` `releaseExitCode` 0/1/2 matrix | PASS |
| C12 | README EN-primary, "Leia em português" → integral PT mirror | batch — `ok 33 - readme en-primary with pt mirror` | `tests/docs-bilingual.test.cjs:13-20` — first line `/Leia em português/` + `/\]\(README\.pt-BR\.md\)/`, `assert.deepEqual(headings(en),headings(pt))`, mirror contains the `tlc-discover` paragraph and 2 further PT anchors verbatim | PASS |
| C13 | TLC/HARNESS guides EN with same section sequence + integral `.pt-BR.md` mirrors | batch — `ok 34`, `ok 35` | `tests/docs-bilingual.test.cjs:26-30` and `:35-39` — `assert.deepEqual(headings(en),headings(pt))`, `assert.match(en,/Leia em português.*TLC-GUIDE\.pt-BR\.md/)` (resp. HARNESS), sampled PT headings verbatim in mirror | PASS (note G5: heading equality is level-sequence equality) |
| C14 | manifest checked: exit 0, zero `(alterado)`/`(ausente)`, new files listed | `node tools/check-package.cjs` exit 0 — `227 arquivos conferidos. Hashes iguais ao manifesto local.`; `grep -cE '\(alterado\)|\(ausente\)' SHA256SUMS.txt` = 0 | all 9 targets grepped once each in `SHA256SUMS.txt`: `src/lang.js`, `tests/i18n.test.cjs`, `tests/i18n-browser.py`, `tests/tools-lang.test.cjs`, `tests/docs-bilingual.test.cjs`, `README.pt-BR.md`, `TLC-GUIDE.pt-BR.md`, `HARNESS-GUIDE.pt-BR.md`, `sdlc-quest.html`; 227 = 219 + 8 per Landing | PASS |
| C15 | no new deps, no external resource | `git diff --quiet 522b33b..HEAD -- engines/sdlc-quest/package-lock.json` exit 0; `grep -oE '<(script src|link)[^>]*' index.html` | lockfile unchanged; 13 refs, all `src/…` local — `src/lang.js` first in the script chain (Landing one-way door honored) | PASS |
| C16 | `i18n` step in gate chain; EN desktop journey passes and appears in receipt | `npm run gate` exit 0 (my receipt) | `evidence-v1.3/runs/local-2026-09-18T17-58-10-791Z-53544/run.json`: 10 steps all `passed` — contract-shape, build, rules, campaign-desktop/mobile, tlc-desktop/mobile, harness-desktop/mobile, **i18n** (execution chain 9 steps + contract-shape = 10, exactly the Landing 9→10 shape) | PASS |

Proof inventory (all fresh, at HEAD `473d7bf`): node batch 96/96; i18n browser journey 14/14 (`evidence-v1.3/i18n/i18n.json` regenerated by my run); gate exit 0; build + grep; check-package exit 0; git diffs quiet as listed.

## Swept-existing confirmations

- **serve.cjs host allowlist** — present and active: `tools/serve.cjs:59-60` — `if (!/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(host)) return text(403, 'Host não permitido.')`; binds `HOST='127.0.0.1'` (`:9`, `:114`). Confirmed.
- **app.js storage degradation** — present and reused: `src/app.js:79` `try { localStorage.getItem… }catch{storageOK=false;}`, `:82` save() catch, `:83` `updateSave()` renders `T('saveTemp')`; PT string at `:9`, EN variant `saveTemp:'Temporary mode · storage unavailable'` at `:35`. Confirmed — note G4: the Swept row cites the pre-feature range `app.js:8-11`, shifted by the STRINGS insertion.
- Remaining Swept rows resolve to checks already proven above (C6/C16 observability, C3 idempotency, C15 offline) or are explicit n/a policy (concurrency, auth beyond the allowlist).

## Gate

`CHROMIUM_EXECUTABLE=… npm run gate` — **exit 0; 10 steps, 10 passed, 0 failed**. Receipt: `evidence-v1.3/runs/local-2026-09-18T17-58-10-791Z-53544/run.json`, `inputsUnchanged: true` (verifier's own run, not the builder's `…17-51-58…`).

## Faults injected

None — profile: light.

## Gap list (ranked; none blocks PASS)

1. **G1 — C9 `noscript` enumerated but not runtime-asserted.** The C9 claim lists `noscript` among EN chrome; no browser assertion reads `noscript` innerText/HTML in EN (non-rendered content is invisible to the `body(p)` scans). Covered by construction only: `src/app.js:75` — `const ns=document.querySelector('noscript');if(ns)ns.innerHTML=c.noscript;` with the EN string at `src/app.js:69`, embedded in `sdlc-quest.html:2129`. A checklist precision gap, not a code defect.
2. **G2 — C2 reload is simulated.** `lang-persisted-after-reload` reloads as a new page seeded with the same in-memory localStorage double (native `file://` navigation blocked by policy — disclosed in the journey's own `limitations`). The checklist named this exact proof, so this is a disclosed level limitation, recorded for precision.
3. **G3 — C5 proof wording vs diff reality.** C5's proof text says the tests diff shows "só adições"; the actual diff carries one modification (`local-package.test.cjs`, 3 lines). The same checklist pre-approves exactly those lines in its Landing table and boundary log, so the artifact is internally reconciled — but the C5 text should say "additions plus the approved local-package lines".
4. **G4 — stale line citation in Swept.** Storage degradation cited at `app.js:8-11` (pre-feature); it now lives at `app.js:78-83`. Constraint itself confirmed.
5. **G5 — C12/C13 heading equality is level-sequence equality.** `headings()` (`tests/docs-bilingual.test.cjs:10`) maps each heading to its `#`-count, so `deepEqual` proves count and level structure, not title text; PT title text is verified only at the sampled anchors. Settles the checklist's stated value ("contagem de headings igual"); noted because "mesma sequência de seções" (C13) reads stronger than what is asserted.
