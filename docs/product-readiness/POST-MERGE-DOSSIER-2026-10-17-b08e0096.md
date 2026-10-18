# Dossiê de prontidão pós-merge — onda encerrada em #657 (`b08e0096`) (2026-10-17)

**Data:** 2026-10-17 · **Árvore verificada:** `b08e0096` (main tip; merge de PR #657, 2026-10-17)
**Autor:** Docs & Readiness Engineer (AID-5008) · **Escopo:** sincronização de docs pós-merge — `engines/codexDojo/ecosystem/MANIFEST.md`, `curriculum/BACKLOG_STATUS.md` e estado do dossiê de readiness (`docs/product-readiness/`).
**Regra do house:** toda afirmação abaixo cita arquivo/linha/comando verificável. Docs não maquiam lacuna de produto — reporta.

## 1. Definição da onda e contagem verificável

Janela da onda: merges first-parent na `main` após o último re-anchor de claims promovido
(re-grant **v105**, PR #607 @ `8975ba43`, 2026-09-30) até o merge de PR #657 (`b08e0096`, 2026-10-17).

Comando de verificação: `git log --merges --first-parent --format="%h|%cs|%s" 8975ba43..b08e0096` → **40 merges de PR**.

> **Reconciliação com o texto do issue:** AID-5008 menciona "22 entregas". Contagens mecânicas
> testadas nesta árvore: 40 merges first-parent de PR na janela; 27 AIDs distintos citados nos
> assuntos de merge; 26 merges com data ≥ 2026-10-07. Nenhum corte testado produz exatamente 22.
> Registro a divergência sem ajustar números (evidência sobre afirmação). A tabela §2 cobre o
> superset (40), o que torna qualquer subconjunto do autor verificável por inclusão.

## 2. Entregas mergeadas na janela (40 PRs, evidência git first-hand)

| Data | Merge | PR | Entrega (resumo do assunto do merge; contadoresign citado no próprio assunto) |
|---|---|---|---|
| 2026-10-17 | `b08e0096` | #657 | rubric-class-verifier-receipt (AID-3710) + pin de bindings 40 = 23 ai-prática + 17 dev (`49ec0c1b`, AID-3590) |
| 2026-10-17 | `7aa9f8d0` | #686 | gate(countersign): rejeita placeholders de sessão + ancora sessão real do run (AID-4898; QA AID-4976 GO `7ccf74eb`) |
| 2026-10-16 | `8bab942a` | #651 | docs(learner-downloads): catálogo preview (AID-3669) |
| 2026-10-16 | `49e2513d` | #689 | fix: unblock curriculum evaluators (progressão/test discovery/avaliadores late-game) |
| 2026-10-16 | `7924a912` | #649 | learner analytics (produtor LAE; countersign AID-4914, cadeia AID-4897) |
| 2026-10-16 | `e2fde724` | #624 | substrate work (produtor LEE; countersign AID-4906, cadeia AID-4897) |
| 2026-10-16 | `98a06326` | #667 | docs+mvp: handbooks de ownership 15/16/17 + MVP replay fold isolate + installer help (countersign AID-4890 `d235440b`) |
| 2026-10-16 | `5bb14a49` | #685 | adoção bolt-renderer-sync (AID-4882) |
| 2026-10-16 | `643b8952` | #676 | perf(miniTown): loop indexado em `Town.tick()/snapshot()` (countersign AID-4871 `b101e6ac`) |
| 2026-10-15 | `0a2e2dbe` | #679 | a11y(dojotoday): nomes acessíveis em botões toggláveis (AID-4864; countersign `f16c9549`) |
| 2026-10-15 | `a8993bdc` | #626 | fix(literacy): `/escola/` mantém `tabindex=-1` no cartão da jornada (AID-3532; countersign `11b2cea2`) |
| 2026-10-15 | `f98e7fa3` | #682 | fix(curriculum): reconcilia catalog.md e status.md para 02, 05, 12, 18 |
| 2026-10-15 | `601654ed` | #683 | fix(ci): AID-4839 — cura do claims-red herdado (determinismo wall-clock + guarda anti-data-absoluta) |
| 2026-10-08 | `304456dd` | #645 | u13-evals-offline → unidade `pg-e01-evals-offline` (AID-3648) |
| 2026-10-08 | `741a7fbb` | #650 | kit-offline pg-d5 (AID-3668) |
| 2026-10-08 | `d85c0a22` | #644 | worksheet reparo-rotina (AID-3649) |
| 2026-10-08 | `3b0b6744` | #637 | receipt-canon-offline (AID-3585) |
| 2026-10-08 | `1d72dcbe` | #635 | pg-c01-incorporação (AID-3573) |
| 2026-10-08 | `4913a70b` | #628 | substrate: prática guiada (AID-3534) |
| 2026-10-08 | `35085aad` | #611 | audit-contracts (AID-3457) |
| 2026-10-07 | `c89e7b2b` | #640 | dev-journey-quickstart → `docs/product-readiness/JORNADA-DEV-QUICKSTART_2026-10-01.md` (AID-3588) |
| 2026-10-07 | `37856643` | #622 | escola-guia-operacional → `docs/product-readiness/ESCOLA-GUIA-OPERACIONAL_2026-09-30.md` (AID-3520) |
| 2026-10-07 | `0431e7d8` | #632 | sw-asset-html-guard (AID-3563) |
| 2026-10-07 | `178f1b4d` | #620 | sequencia-dev-guiada r1 + unidade pg-d01 (AID-3510) |
| 2026-10-07 | `a38bc296` | #610 | unify-school (AID-3453) |
| 2026-10-07 | `39e14981` | #630 | fase1-v21 docs patch (AID-3540) |
| 2026-10-03 | `b9f77774` | #664 | fix(sdlc-quest): SHA256SUMS rehash + check-package nos gates D1/D2 (AID-3899; achado L13/AID-3687) |
| 2026-10-02 | `ae61479e` | #652 | feat(escola): meta/canonical/OG/sitemap em `/escola/` (AID-3701) |
| 2026-10-02 | `f3038852` | #661 | docs(intent): retrofit artifact home do stack de competências (AID-3815/AID-3514) |
| 2026-10-02 | `249bd851` | #660 | feat(literacyDojo): seam consumidor de competências `getCompetency`/`hasCompetencyEntry` (AID-3514 Fase 2, contrato S6 §7.1) |
| 2026-10-02 | `9a5bb1a3` | #659 | feat(curriculum): read model opcional `competency-map.ts` (AID-3514 S5/Fase 1) |
| 2026-10-02 | `5f71ac42` | #623 | docs(curriculum): contrato de leitura de competências (AID-3514 S6) |
| 2026-10-02 | `5195dd0a` | #658 | fix(gate): merge-msg-gate restrito ao first-parent path de main (AID-3795) |
| 2026-10-02 | `8d257abc` | #619 | práticas de transferência tp-c01/tp-d01 com rubricas versionadas (AID-3506 S4) |
| 2026-10-02 | `195887c2` | #617 | metadados de competência ratificados (32 lições) + contrato #612 aterrissado (AID-3505 S3) |
| 2026-10-01 | `fcf84d3e` | #653 | fix(codexdojo-os): anel `:focus-visible` no input do mentor (AID-3714, lente L08/AID-3682) |
| 2026-09-30 | `86fca779` | #627 | âncora de onda AID-3453-d9dbdd5 (fatia /escola/ literacy-only) |
| 2026-09-30 | `d9dbdd5c` | #616 | feat(literacy): entrada estática `/escola/` no literacyDojo, fatia 1 (AID-3453; publicação autorizada founder 20:44Z) |
| 2026-09-30 | `1975e2c7` | #609 | merge-msg canonical-line check mecânico (AID-3447) |
| 2026-09-30 | `262a781b` | #608 | merge-gate hardening: fallback CLI binding §Merge protocol item 7 (AID-3433/AID-3432-D2) |

## 3. Estado por superfície (verificação first-hand nesta árvore `b08e0096`, 2026-10-17)

### 3.1 `curriculum/BACKLOG_STATUS.md` — CORRENTE (sem ação)

- Gerado por `learner/substrate/catalog.py` (cabeçalho linhas 1–2). Re-execução de
  `python3 -m learner.substrate` nesta árvore: **rc=0, zero drift** em
  `curriculum/BACKLOG_STATUS.md`/`catalog.md`/projeções de curriculum — a regeneração feita
  in-onda (#682 `f98e7fa3` + #673) está sincronizada com `curriculum/catalog.md`.
- **Achado (reportado, não corrigido — fora do escopo docs):** a mesma re-execução em árvore
  limpa produz drift em `engines/codexDojo/src/data/learner.ts` e
  `engines/codexdojo-os-prototype/src/data/learner.ts`
  (`profile.dreyfus: competent → proficient`; pitfall `P-001` `occurrences: 21 → 1`,
  `lastSeen` inalterado). Drift revertido neste branch — não é afirmação de regresso da onda;
  a projeção de dashboard aparenta sensibilidade a tempo/estado na regeneração (classe de
  não-determinismo; causa NÃO diagnosticada aqui). Owner de diagnóstico: substrate
  (eng. LEE). Registrado como evidência de primeira mão para o dono.
- Conteúdo reflete a realidade do catálogo: 2 certificadas (01/02) + 3 implementadas
  parciais Node-verified (05/12/18) + projeto `19_sequencia_dev_guiada` `planned`
  (1/12 unidades; linha 28 do arquivo gerado).

### 3.2 `engines/codexDojo/ecosystem/MANIFEST.md` — 4 linhas dessincronizadas (corrigidas neste PR)

Achados first-hand (todos com evidência de arquivo/linha):

1. **Deliverable 8 (linha 94):** "Canonical 19-entry curriculum (00–18; 18 programming projects)"
   — obsoleto. `curriculum/catalog.md` (header, diff `8975ba43..b08e0096`) declara
   **Total projects: 20 (00–19; 00 e 19 são famílias de aplicação de IA, 01–18 programação)**.
2. **Superfície `curriculum/` (linha 59):** não menciona o projeto 19 (`sequencia-dev-guiada`,
   família pg-*; entradas canônicas AID-3535/PR #629) e o formato antigo "certifications (01/02)"
   vs. header atual "2 certified + 3 partially implemented Node-verified (05/12/18)".
3. **Linha 34 (`mission-bindings.yaml`) e seam "OS mission catalog and host" (linha 149):** descrevem
   a trilha dev como "nine Dev-journey lessons … four project-linked Voxel games". Realidade do
   binding (first-hand): 40 missões = 23 ai-prática + **17 dev** — 9 lições dev (l15–l17, l21–l23,
   l27–l29) + **7 jogos voxel** (game-02/03/05/06/07/08/09) + **pg-d01** (17ª missão dev, prática
   guiada de `curriculum/sequencia-dev-guiada/`; comentário `mission-bindings.yaml:837` e pin
   `curriculum/ai-literacy/tools/tests/test_os_bindings_crosswalk.py` via `49ec0c1b`).
   Nota: o desalinho dos 7 jogos (vs. 4) pré-existe à onda; o incremento da onda foi pg-d01
   (39→40 missões) e bump de contentVersion 2026-09-10.2 → 2026-09-30.1
   (diff `8975ba43..b08e0096` do YAML).
4. **Superfícies novas sem mapeamento:** `/escola/` (entrada estática do literacyDojo,
   `engines/literacyDojo/public/escola/index.html`; PRs #616/#626/#652) e o read model opcional
   de competências (`curriculum/ai-literacy` `--compile-competency` + seam consumidor
   `getCompetency`/`hasCompetencyEntry` no literacyDojo; PRs #623/#659/#660, AID-3514).

Correções aplicadas no mesmo PR (regra "update MANIFEST in the same change" de
`engines/codexDojo/AGENTS.md` §CONVENTIONS): linhas 25, 26, 34, 59, 94 e 149 atualizadas
citando os arquivos reais, sem alterar código.

### 3.3 `docs/product-readiness/` — claims com janela stale aberta (7 grupos) — LACUNA REPORTADA

Verificação executada nesta árvore (logs arquivados em `evidence/observations/` nada aqui —
comandos e rc citados inline; re-executáveis):

- `python3 docs/product-readiness/tools/cli.py check` → **rc=0** ("Product-readiness sources and
  generated matrix are valid and in sync."), com 7 grupos reportados em STALE-WINDOW (tolerância
  de janela ativa).
- `python3 docs/product-readiness/tools/cli.py check --require-current` → **rc=1** — o gate
  estrito está vermelho nesta árvore pós-onda.

Grupos stale (saída do `check`, 2026-10-17): `dojotoday-daily-guidance`,
`literacy-standalone-corridor-mod01-03`, `literacy-standalone-first-lesson`,
`minitown-explore-only`, `os-literacy-guided-mission`, `os-returning-learner`,
`os-voxel-guided-missions`.

Causa (mesmo mecanismo do triage AID-2339): os fingerprints cobrem `engines/literacyDojo/src/`,
`engines/dojoToday/src/main.ts`, `engines/miniTown/`, `engines/codexdojo-os-prototype/src/` —
todos tocados pela onda (#679 a11y dojoToday, #626/#689 literacy, #676 miniTown, #653
os-prototype, além dos bumps de contentVersion regenerados). Último anchor promovido: **v105**
(`assessments/2026-09-30-126e5286-auto-regrant-v105.yaml`, pin `LATEST_ASSESSMENT_ID`).

**Cura necessária (fora do escopo deste PR de docs):** re-grant **v107** com observação
independente + promoção, pelo fluxo do `docs/product-readiness/REGRANT-RUNBOOK.md`
(§Regra de merge: branch cortado na tip, merge imediato, push-run da main como verificador
final; §Re-grant emparceirado: executor ≠ producer). Responsáveis habituais: fábrica de
re-grant (propose) + QA Lead (countersign) + FPE (merge door). Este dossiê NÃO promove claim
nem altera `inventory.yaml`/`LATEST_ASSESSMENT_ID`.

## 4. Impacto em readiness por item da matriz (resumo honesto)

- Nenhuma entrega da onda altera promessas de tier dos use cases: os diffs stale são
  instrumentação/a11y/perf/refactor mecânico citados na tabela §2; não há evidência de mudança
  de contrato de verificação ou de fronteira producer/verifier nos grupos stale (hipótese a
  re-verificar na observação independente do v107 — não afirmo conclusão aqui).
- Novas superfícies (`/escola/`, competências, prática guiada pg-*) ainda **não possuem**
  cenários de readiness próprios em `docs/product-readiness/scenarios/` — lacuna de cobertura
  reportada (não criada neste PR; exige dono de engine + QA).

## 5. Próximos passos (owners)

1. Re-grant v107 (fábrica/QA/FPE) para fechar a janela stale — bloqueador do
   `check --require-current` verde na main.
2. Decisão de cobertura: criar cenários para `/escola/` e competências (QA Lead + donos de
   engine), ou registrar explicitamente como fora do tier atual no `inventory.yaml`.
3. Manter este dossiê como base da próxima avaliação fresca das Dev journeys (01–18) —
   nenhum status `stale` novo introduzido por docs nesta árvore.
