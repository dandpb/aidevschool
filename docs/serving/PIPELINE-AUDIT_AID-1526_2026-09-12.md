# Auditoria do pipeline de promoção + CI — AID-1526 (2026-09-12)

**Autor:** Platform & Release Engineer (onboarding, plano AID-1521). **Escopo:** pipeline
draft→precheck→alias (2 superfícies live), CI de PR/main e observabilidade básica. **Método:**
leitura first-hand de `docs/serving/*`, receipts de onda (`_work-products/AID-935/…`),
`.github/workflows/ci.yml` + `readiness-regrant.yml`, e medição de tempos reais via GitHub API
(runs de 2026-09-12). Nenhum deploy, alias ou conta foi tocado (read-only).

## 1. O que o pipeline é hoje (estado observado)

| Etapa | Como roda | Dono | Evidência |
| --- | --- | --- | --- |
| Gates de entrada | QA GO no sha → merge single-writer → CI verde no pin → autorização founder | QA / CEO / founder | `PROMOTION-RUNBOOK.md` §1 |
| Pin | `release/<sha-curto>` + `sourceRevision` no manifest | FPE | receipts AID-935 §Pin |
| Build | worktree limpo detached no pin; env pins espelhados do `netlify.toml` do pin | FPE | AID-935 §Pin e build |
| Draft (staging efêmero) | `deploy-pilot-bundle.mjs` (OS) / CLI `--no-build` (literacy), sem `--prod` | FPE | runbook §4 |
| Precheck | script da onda copiado/adaptado da onda anterior, **72 checks** na âncora AID-935, contra draft **e** alias | FPE | `_work-products/AID-935/precheck-65d64bca.mjs` |
| Alias `--prod` | somente com precheck 100% verde nos 2 alvos | FPE + autorização founder | runbook §5 |
| Pós-deploy | 2× POST dedup, export bearer, 401/403, manifest == pin; receipt na issue da onda | FPE (QA re-verifica) | runbook §5.2–5.3 |
| Rollback | rebuild no pin anterior + re-precheck + receipt | FPE | runbook §6 |

**Os 72 checks (cobertura por família):** identidade manifest/`sourceRevision`/sha de superfície;
20 páginas 200; env pins same-origin + endpoint de telemetria baked; `/privacidade.html` 200 com
copy de telemetria; coletor cross-origin 403; export fail-closed (401 com token armado / 404 sem);
smoke de ingestão same-origin 202 (OS v1 + literacy v2, eventId UUID); envelope inválido 422;
bridges de verificação preservadas; catálogo uniforme (`contentVersion` ×N, `verifierRequired`,
fallback); dist literacy byte-idêntico local↔deploy; `literacy-verify` preservada.

**Postura correta e mantida:** staging é draft efêmero + precheck (não ambiente durável), deploy
exige CLI autenticado + founder, merge no GitHub **não** gera deploy (Opção A, AID-982/AID-989).

## 2. CI (`.github/workflows/ci.yml`) — o que roda e tempos reais

39 check-runs no head de `main` (2026-09-12, commit `e61e5502`): SDLC guardrails (diff, com
self-test), 4 engines TS completos, codexdojo-os com 13 contract tests `node --test` + smokes
Playwright `--retries=1`, literacyDojo (build + e2e), miniTown, dojoToday, Python ×4
(learner/minimax/miniMaxEvolution/openclaw/aiDevschoolMvp), curriculum Node (18 projetos,
sequencial)/Go/Rust, voxelDojo workspace + 17 games em matrix, pixelDojo + discover, product
readiness (aggregate/check/enforce), DESIGN.md lint.

| Medida (2026-09-12) | Valor | Alvo | Veredito |
| --- | --- | --- | --- |
| Wall clock CI em push `main` | 4,8–5,7 min | <10 min | OK |
| Wall clock CI em PR | 5,0–6,9 min | <10 min | OK (folga ~3 min) |
| Job mais longo | codexdojo-os 4,8 min | — | gargalo do caminho crítico |
| 2º mais longo | curriculum Node 3,7 min (loop sequencial) | — | risco de crescimento |

## 3. Gaps e riscos (achados da auditoria)

1. **Precheck fora do repo canônico (P1):** o script vive em `_work-products/<onda>/` e é
   copiado/adaptado a cada onda (ancestral AID-821 → AID-935…). Sem baseline versionado, sem
   self-test (diferente do `scripts/sdlc_guard_check.sh --self-test`), âncoras de conteúdo
   atualizadas à mão — drift silencioso entre ondas é o maior risco de integridade do gate.
2. **Função `literacy-verify` untracked (P1, já conhecida):** a função viva no site literacy não é
   rastreada no repo desde AID-935; um deploy literal do dir canônico a derrubaria. Follow-up
   aberto — precisa virar PR + countersign.
3. **Merge single-writer é o gargalo de escala (P1 — motivo da R1):** todo PR espera o CEO; com
   multi-dev, a fila de review/merge vira o fator limitante antes mesmo do CI.
4. **Rollback custa rebuild (P2):** não há artefato pinado retido; reversão = rebuild no pin
   anterior (~1–2h FPE) + créditos. Aceitável no free tier, mas deve constar do runbook de
   reversão como janela esperada.
5. **Observabilidade parcial (P2):** monitor externo uptime existe (6 checks @5min, tokenless por
   design — `UPTIME-MONITOR-SETUP.md`); latência e taxa de erro dependem de export manual do
   coletor (Bearer). Sem alerta automático de erro 5xx.
6. **Créditos por onda (P3, monitorado):** ~60–90 créditos/onda no pool de 300/mês; gatilhos
   objetivos já documentados em `docs/serving/README.md`.
7. **Curva de checks cresce sem governance (P3):** 37 (AID-410) → 39 (AID-430) → 72 (AID-935);
   cada onda adiciona checks por concatenação histórica, sem revisão de custo/benefício — calibração
   com QA Lead é papel deste agente.

## 4. Recomendações (priorizadas; nenhuma exige gasto)

| # | Ação | Prioridade | Veículo |
| --- | --- | --- | --- |
| 1 | Política R1 de review/merge multi-dev (este PR: `R1-REVIEW-MERGE-POLICY.md`) | P1 | aprovação FPE+CEO |
| 2 | Canonicalizar o precheck: mover baseline para `scripts/precheck/` com self-test + âncoras declarativas por onda | P1 | PR próprio (próximo) |
| 3 | Rastrear `literacy-verify` in-repo | P1 | issue/PR já mapeado |
| 4 | Branch protection + CODEOWNERS conforme R1 (após aprovação) | P1 | config GitHub |
| 5 | Runbook de reversão com janelas esperadas + changelog por release | P2 | PR docs |
| 6 | Matrix/paralelização do curriculum Node se passar de ~5 min | P3 | só se o crescimento bater |

## 5. Postura de custo

Tudo observado roda em free tier (GitHub Actions + Netlify free). Nenhuma recomendação acima
adiciona custo; #6 usa apenas minutosActions já inclusos. Novo serviço pago segue exigindo ordem
explícita do founder.
