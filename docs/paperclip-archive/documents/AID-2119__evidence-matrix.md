<!-- issue: AID-2119 | key: evidence-matrix | doc_id: ec8ad80b-16da-42ca-9f07-98ed910b6580 | updated: 2026-09-16 13:34:55.531+00 -->

# EVIDÊNCIA — matriz engines × casos de uso × status (AID-2104)

(AID-2119)

# EVIDÊNCIA — matriz engines × casos de uso × status (campanha AID-2104)

> Mantenedor: Verifier & Evidence Engineer (AID-2119). Snapshot: **2026-09-16 13:33Z (v4)**.
> Fontes: comentários-recibo das issues filhas (AID-2105..AID-2125), GitHub API (`dandpb/aidevschool`), execução direta `[VEE-VERIFY]`.
> Regra de ouro: todo status abaixo cita comando executado + resultado verificável + PR (quando houver).
> Espelho no parent AID-2104 anexado pelo CEO (13:0xZ, v3.1); **esta cópia (AID-2119) é a autoritativa** — refresh do espelho a cargo do CEO/FPE.

## 1. Baseline do repo (pytest full)

| Quando | Onde | Resultado | Fonte |
| --- | --- | --- | --- |
| ~12:2xZ `[VEE-VERIFY]` | `origin/main @ df7d7d8` (pré-merge) | **18 failed, 1023 passed, 1 skipped** — todas as falhas em `docs/product-readiness/tests` (shadowing `sys.modules['tools']`) | execução VEE neste checkout |
| ~12:2xZ `[VEE-VERIFY]` | PR **#438** head `8dac44a5` | **1040 passed, 2 skipped** — reproduz o baseline do CEO (1037→1040) | execução VEE |
| 12:43Z (recibo AID-2109) | `main @ df7d7d8` | 4 failed, 1037 passed, 1 skipped (falhas em `docs/product-readiness/tests/test_check_determinism.py`) | recibo agente AID-2109 |
| **12:47:48Z** | **PR #438 MERGED** → main HEAD **`9d00e312`** | fim do main RED | GitHub API |
| 13:06Z (recibo AID-2110) | `main @ 9d00e312` | **1041 passed, 1 skipped** (main avançou: +1 pass/−1 skip; D9 skip intencional documentado) | recibo agente AID-2110 |
| 13:17Z (recibo AID-2111) | `main @ 9d00e312` | **1041 passed, 1 skipped** — confirma novo baseline | recibo agente AID-2111 |
| 13:33Z `[VEE-VERIFY]` | GitHub API `branches/main` | main HEAD **ainda `9d00e312`**; `product readiness (claims)` **FAILING** (job `104801369684`, run `35097920900`, conclusion=failure) → **defect-open persiste** | GitHub API check-runs/jobs |

Nota: a diferença 18×1023 (VEE) vs 4×1037 (AID-2109) no mesmo commit `df7d7d8` mostra sensibilidade de ambiente nos testes de `docs/product-readiness` (mesmo total 1041 coletados); causa-raiz comum `sys.modules['tools']` fixada pelo PR #438. A falha residual de `product readiness (claims)` no pós-merge **permanece sem issue filha cobrindo** — ver Gaps §4.1.

## 2. Matriz engines × casos de uso × status

| Issue | Engine / superfície | Status | Evidência (comando → resultado; PR) |
| --- | --- | --- | --- |
| AID-2105 | codexDojo (dashboard pnpm) | **FIXED-IN-PR #441** (in_review) | `pnpm run lint` biome 47 arquivos clean; `pnpm run test` vitest **89/89** (18 files); `pnpm run build` tsc+vite OK — main `df7d7d8`. **PR #441** (docs, MANIFEST phantom refs, head `0f38e87b`) open/clean, 32 checks green; aguarda FPE (merge 405 p/ agente) |
| AID-2106 | codexdojo-os-prototype | **RECEIPT-PENDING** (in_progress) | **sem nenhum comentário no thread** (0 comentários, upd 12:23Z) — alvo prioritário do tracker |
| AID-2107 | literacyDojo (npm app) | **GREEN** (done 12:56Z) | recibo 12:56Z: `npm run gen:content` OK 32 lições; `npm run lint` biome **106 arquivos/0 erros**; `npm run test` vitest **243/243** (32 files); `npm run build` tsc+vite OK (warning 500kB informativo) — main `df7d7d82` |
| AID-2108 | dojoToday (substrate+app) | **GREEN** (done 12:14Z) | `python3 -m learner.substrate` exit 0, 31 projeções, determinístico (sha `c21aee84…` ×2 runs), `--check` in-sync; pipeline npm + Playwright 23 passed |
| AID-2109 | aiDevschoolMvp (chat-tutor) | **GREEN** (done 12:43Z) | `pytest engines/aiDevschoolMvp/tests -q` → **46 passed**; repo-root pré-#438: 4 failed/1037 passed (docs/product-readiness) |
| AID-2110 | minimaxDojo (tutor core) | **GREEN** (done 13:06Z) | recibo 13:06Z: `pytest engines/minimaxDojo/tests` (= `make test-core`) → **51 passed, 1 skipped** (D9 intencional); repo-root **1041/1** — main `9d00e312`, sem code change |
| AID-2111 | miniMaxEvolutionEngine | **GREEN + FIXES-IN-PR** (done 13:17Z) | recibo 13:17Z: suítes engine **122 passed** (main) / **137 passed** (branch PR #440); bug briefing engine-rooted (`ModuleNotFoundError: engines`) main exit 1 → corrigido no PR; **PRs #440 + #445 (docs) open** aguardando FPE; repo-root 1041/1 |
| AID-2112 | openclaw (runner/scheduler) | **GREEN** (done; CEO verify 12:41Z) | `python3 -m engines.openclaw --phase spec --project curriculum/01_rate_limiter --mode simulate` → 5 fases PASS + idempotência; `pytest engines/openclaw/tests` **23/23** EXIT=0 — main `df7d7d8` |
| AID-2113 | pixelDojo (engine 2D) | **FIXED-IN-PR #444** (in_review 13:06Z) | recibo 13:06Z: lint biome 63 arquivos clean; vitest **113/113**; typecheck ok; build ok; **smoke oficial FAIL 0/5 (ambiental)** — load 35–44 em 4 cores compartilhados + porta fixa 4176 (`reuseExistingServer` testou código alheio); diagnóstico `CI=1 --workers=1 --timeout=180000` → **5/5 specs PASS** + `evidence.ndjson` 6 registros `pass:true`; **PR #444** (parameteriza `PIXELQUEST_PORT/TIMEOUT_MS/WORKERS` + `--strictPort`) — nenhum bug de produto |
| AID-2114 | voxelDojo (catálogo 3D) | **GREEN** (done 12:49Z) | catalog-wide: lint biome 241 arquivos clean; test **381/0** (17 pkgs `game-*`); typecheck 17/17; build OK; smoke game-10 (`NODE_ENV=development` requerido) — main `df7d7d8`, sem code change |
| AID-2115 | shared + curriculum canônico | **FIXED-IN-PR #443** (in_review 13:15Z) | recibo 13:02Z: `pytest curriculum` main **1 failed/148 passed** → fix **148 passed, 1 skipped**; `validate.py` OK 32 lições; literacyDojo `gen:content` zero drift pós-regen; **PR #443** (`fix/aid-2104-benchmarks-bridge-local-artifacts`, +9/−1, trailer `SDLC-ALLOW-TEST-EDIT: AID-2115`) CI rodando no recibo |
| AID-2116 | learner/substrate | **GREEN** (done 13:06Z) | recibo 13:05Z (CEO run `8919b99b`): `make test-substrate` → **199 passed/0 failed** (60.6s); `python3 -m learner.substrate --check` exit 0 "in sync" (0 invariantes, 0 drift); regen determinística — main `9d00e312`. Unblock consumido: issue restaurada e concluída |
| AID-2117 | DOCS mapas engines | **FIXED-IN-PR #439** (in_review) | **PR #439** (remove entrada fantasma `engines/zai-duolingo-like/` — gitlink pendurado sem `.gitmodules`, não restaurável; head `3dab7df4`) open/clean, superfície docs 60 passed/1 skipped; aguarda FPE |
| AID-2118 | QA re-verificação | **AGUARDA AMOSTRAGEM** (in_progress, por design) | depende dos recibos desta matriz (0 comentários ainda; upd 11:51Z) |
| AID-2120 | DESIGN conformança | **RECEIPT-PENDING** (in_progress) | sem recibo de agente no thread (upd 12:27Z); worktree local com edits em `codexdojo-os-prototype/src/styles/*` observados pelo VEE (não verificados) |
| AID-2121 | UX jornadas | **IN-REVIEW c/ PR #446** (13:31Z) | recibo 13:26Z: pixelDojo lint 63/0, vitest **113/113**, typecheck, build, smoke **5/5** + readiness `pixelquest-encounter-ev*`; base main `9d00e312`; **PR #446**; `done` após merge ou veredito QA relay |
| AID-2122 | CONTENT-DESIGN literacyDojo | **RECEIPT-PENDING** (in_progress) | sem recibo de agente no thread (upd 13:01Z); reativado pelo CEO 13:0xZ |
| AID-2123 | CONTENT integridade curriculum | **GREEN** (done 13:05Z) | recibo 13:05Z: `validate.py` → OK **32 lições ready** (23 IA na Prática, 9 Dev); `pytest curriculum/ai-literacy/tools/tests/` → **42 passed**; catálogo↔arquivos 32==32 **sem órfãos**; branch criada **sem delta** (nenhum bug de conteúdo) — main `df7d7d82` |
| AID-2124 | SDLC tracker da campanha | **ATIVO** (in_progress) | baseline v3 12:56Z (7/21 recibos); próximo checkpoint 14:28Z |
| AID-2125 | miniTown (town-sim level-0) | **GREEN** (done; CEO 11:55Z) | vitest **31/31** + smoke 1 passed + explore-only 0 hits (pnpm 9.15.9/node 24.18.0); reassign CEO por bug AID-871 |

(AID-2127 `probe — remover` é backlog de limpeza, fora do escopo funcional da campanha.)

## 3. Placar (22 filhas; snapshot 13:33Z)

- **Recibos com evidência determinística: 15/22**
  - **GREEN done: 10** — 2107, 2108, 2109, 2110, 2111*, 2112, 2114, 2116, 2123, 2125 (*2111 com fixes ainda em PR).
  - **FIXED-IN-PR / in_review: 5** — 2105 (#441), 2113 (#444), 2115 (#443), 2117 (#439), 2121 (#446) — aguardando review/merge FPE (single-writer até R1).
- **RECEIPT-PENDING: 3** — 2106 (thread 0 comentários), 2120, 2122 (+2118 QA aguarda por design).
- **BLOCKED: 0** (AID-2116 desbloqueada e concluída 13:06Z).
- **PRs da campanha:** #438 **merged** 12:47:48Z (main RED→green exceto 1 check); **#439, #440, #441, #443, #444, #445, #446 open** aguardando FPE.

## 4. Gaps (ação → dono)

1. **`product readiness (claims)` FAILING no main `9d00e312`** — re-verificado 13:33Z via GitHub API (job 104801369684, conclusion=failure); persiste desde o pós-merge #438 **sem issue filha cobrindo**. Dono sugerido: FPE/QA abrir issue de defeito.
2. **7 PRs open** (#439, #440, #441, #443, #444, #445, #446) aguardando merge do FPE (política single-writer até R1).
3. **3 issues sem recibo** (2106, 2120, 2122) — SLA acompanhado pelo tracker AID-2124 (checkpoint 14:28Z); AID-2106 é a mais crítica (nenhum sinal de vida no thread).
4. **AID-2127** (probe backlog) — limpeza pendente, dono CEO.

---
**Local de publicação:** doc `evidence-matrix` na issue AID-2119 (autoritativo; boundary impede o VEE de anexar no parent — espelho v3.1 no parent AID-2104 anexado pelo CEO, precisa de refresh para v4).

Histórico: v1 (comentário 12:25Z) → v2 delta (12:29Z) → v3.1 doc rev `ec8ad80b` (13:05Z) → **v4 (13:33Z, este documento)**.
