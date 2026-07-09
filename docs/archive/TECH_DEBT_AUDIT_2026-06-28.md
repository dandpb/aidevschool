# AI DevSchool — Technical Debt Audit

**Date:** 2026-06-28
**Scope:** Whole ecosystem (root + `engines/codexDojo`, `engines/minimaxDojo`, `engines/miniMaxEvolutionEngine`, `engines/pixelDojo`, shared `curriculum/` + `learner/` substrate)
**Categories audited:** Code, Architecture, Test, Dependency, Infrastructure (Documentation excluded by request — but stale *planning* docs that block work are flagged under Architecture/process)
**Method:** Quantitative sweep of the tracked tree (1,216 files) + three parallel deep-dive agents (engines and substrate) + independent re-verification of every load-bearing claim against source (file:line). Producer ≠ verifier.

> **Verdict:** The code is clean; the *system* is not. The learning loop has never closed once — that's the whole ballgame. Nothing here is on fire, but the highest-value fixes are the cheap ones that unblock that loop.
>
> **Do this week:** D1 (mark the false roadmap superseded) · D2 (stand up CI) · D5 (make the Python tests runnable) · D6 + D11 (stop committing cruft).

---

## Executive summary

The micro level is clean: strict TypeScript + Biome give the TS engines zero `any` and zero `TODO/FIXME`, tests exist in every language, and tooling (Vite 7 / Vitest 4 / Biome 2.3) is current. The debt is structural, and clusters around one fact:

> The factory ran; the school did not. The ecosystem over-produced engineering artifacts (18 polyglot challenges, a ~700-line journal, four engines) while the **learning loop has never closed once** — `learner/learning_state.yaml` shows the one unit with only a `presented` event ("no gate review yet"), `streak.current: 0`, `gate.implementation_blocked: true`.

The highest-value items are the cheap ones blocking that loop: no CI enforces the "no claims without evidence" rule; the Python tests can't be run by default; gate thresholds are hardcoded instead of read from the config seam; and the top-level roadmap is materially false (it prescribes `git init` for a repo with 1,216 tracked files). Generated artifacts and tool state are committed, and `.git` has bloated to 142 MB. None of it is a fire — but it blocks the one outcome the project exists to produce.

---

## Scoring method

Each item is scored on three axes (1–5):

- **Impact** — how much it slows the team / blocks the goal
- **Risk** — what happens if it is left unfixed
- **Effort** — difficulty of the fix (used inverted: lower effort → higher priority)

**Priority = (Impact + Risk) × (6 − Effort)** — range 2 (ignore) to 50 (do now).

---

## Prioritized debt register

> **D3 is a strategic blocker, not a line item.** "The learning loop has never closed" is product execution, not classic debt. It's scored here for visibility, but it's the *destination*, not the road — it can't be closed by refactoring, only by a real graded attempt (see its detail entry).

Severity bands by priority: **Do now** ≥ 30 · **High** 20–29 · **Medium** 12–19 · **Low** < 12.
Status reflects the 2026-06-28 remediation pass — ✅ done · ◑ partial · ⏸ deferred · n/a not needed.

| # | Item | Category | Impact | Risk | Effort | **Priority** | Status |
|---|------|----------|:--:|:--:|:--:|:--:|:--|
| D1 | Stale/false roadmap + competing status docs | Architecture | 4 | 3 | 1 | **35** | ✅ done |
| D2 | No CI/CD anywhere — evidence gate unenforced | Infrastructure | 4 | 4 | 2 | **32** | ✅ done |
| D3 | Learning loop never closes (`implementation_blocked`) | Arch / product | 5 | 5 | 3 | **30** | ⏸ deferred (yours to close) |
| D4 | "Dead" SessionStart briefing hook | Infrastructure | 3 | 3 | 1 | **30** | n/a — false finding (hook is wired) |
| D5 | Python tests unrunnable by default | Test | 3 | 3 | 2 | **24** | ✅ done |
| D6 | `.codegraph` absolute-path symlink | Infrastructure | 2 | 2 | 1 | **20** | ✅ done (ignored) |
| D7 | codexDojo unescaped `innerHTML` | Code | 2 | 3 | 2 | **20** | ✅ done |
| D8 | Gate thresholds hardcoded vs config | Code / Arch | 3 | 3 | 3 | **18** | ◑ thresholds done; personas deferred |
| D9 | Test quality: vacuous test, god test-file | Test | 3 | 3 | 3 | **18** | ◑ vacuous test fixed; god-test split deferred |
| D10 | pixelDojo encounter dup + contract drift | Code | 3 | 3 | 3 | **18** | ◑ drift fixed; dedup deferred |
| D11 | Committed generated artifacts + tool state | Infrastructure | 2 | 2 | 2 | **16** | ◑ ignored; untrack + rewrite = your commit |
| D12 | Dependency hygiene: undeclared PyYAML | Dependency | 2 | 2 | 2 | **16** | ✅ done |
| D13 | Curriculum 3× dup, mislabeled stubs, god-files | Code / Arch | 3 | 2 | 4 | **10** | ⏸ deferred (large) |

> Effort note: D2, D11 and D3 have a *cheap first slice* and an *expensive tail* (add CI quickly vs. full matrix; stop tracking artifacts vs. rewrite `.git` history; wire one loop vs. productionize the pipeline). The score reflects the cheap, high-value slice; the tail is sequenced in the phased plan.

---

## Findings in detail (ranked)

### D1 — Stale roadmap and four competing source-of-truth docs · Architecture · 35
The top-level `REFACTOR_PLAN.md` (dated Jun 9) is materially false against current reality: it says there is "no safety net — no git anywhere in the tree" (line 22) and prescribes `git init` (lines 35–37), cites the repo as "2.9 GB" and codexDojo as "~1,067 LOC / only 01_rate_limiter implemented" — all outdated. It is never marked superseded. Meanwhile `curriculum/catalog.md` says "Implemented: 1 / 02–18 Not started" while `curriculum/BACKLOG_STATUS.md` relabels 02–18 as `scaffolded`, and `CONTEXT.md` / `CONTEXT-MAP.md` describe state that no longer exists. **Risk:** any plan built on these docs starts from false premises; honesty currently survives only because the newest doc (`BACKLOG_STATUS.md`) happens to be accurate.
**Fix (Effort 1):** Add a one-line `SUPERSEDED — see BACKLOG_STATUS.md (YYYY-MM-DD)` banner to `REFACTOR_PLAN.md`, `CONTEXT.md`, and the stale half of `catalog.md`; declare a single canonical status doc.

### D2 — No CI/CD anywhere · Infrastructure · 32
No `.github/` directory exists; no GitLab/Circle/Jenkins/Azure config anywhere in the tree (verified). The only automation-adjacent files are two `.golangci.yml` in 2 of 18 Go impls. Every engine ships a real `test`/`lint`/`build` script and the substrate ships unittest suites, but **nothing runs them on push.** The ecosystem's founding rule — "no claims without evidence; executable-evidence gate" — has zero machine enforcement. pixelDojo even has a CI-aware Playwright config (`reuseExistingServer: !CI`) wired to a pipeline that does not exist.
**Fix (Effort 2):** Add a GitHub Actions workflow that runs, per affected path, `pnpm lint/test/build` (codexDojo, pixelDojo), `go test ./...`, `cargo test`, and `python -m unittest` for the substrate. Start with the two TS engines (highest churn) and expand.

### D3 — The learning loop has never closed · Architecture / product · 30
The central value proposition is unproven. Verified from `learner/`:
- `learning_state.yaml:88` `units_log` contains one unit whose only event is `{date: 2026-06-19, event: presented}`; the file comments "has a `presented` exposure but no gate review yet."
- `streak.current: 0`, `longest: 0`, `last_gate_date: null` (lines 101–104); `gate.implementation_blocked: true` (line 55).
- The one attempt, `attempts/U0-sonda-rate-limiter-robustness-attempt-1.md`, is a starter stub with every section `TODO`; `attempts/README.md` shows "graded: 0 (none yet)."
- `predictions.yaml` is an empty list; `learner_profile.md` Dreyfus×Bloom matrix is entirely placeholder.

This is product execution more than classic debt, but it is the north star, and D2/D4/D5/D8 are the debt that blocks it.
**Fix (Effort 3):** Pick one challenge (01_rate_limiter), fill a real attempt, unblock the gate, grade it against executable evidence, and record the `units_log` review + streak increment — one end-to-end loop, manually if needed, then automate.

### D4 — SessionStart briefing hook · Infrastructure · CORRECTED (false finding)
**Retracted on re-verification (2026-06-28):** `engines/miniMaxEvolutionEngine/.claude/settings.json` **does exist** and correctly registers the hook (`SessionStart` → `bash "$CLAUDE_PROJECT_DIR/.claude/hooks/briefing.sh"`). The original auditing agent missed the file; the hook is wired as committed, so there is nothing to fix. Noted here as a worked example of why producer ≠ verifier — the claim only survived until a second pass checked the actual file.

### D5 — Python tests unrunnable by default · Test · 24
`engines/minimaxDojo/tests/*` use absolute imports like `from engines.minimaxDojo.core...`, but there is no root `__init__.py`, no `conftest.py`, no `pyproject.toml`/`pytest.ini`, and `engines/__init__.py` is empty. The suite runs only from one undocumented CWD. The substrate suite and the engine suite are two disjoint islands with no shared runner. Net effect: real tests exist but are effectively dead because nobody can reliably run them — and there is no CI to catch that (D2).
**Fix (Effort 2):** Add a root `conftest.py`/`pyproject.toml` defining the package roots and a single `make test` (or `nox`) entry point.

### D6 — `.codegraph` absolute-path symlink · Infrastructure · 20
`.codegraph → /Users/danielbarreto/.omo/codegraph/projects/aidevschool-1afedf749e3aad7b` is machine- and user-specific and points outside the repo. It breaks on any other machine or contributor. (The other four root symlinks — `projects`, `.agora`, `learning_journal.md`, `project_proposal.md` — are relative compat shims and are fine, though `REFACTOR_PLAN.md` C4 left their "do we still need them?" audit unresolved.)
**Fix (Effort 1):** Make it relative if the target can live in-repo, otherwise `.gitignore` it and generate it locally.

### D7 — codexDojo unescaped `innerHTML` rendering · Code · 20
The render layer interpolates state into raw template strings assigned to `root.innerHTML` (`src/app.ts:38`; `src/render/learner.ts:32–129`) with no escaping. Exploitability is **low today** because all rendered data is auto-generated from local `learner/` files, but the pattern is unsafe the moment any user- or network-sourced string is rendered.
**Fix (Effort 2):** Add an `escapeHtml()` helper at the interpolation seams, or move to a tagged-template that escapes by default.

### D8 — Gate thresholds hardcoded vs config; persona forks · Code / Architecture · 18
The system advertises "a single config seam for thresholds" but does not use it. `engines/minimaxDojo/core/gates/__init__.py:10–11` hardcodes `DEFAULT_MUTATION_THRESHOLD = 0.65` / `DEFAULT_COVERAGE_THRESHOLD = 0.80` (duplicated in `config/learner.yaml`), and `core/state_machine/__init__.py:23` hardcodes `MAX_RETRIES = 3` (duplicating `max_por_unidade: 3`). Magic numbers (`15` consultas, `24h` SLA, `≤500` tokens, `30%`) are triplicated across `config/learner.yaml`, minimaxDojo prompts, and engine agents. Six Ágora personas are defined twice (minimaxDojo prompts vs `.claude/agents/`), with `sonda` independently rewritten. One persona has three spellings (`08_prometor/` dir, `promotor.md` prompt, `prometor.PASS` events).
**Fix (Effort 3):** Load thresholds from `config/learner.yaml` in the gate/state-machine; make one engine the canonical persona source and have the other reference it; normalize the prometor/promotor spelling.

### D9 — Test quality: vacuous test, god test-file, untested layers · Test · 18
`engines/minimaxDojo/tests/test_config_seam.py:63–66` only validates `⟨config:⟩` references *that exist* — and there are **zero** such references anywhere, so it passes trivially while the convention it guards is 100% unimplemented (false safety, worse than no test). `learner/substrate/tests/test_substrate.py` is a 1,058-line monolith (larger than any module it tests). In the TS engines, the most logic-heavy code is untested: codexDojo `render/learner.ts` (sparkline math) has no test; pixelDojo's 322-line `PixelQuestApp` orchestrator, `WorldRenderer`, `Hud`, and the `registry` dispatcher (~1,500 lines) are covered only indirectly by a single Playwright spec.
**Fix (Effort 3):** Delete or rewrite the vacuous test to assert real gate behavior; split the substrate god-test; add unit tests for the pixelDojo orchestrator and codexDojo render math.

### D10 — pixelDojo encounter duplication + contract drift · Code · 18
`sequenceFlow.ts`, `routeHealth.ts`, and `policyGate.ts` are near-identical structural clones, and all four encounter modules carry a ~30-line near-duplicate `buildEvidence`. More dangerous: `tokenBucket.ts:149–151` hardcodes its pass rule (`goodAdmits >= 8`, rate `<= targetRate * 1.35`) while the *same* values are declared as the unit's `evidence_contract` in `curriculumPack.ts:503–505` — the runtime ignores the declared contract and re-hardcodes constants, so the contract is dead data and the two can silently diverge. Evidence is also delivered via `console.log("EVIDENCE …")` stdout-scraping in all four modules — a fragile, untyped channel.
**Fix (Effort 3):** Extract a common `Encounter` interface + shared `buildEvidence`; drive thresholds from the `evidence_contract`; replace console-scraping with a typed evidence emitter.

### D11 — Committed generated artifacts + tool/session state · Infrastructure · 16
Derived/ephemeral files are tracked as source: `graphify-out/aidevschool-callflow.html` + `GRAPH_REPORT.md` (the `.gitignore` only excludes `graphify-out/cache/`), 11 `.playwright-mcp/page-*.yml` session snapshots, `.omo/run-continuation/*.json`, and a 155 KB `codexdojo-dashboard.png`. `.git` is 142 MB for 1,216 files, implying large blobs in history. On disk, `.opencode` (141 MB) and `graphify-out` (19 MB) are untracked but `.opencode` is not even gitignored.
**Fix:** *Cheap (Effort 1):* extend `.gitignore` and `git rm --cached` the generated/tool-state files and the PNG. *Expensive tail (Effort 4):* rewrite history (`git filter-repo`) to reclaim the 142 MB.

### D12 — Dependency hygiene · Dependency · 16
No Python dependency manifest exists anywhere (no `requirements.txt`/`pyproject.toml`), yet tests `import yaml` (PyYAML) — an undeclared runtime dependency (`engines/minimaxDojo/tests/test_config_seam.py:13`; the engine's `test_phaserunner.py:8`). Reproducibility rests on PyYAML happening to be installed. Minor JS pins: codexDojo's `jsdom: "^29.1.1"` lags its siblings; pixelDojo's `three: "^0.182.0"` uses a caret on a pre-1.0 package that ships breaking changes in minor releases. TS lockfiles (`pnpm-lock.yaml`) are present and good.
**Fix (Effort 2):** Add a `pyproject.toml`/`requirements.txt` declaring PyYAML (+ pin); pin `three` to `~0.182.0`; review the `jsdom` major.

### D13 — Curriculum 3× duplication, mislabeled stubs, Rust god-files · Code / Architecture · 10
Each of the 18 challenges triplicates the same algorithm across `node-impl/`, `go-impl/`, `rust-impl/` with per-impl ad-hoc tests and **no shared parity vectors** — ×3 maintenance and silent-divergence risk. Completeness is uneven and mislabeled: `05_websocket_chat/rust-impl/src/lib.rs` is **4 lines** while siblings are 600–900+; several Rust impls are single-file monoliths (`07_rest_api_auth` 1,081 lines, `02_key_value_store` 996). Node-impl lint configs drift across ESLint generations (`.eslintrc.json` vs `.eslintrc.cjs` vs flat `eslint.config.js`); `golangci.yml` exists in only 2 of 18 Go impls.
**Fix (Effort 4):** Introduce shared language-agnostic parity test vectors per challenge; relabel stubs honestly; split the largest `lib.rs` files into modules; standardize one ESLint flat config and one golangci config.

---

## Phased remediation plan

Designed to run **alongside feature work**, front-loading cheap high-value items and sequencing toward the MVP (one closed learning loop).

### Phase 0 — Quick wins (this week, ~1 day total)
Highest priority-per-effort. All low-risk, mostly mechanical.

- **D1** mark stale docs superseded; name one canonical status doc.
- **D11 (cheap slice)** gitignore + `git rm --cached` generated artifacts, MCP/OMO session state, dashboard PNG.
- **D6** fix or ignore the `.codegraph` absolute symlink.
- **D4** add `.claude/settings.json` registering the briefing hook (or document user-global).
- **D5** add root `conftest.py`/`pyproject.toml` so the Python tests run from a single command.
- **D12** declare the PyYAML dependency.

### Phase 1 — Build the enforcement spine (1–2 weeks)
- **D2** GitHub Actions CI: lint + test + build for both TS engines first, then Go/Rust/Python suites and the substrate. This is the machine that makes every later claim trustworthy and unblocks the project's own "evidence gate" rule.

### Phase 2 — Close one real learning loop (the MVP — alongside features)
- **D3** drive one challenge end-to-end: real attempt → unblock gate → executable-evidence grade → `units_log` review + streak.
- **D8** move gate thresholds into the `config/learner.yaml` seam (the loop should read config, not constants).
- **D9 (part)** replace the vacuous `config_seam` test with a real gate-behavior test that CI now runs.

### Phase 3 — Structural cleanup (ongoing, opportunistic)
- **D10** pixelDojo encounter dedup + contract-driven thresholds + typed evidence channel.
- **D7** codexDojo HTML escaping.
- **D9 (rest)** split the 1,058-line substrate god-test; add pixelDojo orchestrator unit tests.
- **D8 (rest)** single-source the six forked personas; normalize prometor/promotor.
- **D13** curriculum parity vectors, stub relabeling, Rust module splits, lint-config standardization.
- **D11 (tail)** `.git` history rewrite to reclaim 142 MB.

---

## What's healthy (don't "fix" these)

A balanced audit notes the strengths — several are load-bearing and worth protecting:

- **Micro-level code hygiene is excellent.** Strict `tsconfig` (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) + Biome with `noExplicitAny: error` give **zero `any` and zero TODO/FIXME** across both TS engines.
- **Build tooling is current** — Vite 7, Vitest 4, TypeScript 5.9, Biome 2.3, Playwright 1.57; `pnpm-lock.yaml` present in both TS engines.
- **codexDojo architecture is deliberate** — clean `data → progress → render → state → app` layering with a documented query seam; meaningful tests (state transitions, dedup, edge cases) including a jsdom e2e.
- **pixelDojo has a strong e2e gate** — the Playwright spec drives 4 encounter types end-to-end and asserts negative learning-gate conditions (no premature `mastered`, no runtime errors).
- **Build artifacts are correctly ignored** — `dist/`, `node_modules/`, `target/` are not tracked (the problem is *generated reports* and *tool state*, not build output).
- **Substrate symlinks (within engines) are relative** and resolve correctly; only the root `.codegraph` link is non-portable.

---

## Appendix — baseline metrics & verification

**Tree:** 1,216 tracked files. Code LOC by language: Go 17,901 (81 files) · TypeScript 17,607 (176) · Rust 16,359 (55) · Python 6,563 (48) · JS 450 (15). Markdown: 51,473 lines across 407 files (concentrated in `curriculum/` ~179 and `engines/` ~126).
**Tests present:** 25 Go `_test.go`, 12 Rust test files, 51 TS/JS `.test/.spec`, 16 Python `test_*` — present in every language, but unautomated and partly unrunnable (D2/D5).
**Engines (tracked files):** pixelDojo 83 · minimaxDojo 74 · codexDojo 62 · miniMaxEvolutionEngine 44.
**Footprint:** `.git` 142 MB · `.opencode` 141 MB (untracked, not ignored) · `graphify-out` 19 MB (5 files tracked) · `.omo` 9.6 MB.

**Verification:** Every "high"-severity and every load-bearing claim in this report was re-checked against source by a separate pass from the agents that produced it — `units_log`/streak/gate state (learning_state.yaml:55,88–104), the REFACTOR_PLAN "no git" text (line 22), tracked generated artifacts (`git ls-files graphify-out`), the hardcoded gate thresholds (gates/`__init__.py`:10–11), the 4-line Rust stub, and the absence of `.github/`. The scoring axes (Impact/Risk/Effort) are judgment calls and are shown explicitly so they can be contested.
