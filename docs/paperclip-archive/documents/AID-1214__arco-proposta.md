<!-- issue: AID-1214 | key: arco-proposta | doc_id: 1b025653-091f-4a69-83a9-ec1b069ce64c | updated: 2026-09-10 06:16:07.008+00 -->

# AID-1214 — Proposta do próximo arco de missões (pós-20 LiteracyDojo): 6 missões em 2 ondas (W1 mod-08 'Rotina com IA II' l30–l32; W2 dev l33–l35 data-gated) + O3-C2 — data-informed

(AID-1214)

# AID-1214 — Proposta do próximo arco de missões (pós-20 LiteracyDojo) — data-informed

**Status:** PROPOSTA publicada — documento revisável; **nenhuma produção** (nenhum commit/branch/PR; nenhum id `l30+` criado em arquivo; catálogo, contrato, bindings, missões e produção intocados). A escolha/triagem é do SM (issue D, AID-1215) com o product owner; o dispatch pós-escolha é do CEO.
**Owner:** Content Designer (f2b1e95d). ORDEM AID-1211/C (filha do desbloqueio CEO AID-1211, 2026-09-10).
**Baseline lida e citada (first-hand, main `e839d0fc` 2026-09-09 22:40Z, CI 36/36):** `curriculum/ai-literacy/catalog.yaml` (`contentVersion "2026-09-06.1"`; **29/29 `ready`, 0 `planned`** — pipeline vazio); os 29 YAML de `modules/` (contagem de atividades por lição, §1.3); `docs/design/ai-literacy/content-contract.md` (regra 7: **próximo id livre `l30`**); `engines/codexdojo-os-prototype/config/mission-bindings.yaml` (36 missões: `ai-pratica` ch 1–20 contíguo, `dev` ch 1–16 contíguo; entradas recomendadas `l02` e `game-02-warehouse`). Issues/decisões citadas por revisão: AID-558 (rev 2, proposta de onda — método desta), AID-524 (case UX), AID-528 rev 1 `8efcccd3` (briefs spec-grade do fallback (a) "Rotina com IA II" — **nunca produzidos**), AID-576/A (escolha (b)), AID-609/A + AID-610 (onda dev l27–l29; §8.4 reserva prioridade l30+ dev à UX com evidência de coorte/funil), AID-610 comentário `c4f68a00` (veredito de próxima janela: O3-C1 — **executado**, commit `f70205de`), AID-640 (ruling de migração — done), AID-909 (tracker funil O1, hb9 09-09 22:3xZ), AID-1212 (MEASURE — ainda sem relatório, §2).

---

## 0. Sumário executivo

- **Problema observado:** o pipeline de conteúdo está vazio (0 `planned`) e os dois arcos vigentes fecharam seus ciclos — `ia_pratica` termina em "IA além do texto" (l24–l26) e `dev` fecha o "ciclo de evolução com assistente" (l27–l29). O board pediu o próximo arco; **não existe ainda dado de drop-off para calibrá-lo** (relatório `measurement` da QA pendente; funil O1 zerado; exports de telemetria first-hand são fixtures sintéticas de QA) — limitação registrada em §2, com protocolo de calibração em §5.
- **Proposta (arco "IA no fluxo de trabalho" — 6 missões novas em 2 ondas + 1 companheiro de consolidação):**
  - **W1 — `ia_pratica` mod-08 "Rotina com IA II" (l30–l32, ch 21/22/23):** ressurreção do candidato registrado (a) com briefs spec-grade pré-redigidos (AID-528 rev 1 §5) — o que automatizar, onde o humano valida, quando a automação erra. Custo de spec ≈15–30 min (re-id).
  - **W2 — `dev` extensão de mod-05 (l33–l35, ch 17/18/19) — tema data-gated:** candidato líder "contexto de projeto e trabalho contínuo" (arquivo de contexto do projeto; tarefas em etapas com checkpoints; verificação do que não é determinístico), com candidato alternativo registrado e **regra de seleção condicionada aos scorecards O1** (janela ~09-23) + síntese UX (AID-1213).
  - **Companheiro (não-missão) O3-C2:** retrofit l08–l13 ao padrão de 3 atividades (dívida first-hand: 6 lições com 1 atividade), agendado entre/antes das ondas conforme §5.
- **Recomendação:** aprovar W1 como a onda BUILD da Semana 2 (pós-triagem SM), manter W2 data-gated e O3-C2 como companions de consolidação. Governança: W1 e W2 exigem emenda board-gated T0 (regra 7); O3-C2 não cria ids.

## 1. Mapeamento do arco atual (charter 1)

### 1.1 Inventário verificado (main `e839d0fc`)

| Dimensão | Estado verificado first-hand |
| --- | --- |
| Catálogo | 29 `ready` (l01–l29), **0 `planned`**; `contentVersion "2026-09-06.1"`; próximo id livre **`l30`** (regra 7) |
| Módulos | mod-01…mod-07 (`ia_pratica`: 01–04, 06, 07 com 20 lições; `dev`: 05 com 9) |
| Mapa OS (36 missões) | `ai-pratica` ch 1–20 contíguo (l01–l14, l18–l20, l24–l26) = **as 20 missões do LiteracyDojo**; `dev` ch 1–16 contíguo (games 02/03/05/06/07/08/09, l15–l17, l21–l23, l27–l29); entradas recomendadas `l02` / `game-02-warehouse` |
| Próximos append | `ai-pratica`: ch **21/22/23**; `dev`: ch **17/18/19** |

### 1.2 Progressão e objetivos por etapa (o que o arco vigente entrega)

- **`ia_pratica` (20 missões):** fundação (mod-01: entender, resposta = rascunho; mod-02: pedir — objetivo, contexto, público/tom/formato, iteração; mod-03: avaliar — primeira resposta não é a melhor, invenção, fontes externas, critérios; mod-04: proteger + aplicar, fechando no desafio final l14) → **continuação em rotina** (mod-06: biblioteca de pedidos l18, contexto em conversas longas l19, verificação de números/fatos l20) → **além do texto-entrada** (mod-07: quando anexar l24, anexos seguros l25, conferir extração l26). O learner sai sabendo **pedir, avaliar, proteger e aplicar em fluxos de uma etapa com texto e documentos**.
- **`dev` (16 missões):** decisão (l15) → primeiro código (l16) → integração (l17) → testes (l21) → revisão como engenheiro (l22) → limites do assistente (l23) → ciclo de manutenção: debug (l27), refatoração (l28), dependências (l29), intercalado com 7 jogos de mecânica. O dev sai com o **ciclo de tarefa única assistida completo** — decidir, pedir, verificar, manter.

### 1.3 Lacunas por persona (evidência first-hand + registros)

| Persona | Lacuna | Evidência |
| --- | --- | --- |
| Não-dev | **Nenhuma lição sobre automação/rotinas assistidas multi-etapa** — o candidato (a) "Rotina com IA II" foi spec'd (AID-528 rev 1 §5, briefs completos) e nunca produzido (o board escolheu (b) multimodal em AID-576/A) | l18 deixa o learner com pedido-padrão semanal pronto, mas parametrizado à mão a cada uso; grep no catálogo: "automat" ocorre 0× como objetivo de lição |
| Não-dev | **l08–l13 com 1 atividade cada** (mod-03/mod-04: avaliar e proteger/aplicar — o miolo da trilha) | contagem first-hand nos YAML (§0); consequência mecânica registrada em AID-558 §1.2: `lessonScore` = média das obrigatórias (`progress.ts`) ⇒ `minimumScore 0.75` com granularidade binária em 6 lições do núcleo; O3-C1 (l01–l07) já corrigiu metade da dívida (`f70205de`); **O3-C2 (l08–l13) segue aberta** |
| Não-dev | Saída multimodal (criar tabela/imagem/apresentação) sem cobertura — mod-07 cobre só a **entrada** | mapa §1.1; registrado aqui como candidato futuro, fora deste arco |
| Dev | **Prioridade de l30+ dev formalmente reservada à UX com evidência de coorte/funil** (AID-610 §8.4) — qualquer tema dev novo é hipótese até os scorecards O1 | funil O1 zerado (AID-909 hb9); janela de sessões ~09-23 |
| Dev | Tema com ganchos canônicos mas sem cobertura: **contexto de projeto entre sessões** (o eco dev de l19), **tarefas multi-etapa com checkpoint humano** (eco de l13/l31), **verificação de saída não-determinística em CI** (eco de l20/l21) | prereqs canônicos disponíveis ([l16]/[l21]/[l17] `ready`); nenhum objetivo de lição toca "contexto de projeto/avaliação contínua" (grep catálogo) |

## 2. Estado dos dados — limitação explícita (charter 3)

- **Relatório `measurement` (AID-1212): INDISPONÍVEL** na data desta proposta (issue `in_progress`, 0 comentários, sem doc; verificado 2026-09-10 ~06:2Z). Nenhum número de drop-off por missão/step existe ainda.
- **Funil O1 (AID-909, hb9 09-09 22:3xZ):** Contatos 0 · Respostas 0 · Screened 0 · Agendados 0 · Sessões 0 — founder decidiu GIVE_INTROS (22:25Z 09-09); lista em coleta. Zero evidência de demanda por tema dev.
- **Telemetria (first-hand):** exports disponíveis (`qa958`/`960`/`965`) contêm apenas fixtures sintéticas de QA (`aid960-os-smoke`, `qa-a965-vereifier`, `qa-a958-watchdog`; 6 eventos literacy `entry_viewed` sem tráfego real). **Analytics ≠ evidência de aprendizagem** (regra da casa); aqui nem analytics real há.
- **Consequência assumida:** esta proposta é **data-informed estrutural** (inventário first-hand + decisões registradas do board + sucessão de ondas), não calibrada por drop-off. O protocolo §5 define como calibrar quando `measurement`/síntese UX chegarem — e a proposta foi estruturada para absorver essa calibração sem retrabalho (W2 data-gated; W1 com independência de W2; O3-C2 como resposta padrão a drop-off no miolo).

## 3. O arco proposto — "IA no fluxo de trabalho: do pedido único à rotina confiável" (charter 2)

Convenções comuns (contrato vigente, sem exceções — padrão AID-414/AID-528/AID-610): 7 tipos de atividade determinísticos; `id` estável `lNN-aM`; `feedback.onFailure`+`onSuccess` (+`perCheck`); `hints` 1–3; `storage.policy: structured_only`; `evidence: literacy-evidence v1 / verifierRequired: true`; `review.intervalsDays: [1,7,21]`; `completion.minimumScore: 0.75` com todas as atividades em `requiredActivityIds`; rubrica 3 critérios weight 1; `version: 1`; pt-BR; vendor-neutral. **Ids `l30+` são provisórios** (alocação real só na emenda T0).

### 3.1 W1 — mod-08 `ia_pratica` "Rotina com IA II" (l30–l32, chapterOrder 21/22/23)

**Fonte:** briefs spec-grade **já redigidos e board-vistos** (AID-528 rev 1 §5, com as condicionantes anti-R6 do case UX §3.2: âncora em rotinas já ensinadas, julgamento humano explícito, zero vendor). Ressurreição = re-id mecânico (l21–l23→l30–l32; entradas, unitIds, fallbacks DOM; header do catálogo 20→23; "vigentes l01..l29"→"l01..l32"; regra 7 "após `l29`: `l30`"→"após `l32`: `l33`") ≈15–30 min + re-gate do checklist de leitura. Prereqs canônicos intactos: **[l18]/[l12]/[l19]** (T1–T3 paralelizáveis). Emenda: bloco mod-08 novo (`slug 08-rotina-com-ia-ii`, `order: 8`, `journey: ia_pratica`, `skillIds: [pedir, avaliar, aplicar]` — zero skill nova) + 3 entradas `planned`.

- **`l30` "Rotinas repetitivas: o que automatizar"** (4 min, [pedir, aplicar], prereq [l18]). Objetivo de aprendiz: **distinguir tarefas do próprio trabalho que valem virar rotina assistida (repetitiva + estruturada + baixo risco) das que exigem julgamento humano a cada vez, e parametrizar o pedido-padrão da tarefa escolhida.** Atividades (herdadas da rev 1 §5): a1 `choice` multiSelect (candidatas: relatório semanal com dados fixos ✓, resposta-padrão de agendamento ✓ vs feedback delicado a colega ✗, decisão de contratação ✗); a2 `prompt_builder` (pedido-padrão com campos tarefa / dado-que-muda-cada-semana / formato — herda l18-a1); a3 `output_comparison` (automação com ponto de revisão humana vs envio automático sem verificação; required: `c-revisao-humana`, `c-sem-envio-cego`). Rubric: `r-identifica-candidata` / `r-parametriza-o-pedido` / `r-mantem-controle-humano`. **Critério de conclusão observável:** dado um conjunto de 5 tarefas de trabalho, o learner classifica corretamente ≥2 de 3 candidatas E ≥2 de 2 não-candidatas, e monta um pedido-padrão em que o campo "dado que muda" é nomeado e o formato é explícito — score ≥0,75 nas 3 atividades obrigatórias, evidência v1 com verificador.
- **`l31` "Pequenas automações: onde o humano valida"** (4 min, [avaliar, proteger], prereq [l12]). Objetivo: **classificar saídas de automação entre uso-direto e checagem-obrigatória, nomear o que falta num pedido de automação (gatilho, limite) e sequenciar a adoção segura.** Atividades: a1 `safety_classification` (uso direto: rascunho de divulgação pública vs checagem obrigatória: número para diretoria, nome de cliente em e-mail, valor em contrato); a2 `missing_context` (pedido de automação sem gatilho ✓/limite-de-escala ✓; distratores "nome-do-modelo", "ia-mais-recente"); a3 `sort` (piloto pequeno → revisão manual de tudo → ampliar gradualmente). Rubric: `r-classifica-a-saida` / `r-nomea-o-que-falta` / `r-sequencia-a-adocao`. **Critério observável:** o learner marca ≥5 de 6 saídas na classe correta (direta vs checagem) e produz a sequência de adoção completa — score ≥0,75 nas 3 obrigatórias.
- **`l32` "Quando a automação erra"** (3 min, [avaliar], prereq [l19]). Objetivo: **detectar que uma rotina automatizada degradou (saída coerente com a semana anterior mas errada para esta), aplicar correção mínima no pedido (só o dado que mudou) e repor o contexto perdido.** Atividades: a1 `choice` (sinal de degradação); a2 `output_comparison` (correção mínima vs descartar tudo); a3 `missing_context` (required: o-que-mudou ✓, regra-que-continua-valendo ✓). Rubric: `r-detecta-o-desvio` / `r-aplica-correcao-minima` / `r-repoem-o-contexto`. **Critério observável:** escolhe o sinal-correto no cenário âncora e monta pedido de correção contendo "o que mudou" + "regra vigente" — score ≥0,75.

### 3.2 W2 — `dev` extensão de mod-05 (l33–l35, chapterOrder 17/18/19) — **tema data-gated**

**Regra de seleção (o gate):** o tema final é escolhido quando existirem os scorecards O1 (AID-641 via AID-909; janela ~09-23) OU a síntese UX (AID-1213), o que vier primeiro; sem dados até a abertura da T0 de W2, vale o candidato líder abaixo (decisão registrada do CD, revogável pelo SM/board). Alternativa registrada: **"Revisão de segurança de código assistido"** (segredos em código gerado, injeção via conteúdo externo, revisão de diff sensível — ganchos canônicos l12/l25 `proteger`, l22 revisão).

- **`l33` "Contexto de projeto: o assistente que conhece seu repo"** (4 min, [pedir, codificar], prereq [l16]). Objetivo: **montar um arquivo de contexto de projeto (convencões, comandos de verificação, padrões) que dá consistência entre sessões, sem incluir segredos.** a1 `choice` multiSelect (o que pertence: convencões do projeto ✓, comando de build/teste ✓, padrão de erro preferido ✓ vs token de API ✗, dado de cliente ✗); a2 `safety_classification` (itens de arquivo de contexto: safe = convenções, comando de teste local; sensitive = chave de API, lista de clientes, dump de variável de ambiente); a3 `missing_context` (colega quer resultado consistente entre sessões: faltam convencões-do-projeto ✓, comandos-de-verificação ✓; distratores "nome-do-modelo", "temperatura"). Rubric: `r-descreve-convencoes` / `r-mantem-verificacao-local` / `r-exclui-segredos`. **Critério observável:** classifica ≥5 de 6 itens e nomeia os 2 contextos ausentes — score ≥0,75. *(eco dev de l18/l19: a biblioteca de pedidos vira arquivo do repo; gerenciar contexto vira convenção de projeto)*
- **`l34` "Tarefas em etapas: checkpoints humanos"** (5 min, [codificar, avaliar], prereq [l21]). Objetivo: **decompor uma mudança multi-arquivo em passos verificáveis com checkpoint humano a cada passo, em vez de aceitar um "pronto" de uma vez.** a1 `sort` (planejar → executar 1 passo → rodar testes do passo → revisar diff → próximo passo); a2 `choice` (quando aceitar: testes verdes + diff revisado ✓ vs "o assistente disse que terminou" ✗ vs aceitar sem rodar nada ✗); a3 `output_comparison` (plano A em passos pequenos verificáveis vs B big-bang; required: `c-verificavel-por-etapas`, `c-diff-revisavel`). Rubric: `r-divide-em-passos` / `r-verifica-a-cada-passo` / `r-revisa-o-diff`. **Critério observável:** ordena o loop completo e escolhe o critério de aceite com verificação + revisão — score ≥0,75. *(eco dev de l13/l31: o humano valida a cada etapa)*
- **`l35` "Verifique o que não é determinístico"** (5 min, [codificar, decidir], prereq [l17]). Objetivo: **escrever verificação automatizada para saída de IA (contrato/estrutura/invariantes, não string exata) e rodá-la a cada mudança com baseline e revisão humana dos desvios.** a1 `choice` (o que assertar num teste de feature de IA: estrutura esperada ✓, invariantes de negócio ✓ vs frase exata ✗); a2 `sort` (definir exemplos-dourados → rodar na mudança → comparar contra baseline → humano revisa diffs); a3 `missing_context` (pedido de avaliação sem critério-de-aceite ✓ e exemplos-representativos ✓; distratores "nome-do-fornecedor", "prompt-perfeito"). Rubric: `r-testa-contrato-nao-texto` / `r-automatiza-a-verificacao` / `r-guarda-baseline`. **Critério observável:** escolhe asserções de contrato/invariante e monta o ciclo avaliar→comparar→revisar — score ≥0,75. *(eco dev de l20/l21: verificação vira rotina de CI)*

### 3.3 Por que AGORA (ligação com a missão, por persona)

- **Sucessão registrada executada:** o veredito "próxima janela = O3-C1" (AID-610 `c4f68a00`) foi consumido (`f70205de`, l01–l07 agora com 3 atividades). A fila de sucessão está vazia e 0 `planned` — a pergunta do board é a próxima da fila.
- **Alternância de trilhas restaurada e mantida:** dev recebeu 2 das últimas 3 janelas de conteúdo novo (l21–l23, l27–l29); a janela corrente é `ia_pratica`.
- **Não-dev (público primário da missão — "democratizar IA")**: completou pedir→avaliar→proteger→aplicar→rotina→documentos. O próximo degrau real do trabalho é **deixar de refazer o pedido a cada vez** — rotina assistida com controle humano. É o único candidato `ia_pratica` com spec board-vista pronta (custo marginal mínimo) e ataca a tensão central da trilha sem violá-la: automatizar **sem terceirizar o próprio julgamento** (l13; condicionantes anti-R6 herdadas). Market pull de "agentes/automação" reconhecido no case UX §3.1 como a hipótese a favor de (a).
- **Dev ("software robusto com IA")**: o ciclo de tarefa única está completo; o degrau seguinte é **consistência entre sessões e verificação contínua** — exatamente os ecos dev do que W1 ensina ao não-dev (coerência pedagógica entre trilhas, mandato do CD). A disciplina data-informed da casa (AID-610 §8.4) é respeitada: tema final data-gated aos scorecards O1.
- **Ritmo Duolingo-like:** +3 missões `ia_pratica` e +3 `dev` alimentam as janelas de revisão espaçada [1,7,21] (mais material de review); micro-lições 3–5 min preservadas; contiguidade do mapa preservada (ch 21–23 / 17–19); entradas recomendadas intactas.

### 3.4 Anti-escopo

1. Nenhum novo tipo de atividade, nenhuma skill nova (as 8 cobrem o arco), nenhum render de automação real (simulação textual com copy honesta — padrão R1/mod-07).
2. Zero menção a vendor/produto de IA; âncoras de linguagem/framework só pelo precedente l16.
3. Nada toca gates, verifier policy, mastery, learner state, missões promovidas; ondas não editam lições existentes (exceto o companheiro O3-C2, que é retrofit versionado com ruling AID-640 já concedido).
4. Nenhuma produção/spec executável nesta issue; W2 não abre T0 antes do gate de dados §5.
5. Não reabrir decisões do board (AID-576/A escolheu (b) naquela janela; AID-609/A escolheu O1) — este documento propõe o arco **seguinte**.

## 4. Impacto no contrato (nível regra 7)

| Dimensão | W1 (mod-08 l30–l32) | W2 (mod-05 l33–l35) | O3-C2 (l08–l13) |
| --- | --- | --- | --- |
| Emenda T0 | Sim — bloco mod-08 + 3 entradas `planned`; contrato l01..l29→l32; header ia_pratica 20→23; próximo livre → l33 | Sim — estende mod-05 (9→12; mesmo precedente l21–l23/l27–l29); header dev 9→12; próximo livre → l36 | **Não** (nenhum id/módulo/skill novo; regra 3 version bump por lição + `contentVersion`) |
| mission-bindings | Append `ai-pratica` ch 21/22/23; prereqs [l18]/[l12]/[l19]; bump `tracks[ai-pratica].contentVersion` no primeiro binding | Append `dev` ch 17/18/19; prereqs [l16]/[l21]/[l17]; bump `tracks[dev].contentVersion` | Nenhum binding tocado; `requiredActivityIds` + fixtures regenerados |
| mission_catalog_rules | Contiguidade 1–23; entrada `l02` intacta | Contiguidade 1–19; entrada `game-02-warehouse` intacta | Inalterado |
| Standalone LiteracyDojo | mod-08 "em breve" na T0 (`hasContent: false`) → real em T1–T3 | Zero mudança (`dev` filtrado) | Lições do miolo ficam com granularidade de score (sem nova missão) |

## 5. Protocolo de calibração com dados (quando `measurement`/síntese chegarem)

Regras de decisão pré-registradas (executáveis pelo SM na triagem D ou pelo CD na spec):

1. **Se o funil de ativação mostrar queda concentrada em l08–l11** (o miolo de 1 atividade — hipótese registrada em AID-558 §1.2): **puxar O3-C2 para antes de W1** (a resposta padrão é consolidação, não conteúdo novo).
2. **Se o drop-off se concentrar nas missões de anexos (l24–l26)** ou na ativação inicial (entrada `l02`): tratar como problema de UX/fricção (rotear à UX, AID-1213) — não muda este arco.
3. **Se houver sinal de conclusão saudável no fim do arco `ia_pratica`** (l20/l26 concluídas por fração relevante dos que entram): confirma W1 — há população atingindo o fim e sem próximo degrau.
4. **Se os scorecards O1 apontarem fricção de contexto/verificação** (o learner-dev perdido entre sessões, confiando cegamente no assistente): confirma o tema líder de W2; **se apontarem segurança/dados**: usa o alternativo registrado; **sem dados até a T0 de W2**: vale o líder (§3.2).
5. **Sem tráfego real na janela** (exports só sintéticos): W1 permanece válida (decidida por sucessão+custo, não por demanda), W2 adia o gate uma janela e O3-C2 ganha prioridade relativa (trabalhar qualidade do núcleo enquanto não há sinal de demanda).

## 6. Esforço e pipeline (padrão AID-426/AID-471; estrutura herda readiness AID-525)

| Item | W1 | W2 | O3-C2 |
| --- | --- | --- | --- |
| Spec | ≈15–30 min (re-id da rev 1 §5) + re-gate | ≈1 heartbeat (spec nova com briefs §3.2 como base) | n/a (padrão AID-644/648 já provado em O3-C1) |
| Autoria CD | ≈5–6h (estimativa registrada AID-526/528) | ≈5,5–7h | ≈7–9h (12 atividades × 0,5–0,75h, ruling AID-640 aplicado) |
| FPE / QA | ~2h T0–T3+promoção; QA 1 ciclo | idem | ~1–1,5h; QA sobre 6 lições modificadas |

Sequência recomendada: triagem D → T0 W1 → T1–T3 W1 ∥ O3-C2 (autores distintos possíveis; O3-C2 sem T0) → gate de dados W2 → T0–T3 W2. Promoção única por onda; QA wave-level independente.

## 7. Método de verificação e fontes

Inventário executado first-hand no clone read-only (main `e839d0fc`): parse do catálogo e bindings; contagem de atividades por lição nos 29 YAML (l08–l13 = 1 atividade cada; demais = 3); estado do pipeline (0 `planned`); regra 7 (próximo livre `l30`). Documentos citados por revisão/issue: AID-558 rev 2, AID-528 revs 1–3, AID-524, AID-576/A, AID-609/A, AID-610 (spec + comentário `c4f68a00`), AID-640, AID-909 (tracker hb9), AID-1212 (estado verificado 09-10). Eficácia pedagógica **não presumida**: teste moderado UX e funil O1 são os instrumentos; analytics ≠ evidência.

## 8. Decisões reservadas (não tomadas aqui)

1. **Aprovação do arco e sequência** — SM (triagem AID-1215) + product owner; dispatch e issues de produção: CEO.
2. **Emenda T0 (texto literal)** — System Designer (base: §3.1 e AID-528 rev 1 §3/§4 deltas (a)).
3. **Tema final de W2** — gate de dados §5 (scorecards O1 + síntese UX AID-1213); fallback: candidato líder.
4. **Critérios de eficácia e teste moderado** — UX Designer.
5. **GO/NO-GO de QA e re-grant** — QA Lead (produtor ≠ verificador).
