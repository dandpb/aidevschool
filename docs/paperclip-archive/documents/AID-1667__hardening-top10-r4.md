<!-- issue: AID-1667 | key: hardening-top10-r4 | doc_id: df605967-051d-4dd7-83ee-39f9ecc2b447 | updated: 2026-09-13 08:15:52.825+00 -->

# hardening-top10 — rev r4 pronta (true-up 6/6, relay AID-1667)

(AID-1667)

# Hardening Top-10 — riscos reais de engine (triagem BUG_AUDIT/AUDIT_* + estado atual)

**Owner:** Engine Hardening Engineer (9b6acd48) · **Base:** main `6ec2654` (2026-09-12) · **Método:** releitura dos 4 artefatos pedidos (`docs/BUG_AUDIT_2026-07-19.md`, `docs/AUDIT_ENGINES_CURRICULUM_2026-07-19.md`, `scripts/precheck/`, `scripts/check_python_complexity.py`) + revalidação arquivo:linha contra o main atual + inspeção do CI (API GitHub, últimos 35 runs em main) + execução local dos testes órfãos. Cada item: **risco → evidência → proposta de fix → como verificar**. Toda PR futura nasce daqui (PR-first, sem merge em main).

## 0. Estado do CI agora (2026-09-13)

- Main **verde**: run 994 @ `6ec2654` (2026-09-12T22:54Z), job `precheck-baseline` incluído.
- Últimos 35 runs em main: **32 success / 3 failure** (todos em 2026-09-10, root-causeados):
  - **run 894** (`a812b74a`): flake `literacyDojo tests/app/entryViewedExposure.test.tsx > onboarding pendente` ("expected [] to have a length of 1"). Ocorreu **20 min antes** do hardening AID-1255 (`446da0f`/PR #326 + `1dffaa6`/PR #327, pronto-sinal = poll do sink). **Já remediado** — verde desde então (runs 896–994). Taxa residual na amostra: 0 após o fix.
  - **run 895** (`3d4d2f5e`): SDLC guardrail pegando edição de teste sem trailer — **gate funcionando como desenhado**; corrigido em `1dffaa6`.
  - **run 905** (`25c0232f`): `product readiness (claims)` — 3 use cases bloqueados por evidência independente stale (ver R8).
- **Zero flaky em aberto** no momento; `--retries=1` (política AID-571) ativo só no codexdojo-os (ver R7).

## 1. Ranking (resumo)

| # | Risco | Superfície | Prioridade | Esforço |
|---|---|---|---|---|
| R1 | ~~3 testes de contrato do coletor **nunca rodam em CI** (enum manual)~~ | learner/gate + ci.yml | **P1** ✅ **done** (main 4cb48e1b) | P |
| R2 | ~~`dispatchNext` ignora `dueAtMs` (FR-003/FR-009) e teste pina o erro~~ | curriculum/12 | **P1** ✅ **done** (main 144f0e9f) | P |
| R3 | Pacote core de evidência `@aidevschool/evidence` sem teste direto | engines/shared | **P1** | M |
| R4 | ~~`check_python_complexity.py` não está wired em nada~~ | tooling/CI | P2 ✅ **done** (main f7664d9f) | P |
| R5 | ~~Testes do openclaw usam `learner/pipeline_status.md` real como fixture~~ | engines/openclaw | P2 ✅ **done** (main 80231a78) | P |
| R6 | Gate de readiness: janelas vermelhas + fábrica de re-grant com 0 runs efetivos | CI/prod claims | P2 | M |
| R7 | ~~Política de retry determinística só no codexdojo-os~~ | CI playwright | P2 ✅ **done** (main 6fef2784) | P |
| R8 | curriculum/15: stubs hardcoded violam FR-010/FR-014/FR-015; spec mente sobre poliglotismo | curriculum/15 | P3* | M |
| R9 | ~~Typo `voxeldoj-kv-warehouse` virou contrato congelado — risco é o fix unilateral~~ | voxelDojo+gate | P3 ✅ **done** (main 75cbafbc) | P |
| R10 | `npm install --no-package-lock` nos 18 projetos do curriculum (não-reproduzível) | curriculum-node CI | P3 | M/G |

\* P3 de engenharia, mas P1 pedagógico — exige issue conjunta com o dono do domínio (boundary do meu papel).

## R1 — Testes de contrato do coletor órfãos de CI (anti-pattern de enumeração)

> ✅ **DONE — landed em main** (2026-09-13T04:33:55Z): PR #369 mergeado (merge commit 4cb48e1b, single-writer FPE). CI em main @ 4cb48e1: run 34738188526 completed/success (job codexdojo-os (TS) 103673242472: 116 tests / 115 pass / 0 fail / 1 skip by-design). Glob presente 1x no ci.yml de main (linha 209; confirmado via raw em main atual c9b33fe6). Órfãos zerados: edge_semantics, funnel_aggregation_v2, schema_drift_monitor_v2 rodam em CI. Trilha: AID-1601 (done, receipt 354e45a4) ← QA approve rev2 AID-1586/AID-1587 + countersign AID-1587 + FPE review AID-1617/relay AID-1625.

- **Risco:** o coletor de analytics é superfície da regra de ouro (contrato do que roda em produção na Netlify). Uma regressão de contrato coberta só por teste que o CI não executa passa silenciosa. É exatamente o "gap estrutural de glob `dojo_analytics_*.test.mjs`" que ficou registrado na AID-1526/AID-1547 — e já vitimou 3 arquivos.
- **Evidência (main `6ec2654`):** `learner/gate/tests/` tem **17** `*.test.mjs`; o job `codexdojo-os` enumera apenas **12** invocações `node --test` (`.github/workflows/ci.yml:204-251`). Fora do CI: `dojo_analytics_collector_edge_semantics.test.mjs` (criado `4202d37`, 2026-09-06, invariáveis AID-961), `dojo_analytics_funnel_aggregation_v2.test.mjs` e `dojo_analytics_schema_drift_monitor_v2.test.mjs` (era v2, `8e7bfd6`) não são referenciados por workflow/script algum (grep no repo: 0 hits fora do próprio arquivo). Os 3 **passam** local: `node --test <os 3>` → 11 pass / 0 fail (86 ms).
- **Proposta de fix:** trocar a enumeração por um único step com glob — `node --test ../../learner/gate/tests/*.test.mjs` — preservando os steps de setup (Blobs, `npm ci --prefix`). PR mínima, sem tocar nenhum teste.
- **Como verificar:** log do step lista 17 arquivos; CI verde; `rg -c 'node --test \.\./\.\./learner/gate/tests/' .github/workflows/ci.yml` reduz a enumeração a 1 linha.

## R2 — curriculum/12: jobs futuros despachados imediatamente + teste codifica o erro

- **Risco:** o scheduler despacha jobs com `runAfterMs` futuro na hora — viola FR-003/FR-009 do próprio spec do projeto; aprendiz que estudar por evidência pratica contra uma invariante falsa. Item "Reportados sem correção" do BUG_AUDIT 2026-07-19 **confirmado vivo** no main atual.
- **Evidência:** `curriculum/12_distributed_job_scheduler/node-impl/src/scheduler.ts:197-210` — candidatos filtrados só por `status === Pending && dependenciesCompleted(job)`; `dueAtMs` é gravado em `:179` (`this.now() + (request.runAfterMs ?? 0)`) mas **nunca consultado** no dispatch. O teste pina o erro: `tests/scheduler.test.ts:39-44` submete `runAfterMs: 2_000` e espera `dispatchNext` retorná-lo **imediatamente**. Spec: `docs/spec.md:24` (FR-003) e `:30` (FR-009 "Ready jobs"), detalhado em `:322`/`:328`; o contrato `POST /jobs` declara `"run_at": "timestamp | null"` (`spec.md:67`) — e `node-impl/src/main.ts` **não mapeia** `run_at` (0 ocorrências de `run_at`/`runAfter` no arquivo; só o scheduler deriva `dueAtMs` internamente).
- **Proposta de fix:** `filter(... && job.dueAtMs <= this.now())` + reescrita do teste para o comportamento correto (job futuro não-dispatchável → vira dispatchável após avanço do relógio fake). Edição de teste existente exige trailer `SDLC-ALLOW-TEST-EDIT` com aprovação do owner registrada (padrão AID-1255/AID-1268).
- **Como verificar:** `npx vitest run` no node-impl com o novo teste de relógio; `grep dueAtMs scheduler.ts` mostra o filtro no caminho de dispatch.

## R3 — `@aidevschool/evidence` (primitivo da regra de ouro) sem teste direto nem dono de CI

- **Risco:** é o pacote que valida e emite envelope de evidência para pixelDojo, voxelDojo (17 games) e dojoToday. Regressão aqui só aparece diluída em N consumidores, com sinal apontando pro lugar errado. Histórico comprova a classe: 2 bugs reais saíram daí no BUG_AUDIT (#33 canal `game` sobrescrevia em vez de anexar; #34 `ts` aceitava não-ISO).
- **Evidência:** `engines/shared/teaching-evidence/` — **sem** diretório `tests/`, `package.json` **sem** `scripts`; consumido via `workspace:*` (`engines/pixelDojo/package.json:5`, `engines/voxelDojo/package.json:25`) e pelo bridge do OS (`legacyEvidenceAdapter.ts`); nenhum job do CI testa o pacote em si (`ci.yml` sem referência). README do pacote assume a responsabilidade ("must not reimplement envelope validation…").
- **Proposta de fix:** suíte vitest própria cobrindo `emit.ts`, `evidenceEnvelope.ts`, `evidenceTransport.ts`, `funnelTelemetry.ts` + step no CI (aproveitar um job que já instala os workspaces, ex.: voxeldojo). Mutações: envelope inválido, ts não-ISO, append-only dos canais.
- **Como verificar:** step dedicado verde listando N testes; `ls engines/shared/teaching-evidence/tests` não-vazio.

## R4 — `scripts/check_python_complexity.py`: ferramenta morta

- **Risco:** a régua de complexidade citada no charter do papel não é enforcement em lugar nenhum — dívida cresce invisível (pirâmide de testes: complexidade sem gate = área futura sem cobertura).
- **Evidência:** `grep -rn check_python_complexity` no repo → só o próprio arquivo; ausente de `.github/workflows/ci.yml`, `Makefile`, `scripts/precheck/` e docs. `radon>=6,<7` **está** declarado (`pyproject.toml:23`) — dependência instalada sem uso.
- **Proposta de fix:** step novo (job `learner`) rodando `python3 scripts/check_python_complexity.py --max 8 learner engines/minimaxDojo engines/openclaw engines/miniMaxEvolutionEngine engines/aiDevschoolMvp`; se houver violações hoje, congelar baseline (allowlist no mesmo PR, reduzível por follow-up).
- **Como verificar:** violação sintética em branch quebra o job; baseline versionada no repo.

## R5 — openclaw: 7 pontos de teste parseiam `learner/pipeline_status.md` real (produção viva) como fixture

- **Risco:** dependência oculta em conteúdo de produção mutável: corrida local com `python3 -m learner.substrate` concorrente gera o flake que o BUG_AUDIT observou; e quando o learner muda de fase/projeto, os testes passam a exercitar caminhos diferentes sem ninguém ter editado o teste.
- **Evidência:** `engines/openclaw/tests/test_scheduler.py:101,128,159,176,196` — `_parse_status(Path("learner/pipeline_status.md"))` direto — e **mais 2 da mesma classe via fallback** (`:46,:71`: `_parse_status(status_path) if status_path.exists() else _parse_status(Path("learner/pipeline_status.md"))`, com o tmp status nunca escrito — cai sempre no arquivo real); o arquivo canônico foi regenerado hoje (mtime 2026-09-12 22:08 UTC). Recomendação "fixture versionada imutável" do BUG_AUDIT (2026-07-19) **nunca aplicada**.
- **Proposta de fix:** fixture imutável em `engines/openclaw/tests/fixtures/pipeline_status.seed.md` (cópia congelada), substituindo as 7 leituras (5 diretas + 2 fallbacks).
- **Como verificar:** `grep -rn "learner/pipeline_status" engines/openclaw/tests/` → 0; suíte verde local e CI.

## R6 — Gate de readiness: janela vermelha em main + fábrica de re-grant nunca executou

- **Risco:** quando claims ficam stale, main fica vermelho até um re-grant fora de banda; a automação criada para fechar essa janela (AID-1357, **PR #339** — merge `32545321`, 2026-09-10 22:06:24 -0700) tem **todos** os runs `skipped` (runs 56–65) — a primeira janela stale real será a maiden run dela, sob pressão. Agravante de diagnóstico: `product-readiness` roda `if: always()` com download `continue-on-error: true` (`ci.yml:413,423`) — "artifact de producer ausente" e "claims stale" geram mensagens do mesmo tipo.
- **Evidência:** run 905 (`25c0232f`, 2026-09-10T15:06Z) falhou em "validate readiness sources" com 3 use cases bloqueados — log: "dojotoday-daily-guidance: blocked; reasons=…lacks independent evidence; missing promoted result…" (idem pixelquest-evidence-encounter, voxel-standalone-learning-loop); workflow "Readiness re-grant factory" ativo porém 10/10 runs recentes skipped (API GitHub).
- **Proposta de fix:** (a) ensaio controlado da fábrica — executar `regrant --propose` local contra um cenário stale sintético e conferir o PR end-to-end antes da primeira ocorrência real; (b) pós-download, assert explícito nomeando os producers esperados antes do `validate` (mensagem distingue producer faltante de stale).
- **Como verificar:** log do ensaio com PR de re-grant criado; falha simulada (1 artifact removido) produz mensagem nomeando o producer.

## R7 — Retry determinístico (AID-571) cobre 1 de 6 superfícies Playwright

- **Risco:** flake em pixelDojo/voxelDojo/games/miniTown/literacyDojo volta ao regime de rerun manual ad-hoc sem trace — a prática que a AID-571 (Auditoria #5 A5-F4) extinguiu no codexdojo-os.
- **Evidência:** `--retries=1` só em `ci.yml:280-281` (codexdojo-os pilot + smokes); ausente em pixeldojo `:127`, voxeldojo `:161`, voxeldojo-games `:557`, minitown `:367`, literacydojo `test:e2e` `:331`.
- **Proposta de fix:** estender `--retries=1` + o contrato de listagem "flaky" (o listing durável que a AID-571 exigiu) às demais suítes; regra se mantém: recorrência ⇒ quarentena + issue, nunca subir retries.
- **Como verificar:** `grep -n retries .github/workflows/ci.yml` cobre as 6 superfícies; primeira ocorrência flaky registrada com nome do teste.

## R8 — curriculum/15: stubs hardcoded violam FR-010/FR-014/FR-015; spec promete Go/Rust que não existem

- **Risco:** material didático que fere a própria spec — o aprendiz estuda uma API que finge ter alertas/dashboard. Evidência de aprendizado construída contra stubs.
- **Evidência:** `server.ts:61` — `GET /alerts/rules` retorna `{items: []}` fixo (regras criadas via POST `:54-58` nunca listáveis; FR-014 `spec.md:35`); `server.ts:51` — `GET /dashboard` retorna `{panels: [], alerts: []}` fixo (FR-010 `spec.md:31`); `server.ts:42` — `store.query(name, 'gauge', …)` com tipo hardcoded, counter/timer inqueríveis; `__tests__/server.test.ts:86-96` pinam os stubs; `spec.md:9` promete "Go, Rust, and Node.js" mas só existe `node-impl/`.
- **Proposta de fix:** **issue conjunta com o dono do domínio do curriculum** (boundary: não altero comportamento pedagógico sozinho): implementar listagem de regras + dashboard mínimo + type no query, OU marcar planned no spec e remover a promessa polyglot. Bug do percentil em go/rust do BUG_AUDIT caiu com os diretórios (só `01` mantém go/rust).
- **Como verificar:** teste que cria regra via POST e lista via GET retorna a regra; spec condiz com os diretórios.

## R9 — `voxeldoj-kv-warehouse` (typo) é nome de contrato congelado em 25+ pontos

- **Risco:** NÃO é o typo (produção e verificador estão consistentes e pinados por testes de contrato) — o risco é alguém "corrigir" um lado só: renomear no game sem renomear evaluator/bridge rejeita evidência histórica gravada e quebra o gate silenciosamente.
- **Evidência:** emissor `engines/voxelDojo/game-02-warehouse/src/game/controller.ts:266`; função Netlify de produção `learner/gate/netlify-functions/dojo-verification-bridge.mjs:170,185,195,220`; evaluator Python `learner/gate/warehouse_evaluator.py:68,85,95,123`; bridge OS `engines/codexdojo-os-prototype/bridge/routerVerificationRecords.ts:48` (correção de path na rev r4 — o original citava `src/engines/`, path inexistente no main atual; caminho congelado no doc de contrato `docs/design/teaching-game-contract.md:87`); + suítes de contrato dos dois lados pinam a string.
- **Proposta de fix:** registrar o freeze em doc de contrato (docs/design/teaching-game-contract.md ou README do evaluator): "kind `voxeldoj-kv-warehouse` é nome histórico congelado; rename exige migração coordenada engine+verificador+evidência histórica". Opcional: alias no evaluator aceitando a forma correta + a histórica.
- **Como verificar:** doc mergeada citando o nome exato; testes de contrato verdes.

## R10 — curriculum-node instala 18 projetos sem lockfile (CI não-reproduzível)

- **Risco:** cada run resolve dependências frescas: release upstream quebrando semver quebra o CI de forma não-determinística (flake de supply-chain), "verde local" não prova "verde no commit", e build histórico é irreproduzível — contra a prioridade "reproduzível local" do papel.
- **Evidência:** `ci.yml:464` — `npm install --no-package-lock --no-audit --no-fund` no loop sobre `curriculum/[0-9][0-9]_*/node-impl`; nenhum `package-lock.json` commitado nesses 18 projetos.
- **Proposta de fix:** fatiar: gerar lockfile por projeto (PR mecânica, 18 projetos, trailers adequados) e trocar para `npm ci`. Alternativa mínima imediata: `--package-lock-only` + commit.
- **Como verificar:** `ls curriculum/*/node-impl/package-lock.json` = 18/18; CI usa `npm ci`.

## Revalidação dos audits antigos (o que caiu, o que ficou)

**BUG_AUDIT_2026-07-19 — status dos itens em aberto:**
- ✅ Resolvidos desde então: percentile go/rust (diretórios apagados — só `01_rate_limiter` mantém go/rust); pin pytest agora `>=8,<9` (`pyproject.toml:21`); `testpaths` cobre 13 suítes incl. `docs/product-readiness/tests` (`pyproject.toml:35-49`); teste de contrato ai-literacy (suíte verde no CI hoje); áreas phantasy/games apagadas sumiram do repo.
- ❌ Ainda vivos (viraram R2, R5, R8, R9 deste top-10): scheduler `dueAtMs`; fixture real do openclaw; stubs do curriculum/15 (+ alerts/dashboard); typo do metric kind.
- 🟡 Menores (fora do top-10, monitorar): curriculum/08 `subscriberFailures` conta "sem listeners" como falha (`orderSystem.ts:102`); curriculum/01 `normalizeIp` sem forma hex do IPv4-mapped (`clientKeyStrategy.ts:43` só cobre dotted); minimaxDojo docs com thresholds em tabelas (D9, semi-mitigado — tabelas apontam `config/learner.yaml`).
- Flake de timeout 5s jsdom (audit "falhas pré-existentes"): a política AID-571 + o fix AID-1255 cobriram os casos observados; nenhum evento em 35 runs recentes.

**AUDIT_ENGINES_CURRICULUM_2026-07-19:** P0/P1 absorvidos pelo produto (miniTown inventariado como "level-0 entry surface (AD-004)" em `engines/AGENTS.md` e AGENTS.md raiz). O restante é decisão de produto (P2 non_developer etc.), não risco de confiabilidade — fora deste top-10.

**Audit AID-1526 (contexto do precheck):** P1 resolvido — `scripts/precheck/` canônico com 72 checks ancorados, self-test de 25 mutações e tripwire de registry rodando no CI (`precheck-baseline`). O gap estrutural de glob que a própria AID-1547 registrou virou o **R1** deste doc.

## Fila proposta (PR-first, sem merge em main)

1. ~~**PR-R1**~~ ✅ **concluído 2026-09-13** — PR #369 mergeado em main 4cb48e1b (AID-1601 done; QA approve rev2 2113492f + countersign AID-1587; single-writer FPE). Fora da fila.
2. ~~**PR-R2**~~ ✅ **concluído 2026-09-13** — PR #377 mergeado em main `144f0e9f` (AID-1649 done; domain GO LEE b1726b76 + content APPROVE LEE c4fed8f7; QA-approved rev2 2113492f + countersign AID-1587; PRE GO AID-1653 524a5a43; single-writer FPE AID-1656).
3. ~~**PR-R5** + **PR-R4**~~ ✅ **concluídos 2026-09-13** — PR-R5: PR #373 mergeado em main `80231a78` (AID-1626 done; QA approve rev2 AID-1586/AID-1587; single-writer FPE). PR-R4: PR #376 mergeado em main `f7664d9f` (AID-1636 done; producer receipt 20b3b72b; PRE first-hand GO AID-1640 a8d96041; FPE re-verify AID-1642; single-writer FPE).
4. ~~**PR-R7** + **PR-R9**~~ ✅ **concluídos 2026-09-13** — PR-R7: PR #378 mergeado em main `6fef2784` (AID-1658 done; single-writer FPE). PR-R9: PR #379 mergeado em main `75cbafbc` (AID-1663 done, receipt 113869a3; PRE first-hand GO AID-1664 8c58cf6e; single-writer FPE AID-1666; producer check pós-merge re-executado no relay AID-1667: freeze em `docs/design/teaching-game-contract.md:77` + pin map re-contado no main).
5. **R3/R6/R8/R10** — issues próprias (escopo M/G ou dependência de domínio/outro owner). Seguem como follow-ups fora desta fila.

**Fila encerrada 6/6** (2026-09-13, relay AID-1667): R1 `4cb48e1b` · R2 `144f0e9f` · R4 `f7664d9f` · R5 `80231a78` · R7 `6fef2784` · R9 `75cbafbc` — todos landed em main e verificados first-hand (`git branch -r --contains`). Zero itens da fila PR-first em aberto; próximos passos de hardening nascem das issues próprias R3/R6/R8/R10.

*Publicado pelo Engine Hardening Engineer em 2026-09-13 · base `6ec2654` · evidências citadas como arquivo:linha conferíveis no pin. **Rev r2** (2026-09-13, addressing review QA comment `1506690c`): R6 corrigido — re-grant factory entrou pelo **PR #339** (merge `32545321`, 2026-09-10), não PR #352 (= og-social-preview-o1, merge `6ec26544`); R2 ancorado no contrato `"run_at": "timestamp | null"` (`spec.md:67` — verificado no pin; o review citou `:65`) + FR-009 "ready" + `main.ts` sem mapeamento de `run_at`; R5 ampliado para 7 leituras (fallbacks `test_scheduler.py:46,:71`). **Rev r3** (2026-09-13, relay AID-1625): R1 marcado done e retirado da fila — PR #369 mergeado em main 4cb48e1b 04:33:55Z, CI run 34738188526 success, glob 1x em ci.yml:209 (re-verificado first-hand em main c9b33fe6); PR-R2 é a próxima.* **Rev r4** (2026-09-13, relay AID-1667): true-up pós-merge — §Fila encerrada **6/6**: R2 `144f0e9f` (PR #377/AID-1649), R4 `f7664d9f` (PR #376/AID-1636), R5 `80231a78` (PR #373/AID-1626), R7 `6fef2784` (PR #378/AID-1658), R9 `75cbafbc` (PR #379/AID-1663) marcados done na tabela e na fila (hashes verificados first-hand `git branch -r --contains` em main); producer check pós-merge do R9 re-executado (freeze em `docs/design/teaching-game-contract.md:77`, pin map re-contado, diff docs-only +29/−0); path do bridge OS corrigido na evidência R9 (`src/engines/` → `bridge/`). R3/R6/R8/R10 seguem como issues próprias fora da fila.
