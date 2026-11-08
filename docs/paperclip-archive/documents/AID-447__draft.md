<!-- issue: AID-447 | key: draft | doc_id: c27c9765-409e-42fd-9fb1-cdbb54f413a3 | updated: 2026-08-31 04:17:14.948+00 -->

# AID-447 — Draft: opções do próximo arco estratégico (pós-l20, catálogo 20/20)

(AID-447)

# AID-447 — DRAFT: Opções do próximo arco estratégico (pós-l20, catálogo 20/20)

**Status:** DRAFT — somente leitura. Sem escrita canônica (nenhum commit/branch/PR; catálogo, bindings, produção e pins intocados).
**Owner:** System Designer (bb7b8143), delegado pela triagem CEO AID-445 (mesmo desenho da delegação AID-355).
**Baseline lida e citada (tudo via `git show <pin>:<path>`, sem checkout):** pin `69bb67a7800242495bf62542537b2ce0c14dd573` (`refs/heads/release/69bb67a7`, produção deploy `6a94f023bd87c28fce557045`, precheck 43/43 — registro `_work-products/AID-440/WAVE-PROMOTION-69bb67a7.md`); issues AID-414 (doc `spec` rev `ce535af7`), AID-426, AID-440, AID-444, AID-445; coorte AID-180/AID-348/AID-365.
**Este draft NÃO antecipa** decisão de cadência, promoção ou escopo — a decisão do próximo arco é do board/CEO (decretos vigentes seguem). Nenhuma eficácia é presumida; evidência disponível é direcional.

---

## 1. Estado vigente no pin `69bb67a7` (evidence-backed)

### 1.1 Catálogo de conteúdo — completo no escopo planejado
- **20/20 lições `ready`, 0 `planned`** (`curriculum/ai-literacy/catalog.yaml`, `contentVersion 2026-08-31.1`): l01–l20 em 6 módulos (mod-01…mod-06), 8 skills fechadas (entender, pedir, avaliar, proteger, aplicar + decidir, codificar, integrar).
- **Jornadas por lição (campo `journey` do módulo):** `ia_pratica` = 17 lições (l01–l14 + l18–l20 em mod-06 "Rotina com IA"); `dev` = 3 lições (l15–l17 em mod-05). *Nota de precisão:* a delegação cita "ia_pratica 17 / dev 3" — correto para **lições do catálogo**; o **mapa de missões do OS** tem mais missões dev (jogos, §1.2).
- **Regra 7 do contrato** (`docs/design/ai-literacy/content-contract.md:148`): extensão/aposentação de ids exige emenda via issue aprovada pelo board; próximo id livre `l21`; ids nunca reutilizados. Ou seja: **qualquer conteúdo novo de lição começa com gate de board**.

### 1.2 Mapa de missões do OS (produção vigente) — 24 missões
- **Trilha `ai-pratica` (17):** l01–l14 (chapterOrder 1–14, cadeia linear) + l18 (ch15, prereq l14) + l19 (ch16, prereq **l07**) + l20 (ch17, prereq **l10**) — desbloqueio não-linear intencional (estilo Duolingo). Entrada recomendada `l02`.
- **Trilha `dev` (7):** game-02-warehouse → game-03-wormhole → game-05-relay-station → l15 → l16 → l17 → game-06-pipeline-plant (chapterOrder 1–7). Entrada recomendada `game-02-warehouse`. Evidência `teaching-game-evidence` v1 + fallback DOM por missão; lições hosted no motor literacyDojo (`literacy-evidence` v1, `verifierRequired`).
- QA wave-level da promoção **AID-444 em andamento** (GO/NO-GO pendente; re-grant readiness v16 é dela). Nada aqui presume o veredito.

### 1.3 Ativos canônicos prontos e AINDA não vinculados como missão
| Ativo | Estado no pin | Custo de adoção |
| --- | --- | --- |
| **voxelDojo game-07…game-18** (12 pacotes: checkpoint-city, timeline-tower, docking-bay, hash-ring, air-traffic, mission-control, breaker-grid, river-delta, observatory, freight-yard, lighthouse-network, stacks) | Pacotes 0.1.x com lint/test/smoke próprios; **não** são missões | Baixo–médio por pacote: binding + verificação de qualidade vs contrato teaching-game (precedente game-06/AID-359 e l15–l17/AID-358) |
| miniTown (Level 0, explore-only) | Experimental, local, sem progresso/evidência | Fora de arco de conteúdo por design (não promete progressão) |

### 1.4 Primitivas de engajamento/eficácia já em produção (e a lacuna crítica)
- **Revisão espaçada existe e está contratada:** agendamento `nextReviewAt` por skill com `intervalsDays [1,7,21]` (`literacyDojo/src/domain/progress.ts:301-346`); Hub do OS recomenda "Revisão do dia / atrasada" com CTA "Revisar agora".
- **Streak local existe:** `localEngagementStreak` exibido no Hub/Progresso do OS ("Sequência local: N dias"), conquistas `streak-3`/`streak-7` no ResultScreen.
- **Lacuna crítica de medição:** analytics ADR-0009 tem vocabulário fechado (4 eventos: `entry_viewed`, `mapa_inicial_done`, `route_chosen`, `lesson_completed`), mas **nenhum backend configurado** — o sink padrão é `noopAnalyticsSink` ("os eventos morrem aqui"). **Retenção/eficácia pós-lançamento são hoje impossíveis de medir em produção.**

### 1.5 Evidência de eficácia registrada (direcional, honesta)
- **Coorte AID-180 (n=2):** 2/2 sessões (1× l02, 1× game-02), veredito QA `CONTINUAR` (AID-348, C1–C4 PASS) com limitação explícita: "n=1 por jornada — poder estatístico nulo". Nenhum scorecard por sessão no git (research storage restrito, protocolo AID-142).
- **Qualidade técnica por promoção:** GOs de QA em cada onda (AID-412 v14, AID-421 v15; v16 pendente AID-444) — medem regressão/a11y, **não aprendizagem**.
- Conclusão epistêmica: catálogo completo em *escopo*, eficácia **não medida**; a promessa da missão ("ritmo Duolingo") tem primitivas UI mas sem loop de medição nem evidência de retenção.

### 1.6 Guard-rails de governança que cercam qualquer próximo arco
- Emenda de contrato = gate board-only (rota de aceite formal OU ordem CEO nominal como fallback da casa — precedente AID-440).
- Promoção única por onda + QA wave-level independente (padrão AID-412/AID-421/AID-444); producer ≠ verifier; nenhum `mastered` sem evidência de gate apropriada.
- Regras do mission catalog (`learner/substrate/mission_catalog_rules.py`): sem pré-requisito cross-track; prereqs preservam identidade do currículo; ordenação por `chapterOrder`; sync de `contentVersion` por binding.

---

## 2. Opções do próximo arco (4)

### OP-A — Expansão da trilha dev game-based: onda de bindings game-07+ (ex.: 3 pacotes)
- **Objetivo de aprendizagem:** estender a cadeia dev (U7 checkpoint/consistência, U8 timelines, …) reaproveitando os 12 jogos canônicos prontos — fecha a distância entre currículo implementado (16 jogos) e trilha publicada (4).
- **Pré-requisitos (estado):** veredito AID-444 (GO mantém produção como baseline); cadeia intra-track respeitada (game-07 após game-06, chapterOrder 8+); nenhum conteúdo novo.
- **Formato curto:** já existe por pacote (simulação determinística ~12 min + fallback DOM); mantém o ritmo de missão única por sessão do OS.
- **Critério de conclusão observável:** missão jogável hosted no OS de produção com evidência `teaching-game-evidence` v1 (veredito independente PASS), mapa 24→27, QA wave-level GO, readiness re-grant.
- **Estimativa de esforço:** **baixa** — binding + verificação de qualidade por pacote (precedente direto AID-358/AID-359); onda de 3 ≈ arco C4/C5 (2 PRs + promoção + QA). 12 pacotes = ~4 ondas de 3.
- **Trade-offs:** + Usa capacidade FPE ociosa imediatamente pós-veredito com risco mínimo e zero gate de board; alimenta o mapa dev sem custo de autoria. − Não avança a missão "ritmo Duolingo" para o público não-dev; engorda o mapa sem evidência de que mapa maior retém aprendiz; QA por pacote consome a mesma fila.
- **Exigência do board:** **zero mudança de contrato**; só decreto de cadência do CEO (lote/tamanho — precedente AID-323) + promoção/QA padrão.

### OP-B — Consolidação de eficácia e engajamento sobre o catálogo 20/20 (ritmo Duolingo)
- **Objetivo de aprendizagem:** transformar 20 lições concluídas em **retenção demonstrada**: revisitagem nas janelas [1,7,21], streak sustentado, e eficácia medida (compreensão, não só conclusão).
- **Pré-requisitos (estado):** veredito AID-444; input direcional de eficácia do UX Designer (triagem AID-445 acordou acordá-lo pós-veredito); decisão de founder sobre canais de re-engajamento (notificações/e-mail = superfície de política+legal).
- **Formato curto:** o "formato" aqui é o loop diário: revisão do dia já recomendada no Hub; lacunas candidatas — onboarding de retorno, meta diária, e principalmente **instrumentação** (ligar sink analytics a um backend respeitando ADR-0009, antes de qualquer mecânica nova).
- **Critério de conclusão observável:** funil de retenção publicado (retorno D+1/D+7/D+21 agregado e anonimizado) + pelo menos 1 ciclo de melhoria guiado por dado; a11y intacta (re-check QA); zero regressão de contrato.
- **Estimativa de esforço:** **média** — multi-superfície (literacyDojo + OS + decisão de backend/ADR); ~3–5 ondas de produto com QA + ciclos de evidência UX. Nenhum precedente medido.
- **Trade-offs:** + Ataca o núcleo da promessa da missão e o maior risco estratégico (catálogo sem retenção medida); fortalece TODAS as opções futuras com dados. − Não produz conteúdo/missão nova (pressão de "novidade" do mapa); depende de input UX + founder; backend de telemetria toca política de privacidade (boundary ADR-0009 inviolável — vocabulário fechado precisa de emenda de ADR, engenharia mas com revisão cuidadosa).
- **Exigência do board:** **zero mudança de contrato de conteúdo**; issues normais de produto + possível revisão de ADR-0009 (engenharia); decisão de founder para canais de re-engajamento.

### OP-C — Nova onda de conteúdo l21+ (emenda + produção)
- **Objetivo de aprendizagem (candidatos, a validar por learner-needs):** (a) mod-07 ia_pratica "Rotina com IA II" — agentes/automação de tarefas repetitivas (continuação natural de mod-06); (b) ia_pratica multimodal — imagens e documentos no pedido; (c) dev l21+ — testes e revisão de código com IA. A lacuna real mapeada (multi-turno) **fechou com l19** — novo conteúdo carece de caso de necessidade.
- **Pré-requisitos (estado):** caso de learner-needs (UX) escolhendo tema/módulo; emenda de contrato aprovada (T0 pattern, PR #199 precedente); capacidade de autoria (spec do System Designer + produção FPE).
- **Formato curto:** herdado integralmente (3–5 min, 7 tipos de atividade, `minimumScore 0.75`, rubric, evidência v1).
- **Critério de conclusão observável:** l21–l23 ready + jogáveis hosted + QA wave-level GO (idêntico ao arco C1–C3 recém-pousado).
- **Estimativa de esforço:** **média** — spec (1 ciclo designer) + emenda board + 3 PRs de lição + promoção única + QA wave (o arco C1–C3 inteiro: T0–T3+promo em ~2h de wall-clock DEPOIS da spec pronta; a spec é o passo longo).
- **Trade-offs:** + Mantém momentum de conteúdo e o padrão de execução recém-provado. − **Gate de board no caminho crítico** (regra 7); adiciona conteúdo sem evidência de retenção do existente (risco de amplificar problema não medido); consome a mesma capacidade de QA.
- **Exigência do board:** **emenda de contrato via issue aprovada** (ids l21+, módulo novo) — obrigatória antes da produção.

### OP-D — Nova jornada vertical (terceiro público)
- **Objetivo de aprendizagem:** nicho vertical (ex.: educadores, equipes de saúde, PMEs) com vocabulário/casos próprios, reaproveitando o motor literacyDojo (journey é dado, como mod-05 dev provou) — OU novo bounded context se o formato divergir.
- **Pré-requisitos (estado):** direção de founder (qual vertical e por quê); demanda externa ou hipótese explícita; emenda de contrato (novo valor de journey + módulos).
- **Formato curto:** herdado (se reusar o motor) ou a contratar (se novo contexto).
- **Critério de conclusão observável:** jornada jogável ponta-a-ponta com evidência v1 + QA + primeira leitura de funil de retenção (que OP-B instrumentaria).
- **Estimativa de esforço:** **média–alta** no caminho reuso (≈ OP-C + emenda de journey + conteúdo 1 módulo); **alta** no caminho novo contexto (novo contrato estilo literacy/teaching-game, nova superfície, novos gates).
- **Trade-offs:** + Expande alcance da missão ("democratizar") para além dos 2 públicos atuais. − Maior risco/governança; fragmenta capacidade antes de eficácia medida; vertical sem demanda validada é aposta dupla.
- **Exigência do board:** **emenda** (nova journey) no caminho reuso; **novo contrato** (bounded context) no caminho novo motor.

---

## 3. Recomendação ranqueada (custo × risco × contribuição à missão)

| # | Opção | Por quê nesta posição | Exigência board |
| --- | --- | --- | --- |
| 1 | **OP-A** (onda de bindings dev) | Menor custo/risco com precedentes diretos (AID-358/359); zero gate de contrato; usa FPE ocioso em paralelo à leitura de eficácia; fecha cobertura currículo↔trilha | Zero (decreto CEO de cadência) |
| 2 | **OP-B** (eficácia/engajamento) | Núcleo da promessa da missão; sem medição, TODO conteúdo futuro é aposta; começa pela instrumentação (lacuna noop sink) e é pré-requisito de fato para avaliar OP-C/OP-D | Zero contrato; input UX + decisão founder (canais) |
| 3 | **OP-C** (l21+) | Padrão de execução provado, mas gate de board no caminho crítico e sem caso de learner-needs aberto (lacuna real fechou em l19) | Emenda aprovada (regra 7) |
| 4 | **OP-D** (vertical) | Maior superfície/risco; só após OP-B prover funil e founder escolher vertical | Emenda (reuso) ou novo contrato (novo contexto) |

**Arco recomendado (composto, sequenciado):** (1) decretar OP-A como onda imediata pós-veredito AID-444 (ex.: game-07+08+09, 1 promoção + 1 QA wave) **em paralelo** com (2) o scoping de OP-B-instrumentação (ligar telemetria + funil de retenção, ownership UX+FPE). OP-C/OP-D ficam para a janela de decisão seguinte, já com veredito AID-444 + eficácia direcional + direção do founder em mãos. Este draft é input de design, não decisão.

## 4. Método de verificação (quando um arco for aprovado)
- OP-A: regras do mission catalog + testes de fixture + precheck de produção (mapa/missões/chapterOrder) + QA wave-level independente; readiness re-grant.
- OP-B: revisão de ADR-0009 (se vocabulário estender) + testes de envelope analítico + verificação de privacidade (nenhum texto livre/PII) + leitura de funil com dados agregados anonimizados; a11y re-checada.
- OP-C/OP-D: `validate.py` + `gen:content` + contratos de lição (spec AID-414 como template) + QA wave-level; emenda mergeada ANTES da produção (T0 pattern).

## Pendências

Este draft aguarda, para virar spec executável (v2, no padrão AID-414):
1. **Veredito GO/NO-GO da AID-444** — NO-GO converte o próximo arco em arco de defeitos (rollback elegível `release/f3762e24`, owner FPE); GO libera OP-A imediatamente.
2. **Eficácia direcional do UX Designer** — veículo deliberadamente adiado pela triagem AID-445 até a AID-444 publicar achados; reordena OP-B vs OP-C.
3. **Direção do founder/board** — prioridade de público (retenção não-dev vs expansão dev vs novo conteúdo/vertical) e, se OP-B, decisão sobre canais de re-engajamento (política/legal).
4. **Se OP-C:** caso de learner-needs + escolha de tema/módulo (input UX) antes da emenda.
5. **Higiene de fila founder (AID-370, opcional):** confirmações pendentes (`501ab9c1` etc.) — não bloqueia este draft.

Nota epistêmica: coorte n=2 e QA de regressão não medem aprendizagem; nenhuma opção deve ser vendida ao board como "comprovadamente eficaz" — OP-B existe exatamente para substituir crença por medida.

## Boundaries declaradas como respeitadas
- Nenhuma escrita canônica: leitura via `git show` no pin (sem checkout/branch/PR); `git status` do workspace intocado em arquivos deste escopo; entrega exclusivamente neste documento (chave `draft`) nesta issue.
- Catálogo, bindings, pins e produção intocados; nenhuma antecipação de cadência/promoção; produtor ≠ verificador preservado (nenhuma verificação aqui substitui QA).
