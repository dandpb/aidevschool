<!-- issue: AID-1582 | key: verifier-map | doc_id: 24b2c021-7df8-47a9-bb83-f83c9cc363f7 | updated: 2026-09-13 02:14:46.136+00 -->

# Verifier map — gates × verificadores determinísticos (AID-1582)

(AID-1582)

# Verifier map — gates × verificadores determinísticos

**Issue:** AID-1582 (onboarding Verifier & Evidence Engineer) · **Baseline:** `origin/main` = `6ec26544` (2026-09-12) · **Autor:** Verifier & Evidence Engineer
**Método:** leitura de `README.md`, `docs/DOCUMENTATION.md`, `learner/gate/` (4.646 linhas), engines produtores de evidência, `.github/workflows/ci.yml`; execução local dos checks determinísticos (evidência abaixo). Sem alteração de código neste passo.

**Execução local (evidência de status):**
- `python3 -m pytest learner/gate/tests -q` → **310 passed** (3.42s)
- `python3 -m pytest learner/substrate/tests learner/tests curriculum/_shared/tests curriculum/ai-literacy/tools/tests engines/test_engine_contracts.py -q` → **287 passed**
- `node scripts/precheck/precheck.mjs --self-test` → **27 passed, 0 failed** (exit 0)
- CI `main` run `34724009871` (sha `6ec26544`, 2026-09-12): **todos os jobs success**, incl. "curriculum Node (18 projects)", "Python (learner + curriculum shared)", "Promotion precheck baseline", matrix "voxelDojo games/game-*"

Convenção de status: **ok** = caminho determinístico existe, é executável e está verde · **lacuna** = sem caminho determinístico (ou incompleto) · **quebrado** = existe mas falha/vermelho (nenhum caso encontrado nesta varredura).

---

## 1. Máquina de gate (`learner/gate/`) — núcleo

| Gate | Verificador existente | Status | Evidência (arquivo:linha) |
|---|---|---|---|
| Gate canônico de código (evidência → `mastered`) | `verify_and_gate`: carrega estado canônico, seleciona 1 registro NDJSON da unidade ativa, decide e persiste só via `commit_gate_transition` | **ok** | `learner/gate/canonical_gate.py:250`; pré-condições `_check_evidence` `:65-141`; anti-replay `:111-139` |
| Semântica de evidência (identidade/projeto/métricas) | `_check_evidence_semantics` + `validate_teaching_evidence_structure` + `game_metric_violations` | **ok** | `learner/gate/canonical_gate.py:144-180`; `learner/gate/evidence_validator.py`; `curriculum/_shared/evidence` |
| Receipt de verificador isolado (produtor ≠ verificador) | Receipt confinado a `learner/verifier_receipts/`, digest SHA-256 canônico, sem symlink; PASS exige `mutation_score ≥ 0.65` e `coverage_core ≥ 0.80` e `context_isolated: true` | **ok** | `learner/gate/verifier_receipt.py:43-63` (+ path guard `:66-83`); thresholds `curriculum/_shared/evidence.py:38-39`; contrato `learner/gate/README.md:43-68` |
| Rubrica empírica legada GATEKEEPER (pixelDojo/U0) | `independently_verified_pass` aplicada quando não há receipt (usada no gate U0, 2026-07-05) | **ok** (legado, contido) | `learner/gate/canonical_gate.py:162-179`; gate registrado `learner/learning_state.yaml:85-98` |
| CLI do gate (`python3 -m learner.gate`) | Shape-detection game/literacy, dry-run sem escrita, exit 0 só com PASS/registro elegível | **ok** | `learner/gate/verifier.py:102-108` (shape), `:35-38` (fallback de evidência), `__main__.py` |
| Contrato de testes do gate | 71 testes em `test_gate.py` + rejeições bridge | **ok** | `learner/gate/tests/test_gate.py` (71 `def test`); execução local 310 passed |

## 2. Bridge teaching-game (voxelDojo → gate independente)

| Item | Verificador | Status | Evidência |
|---|---|---|---|
| Dispatch fixo jogo→avaliador (replay de observações, ignora `pass` do produtor) | `GAME_SPECS` cobre **7/16 jogos**: WAREHOUSE (02), WORMHOLE (03), RELAY STATION (05), PIPELINE PLANT (06), CHECKPOINT CITY (07), TIMELINE TOWER (08), DOCKING BAY (09) | **ok para os 7 / lacuna para 9** | `learner/gate/teaching_game_bridge.py:29-72`; receipt com `producer_writes_mastered:false` `:153-170` |
| Avaliadores determinísticos por jogo | 7 avaliadores (`warehouse/wormhole/relay/pipeline/checkpoint/timeline/docking`); 6 com teste dedicado; warehouse coberto pelos testes de bridge (records + rejeições) | **ok** | `learner/gate/tests/test_{checkpoint,docking,pipeline,relay,timeline,wormhole}_evaluator.py`; `teaching_game_bridge_records.py:110`; `test_teaching_game_bridge.py`; `test_teaching_game_bridge_rejections.py` |
| Paridade bridge Netlify (OS pilot) | Projeção `dojo-verification-bridge.mjs` testada receipt-a-receipt contra o verificador Python em CI | **ok** | `.github/workflows/ci.yml:202-204` (`dojo_verification_bridge_netlify.test.mjs`) |
| Corpus literacy gerado sem drift | `test_verifier_corpus_drift.py` falha CI se o corpus tracked estiver stale | **ok** | `learner/gate/tests/test_verifier_corpus_drift.py`; regeneração `learner/gate/README.md:84-89` |

## 3. Nível 0 — no-code (AD-004/005/006, ADR-0004)

| Gate | Verificador | Status | Evidência |
|---|---|---|---|
| Literacy (ai-literacy/LiteracyDojo) | `literacy_verifier.py` recomputa a partir da resposta estruturada, fail-closed, `mastery_eligible` só no verificador; gate `no_code.py` consome receipt digest-bound e promove via `commit_gate_transition` | **ok** | `learner/gate/literacy_verifier.py:142` (veredito), `:201` (CLI); `learner/gate/no_code.py:66-192` (fail-closed `:126-134`, anti-replay `:162-176`); `learner/gate/README.md:11-24` |
| Verificador literacy standalone (Netlify) | Contrato fixo l02-v3, fail-closed, testado em CI | **ok** | `learner/gate/netlify-functions/literacy-verify.mjs`; CI `.github/workflows/ci.yml:212` |
| **00_ai_in_practice — checklist falsificável (ADR-0004)** | **Nenhum verificador determinístico**: ADR-0004 define verificação item-a-item pelo Prometor (humano, contexto isolado); o próprio catalog marca "Verificação executável do no-code gate (Prometor) pendente" | **lacuna** (aceita como evidência mais fraca no ADR, mas sem tooling auditável) | `docs/design/adr/0004-no-code-empirical-gate.md:23-27`; `curriculum/00_ai_in_practice/docs/spec.md:26-29`; `curriculum/catalog.md:46` |

## 4. Projetos 00–18 — caminho de gate por projeto

Legenda "caminho de gate" = produtor de evidência + verificador independente + testes + CI. "Checks de implementação" = lint/test/build do `node-impl` (não é gate de mastery; é o piso executável do scaffold).

| Projeto | Status catálogo | Jogo produtor | Avaliador independente | Checks impl. (CI) | Status gate | Evidência |
|---|---|---|---|---|---|---|
| 00_ai_in_practice | scaffolded | miniTown (exploração, nunca escreve estado) | literacy: ok · checklist ADR-0004: **sem** | n/a (não-code) | **lacuna** (só a parte literacy é determinística) | `curriculum/catalog.md:40-46` |
| 01_rate_limiter | ✅ Implemented | pixelDojo GATEKEEPER | rubrica empírica legada (gate fechado 2026-07-05) | Node+Go+Rust | **ok** | `learner/learning_state.yaml:85-98`; `ci.yml:472-502` |
| 02_key_value_store | Partially implemented (Node) | game-02-warehouse | `evaluate_warehouse` + receipt `u2-warehouse-2026-08-13.json` (gate fechado 2026-08-13) | Node | **ok** | `learner/learning_state.yaml:99-119`; `learner/verifier_receipts/u2-warehouse-2026-08-13.json` |
| 03_url_shortener | scaffolded | game-03-wormhole | `evaluate_wormhole` | Node | **ok** (aguardando jornada) | `teaching_game_bridge.py:36-41` |
| 04_concurrent_task_queue | scaffolded | **nenhum** (catálogo pula 04) | **nenhum** | Node | **lacuna** | `engines/voxelDojo/` (sem `game-04-*`); `GAME_SPECS` sem 04 |
| 05_websocket_chat | scaffolded | game-05-relay-station | `evaluate_relay` | Node | **ok** | `teaching_game_bridge.py:42-47` |
| 06_file_upload_pipeline | scaffolded | game-06-pipeline-plant | `evaluate_pipeline` | Node | **ok** | `teaching_game_bridge.py:48-53` |
| 07_rest_api_auth | scaffolded | game-07-checkpoint-city | `evaluate_checkpoint` | Node | **ok** | `teaching_game_bridge.py:54-59` |
| 08_event_driven_order_system | scaffolded | game-08-timeline-tower | `evaluate_timeline` | Node | **ok** | `teaching_game_bridge.py:60-65` |
| 09_plugin_system | scaffolded | game-09-docking-bay | `evaluate_docking` | Node | **ok** | `teaching_game_bridge.py:66-71` |
| 10_distributed_cache | scaffolded | game-10-hash-ring | **nenhum** | Node | **lacuna** | `GAME_SPECS` sem HASH RING; **unitId inconsistente** `"U9-distributed-cache"` em `engines/voxelDojo/catalog.json:48` (U9 = plugin_system) |
| 11_load_balancer | scaffolded | game-11-air-traffic | **nenhum** | Node | **lacuna** | idem |
| 12_distributed_job_scheduler | scaffolded | game-12-mission-control | **nenhum** | Node | **lacuna** | idem |
| 13_api_gateway_circuit_breaker | scaffolded | game-13-breaker-grid | **nenhum** | Node | **lacuna** | idem |
| 14_log_aggregator | scaffolded | game-14-river-delta | **nenhum** | Node | **lacuna** | idem |
| 15_metrics_collector | scaffolded | game-15-observatory | **nenhum** | Node | **lacuna** | idem |
| 16_mini_message_queue | scaffolded | game-16-freight-yard | **nenhum** | Node | **lacuna** | idem |
| 17_distributed_config_service | scaffolded | game-17-lighthouse-network | **nenhum** | Node | **lacuna** | idem |
| 18_search_engine | scaffolded | game-18-stacks | **nenhum** | Node | **lacuna** | idem |

Checks de implementação (todos verdes no run `34724009871`): curriculum Node 18 projetos em `ci.yml:448-470`; Go/Rust piloto 01 em `ci.yml:472-502`; matrix por jogo voxelDojo em `ci.yml:508+` (jogo novo vira CI automaticamente via `catalog.json`).

## 5. Gates de promoção/release (fora do meu domínio de execução — FPE)

| Gate | Verificador | Status | Evidência |
|---|---|---|---|
| Precheck de promoção (baseline canônico AID-1556) | 72 checks declarativos + self-test com 27 mutações sintéticas + dry-run anti-drift em CI | **ok** | `scripts/precheck/README.md`; CI `ci.yml:68-79`; execução local 27/27 |

## 6. Resumo e lacunas priorizadas

**Contagem caminho-de-gate (19 projetos): 8 ok · 1 parcial (00: literacy ok, checklist não) · 10 lacuna (04 + 10–18). Nenhum check quebrado/flaky detectado nesta varredura.**

| # | Lacuna | Impacto | Prioridade |
|---|---|---|---|
| L1 | 9 jogos (10–18) sem avaliador independente no bridge | Regra de ouro sem caminho quando a jornada chegar em U10–U18; produtor existe e é CI-testado, verificador não | **P1** |
| L2 | Projeto 04 sem produtor e sem verificador | Nenhum caminho de evidência independente planejado (catálogo de jogos pula 04) | **P2** |
| L3 | Checklist falsificável ADR-0004 (trilha 00) 100% manual | Level 0 sem tooling auditável; "pendente" declarado no próprio catálogo | **P3** |
| L4 | `unitId` do game-10 inconsistente (`U9-distributed-cache`) | Quebraria a checagem de identidade (`canonical_gate.py:152-161`) assim que um avaliador para 10 existir; ambiguidade U9/U10 | **P4** (1 linha, fora do meu write scope) |
| L5 | Sem auditoria automática gates×checks (drift de cobertura) | Novo jogo/projeto pode entrar sem verificador sem que nada fique vermelho (o que aconteceu com 10–18) | **P5** |
| L6 | Fricção: `make test` roda tudo; sem alvo único para "gate suites" | Prioridade 3 do meu papel; caminho rápido documentado: `pytest learner/gate/tests` (3.4s) e `precheck --self-test` (offline) | **P6** (menor) |

## 7. Proposta — 3 primeiras PRs (pequenas, reversíveis, sem merge; aguardando aceite do CEO)

> Princípio: toda PR dentro do meu write scope (`learner/gate/`, `engines/*/verifier*`, `scripts/precheck/`); merge só pelo FPE (single-writer até R1).

- **PR1 — Tripwire de cobertura de gates** (`learner/gate/tests/test_gate_game_coverage.py`): teste CI que cruza `engines/voxelDojo/catalog.json` × `GAME_SPECS` × `curriculum/catalog.md` com allowlist explícita de dívidas conhecidas (jogos 10–18; unitId game-10). Falha se (a) jogo novo sem avaliador, (b) avaliador órfão, (c) unitId inconsistente fora da allowlist, (d) projeto 01–18 sem linha no inventário. CI fica verde hoje; cada avaliador novo encolhe a allowlist (mesmo padrão anti-drift do `anchorCheckIds` do precheck). Fecha **L5** e blinda L1/L4 contra regressão silenciosa.
- **PR2 — Avaliadores bridge lote 1 (AIR TRAFFIC 11 + MISSION CONTROL 12; HASH RING 10 condicionado)**: novos avaliadores determinísticos + entradas em `GAME_SPECS` + testes de aceitação/rejeição, espelhando `evaluator_primitives.py` e o padrão dos 6 testes dedicados. HASH RING fica condicionado à correção de 1 linha do `unitId` (`engines/voxelDojo/catalog.json:48`, fora do meu scope → encaminhar ao Curriculum Platform Engineer com countersign FPE). Fecha **L1** parcialmente (2–3 dos 9).
- **PR3 — Verificador determinístico de checklist falsificável (ADR-0004, trilha 00)**: `learner/gate/no_code_checklist.py` — parser do artifact do aprendiz (itens falsificáveis, fonte citada, consistência), fail-closed, receipt digest-bound como no literacy; a revisão humana do Prometor permanece como countersign final (não substituída). Fecha **L3** com evidência auditável.

**Não proposto por escopo:** criação do jogo do U4 (produtor — Learning Engine/curriculum); fix do unitId game-10 (1 linha fora do meu write scope — recomendado como drive-by ao Curriculum Platform Engineer).

## 8. Como verificar este documento

```bash
python3 -m pytest learner/gate/tests -q                       # 310 passed
node scripts/precheck/precheck.mjs --self-test                # 27 passed
gh run view 34724009871 --repo dandpb/aidevschool            # CI verde em 6ec26544
grep -n "GAME_SPECS" -A 44 learner/gate/teaching_game_bridge.py
grep -n "U9-distributed-cache" engines/voxelDojo/catalog.json # linha 48
```
