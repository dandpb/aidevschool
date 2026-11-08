<!-- issue: AID-2681 | key: improvements-backlog | doc_id: a8a2ff71-0ced-4364-b4f2-e22c237b2d8f | updated: 2026-09-26 07:22:12.435+00 -->

# improvements-backlog

(AID-2681)

# FACTORY-STRESS — Backlog de melhorias priorizadas (impacto × esforço)

**Programa:** AID-2681 (umbrella, SDLC Scrum Master) · **ENCERRADO 2026-09-26 07:12Z: 21/21 POCs com receipt** (onda 1: 5/5 · onda 2: 16/16) · **Fontes:** `friction-log` rev 17 + receipts das children (AID-2697 via AID-2829).
**Base do repo:** `main` = `7a8bc262` (inclui PRs #529/#532/#534/#540/#543/#544).

## Como ler
Clusters deduplicam propostas de todas as estações (onda 1 + onda 2). Cada cluster lista: o que mata, fontes, issues existentes, dono proposto, impacto × esforço. **Sequenciamento cabe ao CEO/product owner** (boundary SM: triagem e recomendação, nunca aceite unilateral). Execução via maintain loop completo: intent citando a issue de tracking → build → prove → gate → PR; produtor ≠ verificador.

## Tabela priorizada

| Cluster | O que resolve (mata) | Fontes (POCs) | Issues | Dono proposto | Impacto | Esforço | Prioridade |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **B2/B4 — Prova em árvore limpa + re-derivação na decisão** | P4 cego a tracked `M`/`D` e a ignorados; TOCTOU (check muta árvore); `--amend` pós-prove; env do verificador esvazia prova | 2683 S3b/S4b/S5 · 2686 S6 · 2691 D-1/D-2 · 2693 A2 · 2695 D1 · 2700 F6 | **AID-2822** (F6 grave, CEO) · AID-2730 (`in_review`) | Platform & CI + Verifier & Evidence | alto (4 furos de gate confirmados independentes) | médio | **P0** |
| **B1 — Evidência ancorada no ledger** | digests auto-atestados; gate confia em state.json mutável; truncagem passa; all-cheap dispensa verificador; `build.log` do autor descartado | 2683 L7 · 2686 S5 · 2682 X4–X6 · 2685 E6/E7 · 2694 F2 | AID-2719 (`in_progress`; hardening PR #544 merged, countersign pendente) | Verifier & Evidence + Platform & CI | alto (forja indetectável) | baixo-médio | **P0** |
| **B10 — Parser checks.md estrito/lossless** | `\|\|` vira `\|` silenciosamente (corrompe semântica do check); `key=value` desconhecido vira comando; sem `timeout=`/`severity=` por check | 2688 · 2692 F5 · 2693 A1/A4 · 2699 P4 · 2702 B1 (5 fontes) | — (criar na execução) | Platform & CI | alto (toda prova custom legítima em risco) | baixo | **P0** |
| **B13 — Last mile: estação `ship`/`handoff` + receipt reflow** | promote termina em worktree isolado: push/PR manuais (sem credencial p/ não-infra); SHA órfão; `copy_receipt_into_registry` = código morto (8 fontes); chicken-egg P5 do receipt; `review` inalcançável | 2683 S5 · 2687 F5 · 2690 F4 · 2694 F3/F4 · 2696 D3/D4 · 2698 D1/D-P1/D-P3 · 2699 · 2700 P4 · 2701 F3 · 2702 B2/B3 | — (criar na execução) | Platform & Release | alto (fecha o loop até o PR; adoção por não-engenheiros) | baixo-médio | **P0** |
| **B12 — Registro com autoridade de commit pinado + `depends_on`** | freeze/gate leem `intent/` da working tree (untracked aceito como versionado; flip block→promote via `checkout --`); base implícita fail-open; consumidor promovido sobre base órfã | 2684 linha 4 · 2690 F3 · 2692 E3/E4 · 2695 P-B · 2696 D1 · 2698 D5 | — (criar na execução) | Platform & Release | alto (P4/P5 estrutural) | médio | **P1** |
| **B11 — Verificador hermético + `expect=` + contrato env-puro** | prova herda env do verificador (`PYTEST_ADDOPTS=--collect-only` → 0 testes → promote); vacuidade sem asserção de conteúdo; env do OPERADOR omite devDeps silenciosamente (`NODE_ENV=production`+`npmrc omit=dev` → `vitest: not found`) | 2691 D-1/P1/P2 · 2697 E1/FPE-P1 (2ª fonte) | — (criar na execução) | Verifier & Evidence | alto | baixo | **P1** |
| **B9 — Inner loop (`factory retry`/`--rev`) + lineage estável** | prova reprovada encalha em `verified`; sem `release`/retry; novo event-id sem linhagem; ids compostos (`FE-…-retry1`×4 ao vivo); `resume()` reseta `risk=low` (política burlada); emenda de contrato versionada | 2687 F2–F4 · 2690 F5 · 2695 P-C · 2699 P3 · 2700 F2/P3 · 2701 F1 · 2697 E2/E3/FPE-P2 | — (criar na execução) | Engine Hardening + Platform & CI | alto (ciclo mais comum p/ specs/conteúdo) | médio | **P1** |
| **B14 — Ponte gate↔CI** | checks congelados não rodam no CI do GitHub (merge desprotegido); gate promoveu cego ao guard `protect-tests`; trailers `SDLC-ALLOW-*` no contrato | 2689 P2 · 2698 D4/D-P2 | — (criar na execução) | Platform & CI + QA | alto p/ docs/provas custom | médio | P1 |
| **B6/B7 — Crash-recovery fail-closed + higiene operacional** | artefato torneado ⇒ traceback; freeze/build não idempotentes; wedged@build 75%; ~210MB/run e 44 leases sem limpeza; sem estação `clean` | 2685 S3–S16/E6/E13 · 2684 linha 5/6 · 2694 F4 | AID-2735 · AID-2726 · AID-2728 (**done**) — higiene ainda aberta | Engine Hardening (crash, feito) + Platform & CI (clean) | médio-alto (residual: clean/lifecycle) | baixo | P2 |
| **B15 — Ergonomia do operador** | autoria por tentativa-e-erro (sem `init`/`scaffold`/`--dry-run`); erros EN p/ não-engenheiro; espera cega do prove (sem eco/check/tempo); vereditos sem `next`/papéis; formato fora dos templates `docs/sdlc/`; `prove` rc=0 com check falhando; canal de artefatos (`FACTORY_PROOF_DIR`) | 2690 P1 · 2693 A3 · 2699 P1/P2 · 2701 F2/F4–F7 · 2702 B4/P1 | — (criar na execução) | UX Designer (design) + Platform & CI (impl) | médio-alto (adoção por 1ª viagem) | baixo-médio | P2 |
| **B16 — Throughput/lote + assets ancorados + content-lane** | 79% do ciclo = checkout; 17 intakes/s teto; worktree quente/sparse; `factory batch`; assets binários fora do digest; **content-lane Duolingo-like** (template de contrato p/ lições, N change-ids paralelos — 36s/lição provado) | 2687 F1 · 2688 P-1/P-2 · 2696 D2 · 2697 FPE-P3 | — (criar na execução) | Engine Systems + Platform & CI | médio→alto (content ops = alavanca de roadmap) | médio | P2 (subiu: evidência FPE) |
| **B17 — Fidelidade de auditoria** | `station_from` hardcoded; falha de freeze sem recibo; rótulos frozen/registry invertidos (2 fontes) | 2685 · 2689 P4 · 2698 D2 · 2700 | — (parcial B1) | Verifier & Evidence | médio | baixo | P3 |
| **B18 — Contrato de decisão (ADR)** | `decision.md` como tipo de change: digest cobre a decisão, ciclo proposed→accepted→superseded, risco default medium ⇒ direção humana explícita | 2700 P1 (piloto ADR-0011 pronto) | — (criar na execução) | System Designer + Platform & CI | médio-alto (governança) | baixo-médio | P3 |
| **B8 — Plataforma Paperclip** (fora do repo) | boundary impede coordenador de flipar children (GO = 5+11 relays); continuation-wake loops; dupla-sessão por flip de GO e por release-de-terceiro (3ª inst. AID-2829 — continuation-wake pós-release spawnou sessão paralela; run-ownership conteve); countersign stage-2 pula p/ PR de agente via token humano | friction-log #1/#2/#11/#20/#29 · 2689 (countersign) | echo sweep CEO AID-2724/2760 | CEO / plataforma | alto (qualquer programa multi-agente) | médio | paralelo (CEO) |
| **Achado colateral CI (fora da fábrica)** | `learner/service/tests` fora da linha pytest do job `learner` (`ci.yml:335`) — suite FastAPI nunca rodou em CI | 2694 F6 | — (1-liner; sugerida p/ Platform & CI pegar junto de B14) | Platform & CI | médio | baixo | P2 |

## Ordem recomendada (racional — decisão final é do CEO)
1. **B2/B4** (AID-2822 + AID-2730) — 4 confirmações independentes de promote com árvore/ambiente sujo; sem isso toda evidência é questionável.
2. **B1** — ancora digests no ledger (fechar countersign AID-2719 do hardening já merged).
3. **B10** — free win: parser lossless mata corrupção silenciosa de checks (5 fontes, esforço baixo).
4. **B13** — last mile do PR + receipt reflow: transforma promote em entrega real (8 fontes).
5. **B12 → B11 → B9 → B14** — integridade estrutural do contrato e inner loop.
6. **B15/B16/B17/B18** — ergonomia, volume e governança sobre a base íntegra.
7. **B8** em paralelo, decisão de produto do CEO.

## Estado das issues de correção (2026-09-26 07:10Z)
- **Done (merged):** AID-2721 (P1 fencing, PR #529) · AID-2731 (intake atômico) · AID-2732/AID-2734 (B5/F0 freeze canônico, PR #543/#534 — **confirmado no caminho real** por AID-2701/2688) · AID-2735 (retomada idempotente) · AID-2737 (envelope CLI exit 2) · AID-2748 (epoch/takeover atômico, PR #540) · AID-2725/2726/2727/2728/2729 (tracks) · AID-2715/2716 (tracks P2/P4).
- **In flight:** AID-2730 (B2 clean-room, `in_review` Platform & CI) · AID-2719 (B1 tracking, SM; hardening PR #544 merged, countersign pendente) · **AID-2822** (F6 árvore suja, Platform & CI, integrado ao hardening AID-2824).
- **Fila de criação:** clusters B9–B18 sem issue — criar no sequenciamento do CEO (proposta: 1 issue por cluster, filho da estação dona).

## Métricas do programa (honestidade > dashboard verde)
- Onda 1: 5/5 receipts; 25 defeitos, 10 fricções-altas → 12 issues de correção criadas; 9 já merged/done.
- Onda 2 (14/16): 14 receipts; +7 defeitos-furaram-gate (D-2691-1/D-2691-2, A2-2693, D1-2695, E3/E4-2692, F6/F2-2700) — 2 roteados (AID-2822; restante nos clusters B10–B12); +~20 fricções-altas/médias consolidadas em B9–B18.
- Itens reais entregues pela fábrica no programa (POCs de produto): ≥11 PRs (#534–#537, #539, #543–#544, #546–#548, #550) — a fábrica **entregou trabalho real enquanto era estressada**.
- Ciclo feliz e2e: ~14s (engine) / ~3s (docs); volume: 2.32s/item (79% checkout).
- **Fechamento (07:12Z):** AID-2697 `done` (PR #551, 36s de prove/132 testes — content ops provado) · AID-2698 `done` (field-guide PUBLICADA PR #553, wiki/). Field-guide do programa: `wiki/questions/Field Guide - Agentic Factory Stress 2026-09-26.md` (PR #553).
- **Evidência a favor (E4/AID-2697):** verificador distinto flagrou defeito latente do autor — producer≠verifier funciona como desenhado.
- PRs de merge pendentes (fluxo single-writer FPE + countersign QA, fora do boundary do programa): #550, #553.
