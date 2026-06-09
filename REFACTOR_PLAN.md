# Refactor & Modernization Plan — AI DevSchool

> Scope: **everything, prioritized** (one sequenced plan across all three layers).
> Constraint: **preserve behavior** unless a functional change is explicitly requested.
> Method: small reviewable passes — each names *current behavior*, *structural improvement*, and *validation check*.
> Aligns with the repo's golden rules (`CLAUDE.md`): producer ≠ verifier, no claims without evidence, filesystem is the source of truth.

---

## 1. Honest assessment (what we're actually refactoring)

The repo is **2.9 GB**, but ~99% is build artifacts (`target/`, `node_modules/`, `coverage/`, `dist/`). The real source is small and splits into three layers with **very different** refactoring intents:

| Layer | What it is | Size | Refactor intent |
|---|---|---|---|
| **A — codexDojo** | The only real application. TypeScript + Vite SPA, Elm-style (state reducer + pure render functions). | ~1,067 LOC, 18 files | True behavior-preserving code refactor, validated by build + tests |
| **B — curriculum impls** | `01_rate_limiter` reference solutions in Go, Node/TS (694 LOC), Rust + Python/k6 benchmarks. | 3 impls | Teaching artifacts — refactor for clarity/parity, **not** to over-engineer |
| **C — docs/agent ecosystem** | 193 `.md` files (120 under `engines/`): 9 `AGENTS.md`, 2 `CLAUDE.md`, 30 `README.md`, prompts, agent specs. | 193 md | Content consolidation, not code refactoring |

**The key truth:** this is **not** a crusty legacy codebase. The app (`codexDojo`) is new (Jun 4), type-clean (`tsc --noEmit` passes), and already on current tooling (Vite 7, TS 5.9 strict, Biome 2, Vitest 4). There are **zero** `TODO/FIXME/DEPRECATED/legacy` markers in the real code. The friction that "slows changes down" lives in:

1. **No safety net** — no git anywhere in the tree, and only **one** test file in the app.
2. **Sprawl in layers B and C** — 3× duplicated reference logic, a nested `AGENTS.md` convention system with repeated boilerplate, a 71 KB single-file doc (`docs/PROMPTS/00_IDEIAS.md`), and a legacy symlink compatibility shim.
3. **Platform-coupled install** — the committed-by-default `node_modules` carries macOS-only native binaries (Biome/Rollup), so `lint`/`test` break on any other OS or in CI.

This plan therefore front-loads the **safety net**, then sequences passes by **leverage ÷ risk**.

---

## 2. Preconditions (Pass 0 — before any refactor)

Nothing below ships until these exist. They are what make "behavior preserved" a provable claim instead of an assertion.

### Pass 0.1 — Version control + ignore build artifacts
- **Current behavior:** no git; the working tree mixes source with 2.9 GB of artifacts; no diffs, no rollback.
- **Structural improvement:** `git init`, add a `.gitignore` covering `target/`, `node_modules/`, `.pnpm/`, `dist/`, `coverage/`, `*.profraw`, `.DS_Store`; baseline commit of source only.
- **Validation:** `git status` clean; `du -sh` of tracked files drops from 2.9 GB to single-digit MB; every subsequent pass is exactly one reviewable commit.

### Pass 0.2 — Green, portable baseline
- **Current behavior:** `tsc --noEmit` passes; `biome` and `vitest` fail off-macOS due to missing native binaries (`@biomejs/cli-linux-*`, `@rollup/rollup-linux-*`).
- **Structural improvement:** clean reinstall from lockfile so `lint`/`test`/`build` run on a stock machine + CI; record exact commands and current pass/fail per package in `docs/BASELINE.md`.
- **Validation:** `pnpm install && pnpm lint && pnpm test && pnpm build` all green on a fresh checkout; captured as the reference baseline.

### Pass 0.3 — Characterization tests for codexDojo (the parity harness)
- **Current behavior:** only `src/progress.test.ts` exists (43 lines). The reducer (`reduceState`, 6 actions) and all 8 render functions are **untested** — so render refactors can't currently be proven safe.
- **Structural improvement:** add (a) unit tests for `reduceState` covering every `AppAction` variant and `advanceStage` edge cases, and (b) **snapshot tests** of each render function for `initialState` + a few representative states.
- **Validation:** new tests pass against current `main`; coverage of `state.ts` + `render/` rises from ~0 to high. These snapshots become the byte-level oracle for Track A.

> Producer ≠ verifier: the characterization suite is written **against current behavior first** (captures what *is*, not what *should be*), so later passes that change structure but not output keep the snapshots green.

---

## 3. Track A — codexDojo (behavior-preserving code refactor)

Public API to keep stable throughout: `mountCodexDojo(root)` and `AppMountError` (consumed by `main.ts`). All passes below are gated by Pass 0.3 snapshots + `tsc` + `biome`.

### A1 — Dead-code & unused-export sweep
- **Current behavior:** `tsc` flags unused *locals/params* but **not** unused cross-file *exports*; some exported types/helpers may be unreferenced (e.g., verify `Metric`, `DashboardStats`, `assertNever` usage).
- **Structural improvement:** run `knip` (or `ts-prune`) to find unreferenced exports/files; delete what's truly dead.
- **Validation:** `knip` reports zero unused; `tsc` + tests green; diff is deletions only.
- **Risk:** low.

### A2 — Extract shared render helpers (the biggest DRY win)
- **Current behavior:** the `render/` layer hand-builds HTML with three repeated patterns: the active-class ternary (`x === y ? "is-active" : ""`) in `nav.ts`, `agents.ts`, `cycle.ts`, `roadmap.ts`; `.map(...).join("")` list-building in nearly every file; and **raw** interpolation of data into `innerHTML` with no escaping (safe today only because data is static/trusted).
- **Structural improvement:** add a tiny `render/html.ts` with `classNames(...)`, `active(flag)`, `list(items, fn)`, and an `escape()` helper; route render functions through them. Keep output identical (escaping is a no-op on current trusted data; document it as defense-in-depth).
- **Validation:** snapshot tests byte-identical before/after; `tsc` + `biome` green.
- **Risk:** low–medium (snapshots are the guardrail).

### A3 — Move hardcoded content out of `project.ts` into the data layer
- **Current behavior:** `render/project.ts` hardcodes functional/non-functional requirements and two extra "Definition of Done" `<li>` items as literal HTML, while related data lives in `data/projects.ts` — content split across view + data.
- **Structural improvement:** lift those literals into `data/projects.ts` (or a `data/projectBriefing.ts`) as typed fields; `project.ts` renders from data only.
- **Validation:** snapshot of the `project` view identical; `tsc` green.
- **Risk:** low.

### A4 — Split the oversized `overview.ts`
- **Current behavior:** `render/overview.ts` (89 LOC — largest render file) builds six unrelated sections (command panel, status console, topology, next-project, metric strip, cycle strip) in one function.
- **Structural improvement:** extract one small pure helper per section; `renderOverview` composes them.
- **Validation:** snapshot identical; each helper independently testable; `tsc` green.
- **Risk:** low.

### A5 — Co-locate selectors / tidy module boundaries
- **Current behavior:** `state.ts` holds the reducer **and** the `getFilteredProjects` selector; lookups (`findAgent`, `findStage`) live in `progress.ts`. Selector logic is split across two modules.
- **Structural improvement:** move `getFilteredProjects` next to the other selectors in `progress.ts` (or a `selectors.ts`); `state.ts` keeps state + reducer only.
- **Validation:** `tsc` + tests green; no import cycles (verify with `madge`/`knip`).
- **Risk:** low.

> **Explicitly NOT in Track A** (see §6): converting `app.ts`'s full-`innerHTML` re-render + event re-bind into incremental DOM. That changes focus/scroll/event identity semantics — an architecture move, not a refactor.

---

## 4. Track B — curriculum reference implementations

Intent differs: these are **exemplars learners read and compare**. The bar is "clear, idiomatic, green, consistent across languages" — not maximal abstraction. Refactor conservatively.

### B1 — Per-impl green baseline
- **Current behavior:** Go/Node/Rust impls + benchmarks exist; no recorded pass/fail; node-impl ships a `coverage/` dir (build output) in source.
- **Structural improvement:** record `go test ./...`, `cargo test`, `vitest run` status per impl in `docs/BASELINE.md`; gitignore `coverage/`.
- **Validation:** all three suites green from clean checkout.
- **Risk:** low.

### B2 — Cross-language behavioral parity spec + shared test vectors *(artifact to create — see §7)*
- **Current behavior:** three implementations of the *same* token-bucket rate limiter, each with its own ad-hoc tests; no shared definition of correct behavior, so they can silently diverge.
- **Structural improvement:** write one language-agnostic spec (`curriculum/01_rate_limiter/SPEC.md`) + a table of black-box scenario vectors (requests → expected allow/deny/headers); add a thin test in each language that runs the shared vectors.
- **Validation:** all three impls pass the identical vector table; divergences surface as failures, not surprises.
- **Risk:** low (additive).

### B3 — Conservative per-impl hygiene
- **Current behavior:** normal small inconsistencies (naming, dead branches) likely present per impl.
- **Structural improvement:** language-local dead-code + naming cleanup **only where it improves readability for a learner**.
- **Validation:** each impl's own suite + the §B2 shared vectors stay green.
- **Risk:** low.

> Dependency upgrades for node-impl (`express 4`, `eslint 8`, `zod 3`, `ts-node`) are **migrations**, not hygiene — see §6 M1.

---

## 5. Track C — docs / agent ecosystem (consolidation)

### C1 — De-bloat repo (folds into Pass 0.1)
- **Current behavior:** build artifacts dominate the tree.
- **Structural improvement:** `.gitignore` enforced; one-time check that no artifacts are tracked.
- **Validation:** tracked size is source-only.

### C2 — Normalize the `AGENTS.md` convention system
- **Current behavior:** 9 `AGENTS.md` are **distinct per directory** (a deliberate nested-context system), but likely share repeated boilerplate/section scaffolding.
- **Structural improvement:** define one canonical template + a short "required sections" checklist; keep each file's directory-specific deltas, remove copy-paste boilerplate by referencing the root.
- **Validation:** a lint script confirms every `AGENTS.md` has the required sections and no stale cross-references; root `AGENTS.md` remains the single source for shared rules.
- **Risk:** low (no code impact).

### C3 — Split oversized docs
- **Current behavior:** `docs/PROMPTS/00_IDEIAS.md` is **71 KB** in one file — hard to navigate or diff.
- **Structural improvement:** split by theme into `docs/PROMPTS/IDEIAS/` with an index; preserve all content and anchors.
- **Validation:** no content lost (word-count/diff check); internal links resolve.
- **Risk:** low.

### C4 — Decide the legacy symlink shim *(judgment call — flag, don't auto-remove)*
- **Current behavior:** root symlinks `projects→curriculum`, `.agora→learner`, `learning_journal.md→learner/journal.md`, `project_proposal.md→curriculum/catalog.md` exist purely for "legacy platforms" (per `CLAUDE.md`).
- **Structural improvement:** confirm whether any tool still reads the old paths; if not, remove the shim; if yes, document which consumer needs each.
- **Validation:** grep configs/scripts for the old paths; removal only after a consumer audit comes back empty.
- **Risk:** medium (external consumers) — **needs your decision**.

### C5 — Resolve the `minimaxDojo` skeleton *(flag)*
- **Current behavior:** `engines/minimaxDojo/{src,core,tests}` contain **only `README.md` placeholders** — a spec skeleton, not running code, despite an 80-file agent doc set.
- **Structural improvement:** decide per the project goal (memory note: *"fábrica rodou, escola não — close one real learning loop"*) — either implement the skeleton or clearly label it `STATUS: spec/placeholder` so it isn't mistaken for code.
- **Validation:** directory intent is unambiguous to a new reader.
- **Risk:** low — **needs your decision**.

---

## 6. Separate migration tasks (NOT refactor passes)

These change behavior, dependencies, or architecture. Each gets its **own branch, its own parity check, and its own review** — never folded into a behavior-preserving pass.

| ID | Migration | Why separate | Parity check |
|---|---|---|---|
| **M1** | node-impl deps: `express 4→5`, `eslint 8→9` (flat config), `zod 3→4`, `ts-node→tsx` | Breaking-change surface; runtime behavior can shift | §B2 shared vectors + node-impl suite green pre/post |
| **M2** | codexDojo render architecture: full-`innerHTML` re-render → incremental/DOM-diff | Changes focus, scroll, selection, event identity | Snapshot parity + manual interaction checklist (focus/scroll retained) |
| **M3** | Toolchain unification across engines (one Biome + tsconfig baseline; consider a pnpm workspace) | Cross-package structural move; affects all builds | Every package's lint/test/build green on shared config |
| **M4** | Portable installs / CI (kill the macOS-only `node_modules` coupling; add CI matrix) | Infra change; precondition for trustworthy validation | `lint`+`test`+`build` green on Linux CI from clean checkout |

---

## 7. Artifacts to create *before* implementation

Per the request — the specs/parity checks that must exist first:

1. **`REFACTOR_PLAN.md`** (this file) — the tracking doc; check off passes as commits land.
2. **`docs/BASELINE.md`** — exact build/lint/test commands + current green/red per package (Pass 0.2).
3. **codexDojo characterization suite** — reducer unit tests + render snapshots (Pass 0.3); the parity oracle for Track A.
4. **`curriculum/01_rate_limiter/SPEC.md` + shared test vectors** — cross-language behavioral parity (B2); the oracle for Track B and M1.
5. **`docs/CONVENTIONS.md`** — the "current conventions" the modernization aligns to (tsconfig strictness, Biome rules, naming), so "modern" is defined, not implied.
6. **`AGENTS.md` template + section checklist** — the canonical form for C2.

---

## 8. Sequencing (leverage ÷ risk)

```
Pass 0  (safety net)        ── blocks everything ──┐
  0.1 git + .gitignore                             │
  0.2 portable green baseline                      │
  0.3 codexDojo characterization tests             │
                                                   ▼
Track A (app refactor)   A1 → A2 → A3 → A4 → A5    ← highest leverage, lowest risk
Track C (cheap wins)     C1, C2, C3 (parallel to A; no code risk)
Track B (curriculum)     B1 → B2 → B3
Decisions (you)          C4 symlinks, C5 minimaxDojo
Migrations (own branches) M4 (CI first) → M1, M3 → M2 (last; riskiest)
```

Rationale: the safety net unblocks honest validation; Track A is small, clean, and high-traffic; Track C wins (especially de-bloat) are nearly free; curriculum and migrations carry more risk and wait behind the harness. M2 (render architecture) is last because it's the only change that can alter user-observable behavior.

---

## 9. Validation philosophy (applied to every pass)

- **One pass = one commit** with a green `before` and green `after` (`tsc` + `biome` + `vitest`, plus `go test`/`cargo test` for Track B).
- **Snapshots/vectors are the oracle** — structure changes, output doesn't. A red snapshot means either a real regression or an intentional, documented diff.
- **Producer ≠ verifier** — characterization tests are written against current behavior *before* refactoring; a separate review (or `/simplify` on the diff, per `CLAUDE.md`) gates the commit.
- **No claim without evidence** — "behavior preserved" = green parity oracle in the diff, not an assertion. Migrations (§6) get explicit parity checks because their oracle is weaker.

---

### Open decisions for you
1. **C4** — are the legacy symlinks (`projects`, `.agora`, `project_proposal.md`, `learning_journal.md`) still consumed by anything? If not, remove.
2. **C5** — implement `minimaxDojo`, or label it as a spec placeholder?
3. **Start point** — I recommend executing **Pass 0** first (git + baseline + characterization tests) and stopping there for review before any Track A change.
