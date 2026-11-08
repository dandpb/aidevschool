<!-- issue: AID-2104 | key: evidence-matrix | doc_id: 7089e303-9403-496b-9cb8-f4f798087855 | updated: 2026-09-16 13:29:12.466+00 -->

# EVIDÊNCIA — matriz engines × casos de uso × status (AID-2104)

(AID-2104)

> **Espelho autoritativo:** publicado e mantido pelo VEE na issue AID-2119 (doc `evidence-matrix`, rev 13:02Z). Cópia anexada ao parent AID-2104 pelo CEO (watchdog AID-2128) para cumprir o contrato da AID-2119 — boundary de autorização impede o VEE de anexar aqui.

# EVIDÊNCIA — matriz engines × casos de uso × status (campanha AID-2104)

> Mantenedor: Verifier & Evidence Engineer (AID-2119). Snapshot: **2026-09-16 ~13:05Z**.
> Fontes: comentários-recibo das issues filhas (AID-2105..AID-2125), GitHub API (`dandpb/aidevschool`), execução direta `[VEE-VERIFY]`.
> Regra de ouro: todo status abaixo cita comando executado + resultado verificável + PR (quando houver).

## 1. Baseline do repo (pytest full)

| Quando | Onde | Resultado | Fonte |
| --- | --- | --- | --- |
| ~12:2xZ `[VEE-VERIFY]` | `origin/main @ df7d7d8` (pré-merge) | **18 failed, 1023 passed, 1 skipped** — todas as falhas em `docs/product-readiness/tests` (shadowing `sys.modules['tools']`) | execução VEE neste checkout |
| ~12:2xZ `[VEE-VERIFY]` | PR **#438** head `8dac44a5` | **1040 passed, 2 skipped** — reproduz o baseline do CEO (1037→1040) | execução VEE |
| 12:43Z (recibo AID-2109) | `main @ df7d7d8` | 4 failed, 1037 passed, 1 skipped (falhas em `docs/product-readiness/tests/test_check_determinism.py`) | recibo agente AID-2109 |
| **12:47:48Z** | **PR #438 MERGED** → main HEAD **`9d00e312`** | fim do main RED | GitHub API |
| 13:0xZ `[VEE-VERIFY]` | CI do commit `9d00e312` | **39/40 checks green; `product readiness (claims)` FAILING** → **defect-open** (job `35097920900/job/104801369684`) | GitHub API check-runs |

Nota: a diferença 18×1023 (VEE) vs 4×1037 (AID-2109) no mesmo commit `df7d7d8` mostra sensibilidade de ambiente nos testes de `docs/product-readiness` (mesmo total 1041 coletados); causa-raiz comum `sys.modules['tools']` fixada pelo PR #438. A falha residual de `product readiness (claims)` no pós-merge **não está coberta por issue filha aberta** — ver Gaps.

## 2. Matriz engines × casos de uso × status

| Issue | Engine / superfície | Status | Evidência (comando → resultado; PR) |
| --- | --- | --- | --- |
| AID-2105 | codexDojo (dashboard pnpm) | **GREEN + fix pendente de merge** (in_review) | `pnpm run lint` biome 47 arquivos clean; `pnpm run test` vitest **89/89** (18 files); `pnpm run build` tsc+vite OK — main `df7d7d8`. **PR #441** (docs, MANIFEST phantom refs, head `0f38e87b`) open/clean, 32 checks green; aguarda FPE (merge 405 p/ agente) |
| AID-2106 | codexdojo-os-prototype | **RECEIPT-PENDING** (in_progress) | sem recibo; sem comentário de agente no thread |
| AID-2107 | literacyDojo (npm app) | **RECEIPT-PENDING** (in_progress) | sem recibo; sem comentário no thread |
| AID-2108 | dojoToday (substrate+app) | **GREEN** (done 12:14Z) | `python3 -m learner.substrate` exit 0, 31 projeções, determinístico (sha `c21aee84…` ×2 runs), `--check` in-sync; pipeline npm + Playwright 23 passed |
| AID-2109 | aiDevschoolMvp (chat-tutor) | **GREEN** (done 12:43Z) | `pytest engines/aiDevschoolMvp/tests -q` → **46 passed**; repo-root pré-#438: 4 failed/1037 passed (docs/product-readiness) |
| AID-2110 | minimaxDojo (tutor core) | **RECEIPT-PENDING** (in_progress) | sem recibo; 2 recovery actions (12:20Z, 12:39Z), unblock CEO |
| AID-2111 | miniMaxEvolutionEngine | **RECEIPT-PENDING** (in_progress) | sem recibo; recovery action 12:31Z, unblock CEO |
| AID-2112 | openclaw (runner/scheduler) | **GREEN** (done; CEO verify 12:41Z) | `python3 -m engines.openclaw --phase spec --project curriculum/01_rate_limiter --mode simulate` → 5 fases PASS + idempotência; `pytest engines/openclaw/tests` **23/23** EXIT=0 — main `df7d7d8` |
| AID-2113 | pixelDojo (engine 2D) | **RECEIPT-PENDING** (in_progress) | sem recibo; recovery action 12:02Z, unblock CEO |
| AID-2114 | voxelDojo (catálogo 3D) | **GREEN** (done 12:49Z) | catalog-wide: lint biome 241 arquivos clean; test **381/0** (17 pkgs `game-*`); typecheck 17/17; build OK; smoke game-10 (`NODE_ENV=development` requerido) — main `df7d7d8`, sem code change |
| AID-2115 | shared + curriculum canônico | **RECEIPT-PENDING** (in_progress) | sem recibo; sem comentário no thread |
| AID-2116 | learner/substrate | **BLOCKED** (12:47Z) | sem recibo; recovery owner CEO (adapter_failed); substrato em si validado indiretamente por AID-2108 |
| AID-2117 | DOCS mapas engines | **FIXED-IN-PR** (in_review) | **PR #439** (remove entrada fantasma `engines/zai-duolingo-like/` — gitlink pendurado sem `.gitmodules`, não restaurável; head `3dab7df4`) open/clean, superfície docs 60 passed/1 skipped; aguarda FPE |
| AID-2118 | QA re-verificação | RECEIPT-PENDING (aguarda amostragem) | depende dos recibos desta matriz |
| AID-2120 | DESIGN conformança | **RECEIPT-PENDING** (in_progress) | sem recibo; recovery action 12:20Z, unblock CEO |
| AID-2121 | UX jornadas | **RECEIPT-PENDING** (in_progress) | sem recibo; recovery action 12:00Z, unblock CEO |
| AID-2122 | CONTENT-DESIGN literacyDojo | **RECEIPT-PENDING** (in_progress) | sem recibo; recovery action 12:52Z (a mais recente), unblock CEO |
| AID-2123 | CONTENT integridade curriculum | **RECEIPT-PENDING** (in_progress) | sem recibo; sem comentário no thread |
| AID-2124 | SDLC tracker da campanha | **ATIVO** (in_progress) | sweep 12:33Z (3 done/15 running/1 in_review); monitor armado 14:28Z |
| AID-2125 | miniTown (town-sim level-0) | **GREEN** (done; CEO 11:55Z) | vitest **31/31** + smoke 1 passed + explore-only 0 hits (pnpm 9.15.9/node 24.18.0); reassign CEO por bug AID-871 |

(AID-2127 `probe — remover` é backlog de limpeza, fora do escopo funcional da campanha.)

## 3. Placar

- **Recibos com evidência determinística: 7/21** — GREEN done: 2108, 2109, 2112, 2114, 2125 (5); FIXED-IN-PR aguardando FPE: 2105 (#441), 2117 (#439) (2).
- **RECEIPT-PENDING: 11** — 2106, 2107, 2110, 2111, 2113, 2115, 2118(QA), 2120, 2121, 2122, 2123.
- **BLOCKED: 1** — 2116 (unblock CEO).
- PRs de fix da campanha: **#438 merged** (12:47:48Z, main RED→green exceto 1 check); **#439, #441 open/clean** aguardando FPE (single-writer até R1).

## 4. Gaps (ação → dono)

1. **`product readiness (claims)` FAILING no main `9d00e312`** pós-merge #438 — sem issue filha cobrindo. Dono sugerido: FPE/QA abrir issue de defeito (evidência: check-run no commit `9d00e312`, job 35097920900/104801369684).
2. **10 issues sem recibo** (2106, 2107, 2110, 2111, 2113, 2115, 2120, 2121, 2122, 2123) — maioria vítima de `adapter_failed` (recovery owner CEO). SLA acompanhado pelo tracker AID-2124.
3. **AID-2116 blocked** — unblock CEO (restaurar live path ou reassign).
4. **PRs #439/#441** aguardando merge do FPE (política single-writer).

---
**Local de publicação:** doc `evidence-matrix` na issue AID-2119 (boundary de autorização impede o VEE de anexar doc/comentário no parent AID-2104 — anexo no parent fica a cargo do CEO/FPE, conteúdo pronto acima, sem edição necessária).

Atualizações desta matriz: via AID-2119. Próxima refresh: quando novos recibos pousarem ou no checkpoint do tracker 14:28Z.
