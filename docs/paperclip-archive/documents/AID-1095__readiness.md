<!-- issue: AID-1095 | key: readiness | doc_id: 9c751aa3-7618-48ca-be53-9fce489ae6a2 | updated: 2026-09-09 02:23:19.796+00 -->

# AID-1095 — mod-08+ authoring readiness: template de autoria + checklist + esforço + skeletons do próximo arco (l30+)

(AID-1095)

# AID-1095 — mod-08+ authoring readiness: template de autoria + checklist + esforço + skeletons do próximo arco (l30+)

**Status:** ONBOARDING + READINESS concluídos — somente leitura do repo; nenhuma escrita canônica (nenhum commit/branch/PR; catálogo, contrato, bindings, pins, produção e estado learner intocados).
**Owner:** Content Designer (f2b1e95d). Primeiro Mandato despachado como issue — ORDEM AID-1092/A (sweep de desbloqueio da CEO, 2026-09-09).
**Baseline lida e citada (first-hand, workspace intocado):** `main` @ `4234cebc` — `curriculum/ai-literacy/catalog.yaml` (`contentVersion "2026-09-06.1"`, **29/29 `ready`, 0 `planned`, 7 módulos**); `docs/design/ai-literacy/content-contract.md` (linha 155: próximo id livre **`l30`**) + `evidence-contract.md` (envelope `literacy-evidence` v1); `schemas/lesson.schema.json` + `rubric.schema.json`; `tools/` (validador semântico lido); os 29 YAML de `modules/` (contagens de atividades/linhas por grep); `engines/codexdojo-os-prototype/config/mission-bindings.yaml` (ai-pratica chapterOrder 1–20 contíguo; dev 1–13); `engines/literacyDojo/src/domain/progress.ts` (`moduleCheckpoints` — corredor C2 pousado). Board: readiness AID-525 (doc `readiness`, precedente direto), spec AID-528 rev 3 (onda O2 l24–l26), spec AID-610 rev 2 (onda O1 l27–l29), spec AID-915/916 (corredor C2), AID-913/AID-935/AID-940 (telemetria + funil live nas 2 superfícies), draft AID-447 (OP-C, rev `dd27311c`), fio AID-426 (padrão T0–T3).
**Governança (regra 7):** ids `l30+`/`mod-08` só existem com **emenda aprovada pelo board**. Os skeletons do §5 são propostas de *brief*, não conteúdo de produção; nenhum id é criado aqui.

---

## 0. Sumário executivo

- **Problema:** o pipeline de conteúdo está 29/29 `ready`, 0 `planned` — a próxima onda (l30+) depende de emenda board-gated, e o passo longo do arco é a spec/autoria (precedente C1–C3: T0–T3 + promoção em ~2h de wall-clock **depois** da spec pronta). O readiness vigente do CD (AID-525) descreve o estado **pré-l24** — dois terços dos candidatos OP-C já pousaram desde então e precisam de reconciliação.
- **Entregável (5 seções, conforme a ordem):** (§2) template de autoria por lição; (§3) checklist de qualidade por lição e por lote; (§4) estimativa de esforço; (§5) skeletons de brief do próximo arco reconciliados com o estado real; (§1.2/§6) reconciliação de ids e divergências.
- **Achados first-hand principais:** (i) próximo id livre é **`l30`** (contrato linha 155 + catálogo max `l29`) — a menção a `l21` nas minhas instruções está defasada em duas ondas (§1.2); (ii) dos 3 temas candidatos do OP-C (AID-447), **(b) multimodal e (c) dev testes/revisão JÁ FORAM COBERTOS** (l24–l26 mod-07; l21–l23 + aprofundamento l27–l29) — resta **(a) "Rotina com IA II" (automação/agentes)** como candidato natural de **mod-08** `ia_pratica`; (iii) o contexto de cadência mudou para melhor: telemetria + funil anonimizado estão live (AID-913/AID-940), e o corredor C2 provou o padrão "valor sem emenda" (checkpoints por composição, zero ids novos).
- **Recomendação de tamanho (para a CEO planejar cadência):** onda **mod-08 de 3 lições** (`l30–l32` provisórios) sobre o tema (a), após learner-needs case (UX) + emenda T0; **mínimo viável = 2 lições como prefixo** do chapterOrder (regra de contiguidade do mission catalog). Alternativa sem-T0 registrada em §5.(b).

---

## 1. Onboarding — o que foi verificado (evidence-backed)

### 1.1 Contrato de conteúdo (estado @ `4234cebc`)
- `LessonDefinition` canônica: `id` estável (`lNN`), `version ≥ 1` (toda mudança incrementa), `moduleId`, `title`, `objective` observável, `estimatedMinutes ∈ {3,4,5}`, `skillIds`, `prerequisites` (grafo sem ciclos), `activities[]`, `rubric`, `evidence`, `review`, `completion`. Build falha em: minutos fora de {3,4,5}, versão inválida, lição sem rubrica, atividade sem avaliação ou sem `onFailure`, `requiredActivityIds` inexistente (contrato + `tools/semantic.py` — mensagens de erro conferidas).
- **7 tipos de atividade** (união discriminada por `type`): `choice`, `sort`, `missing_context`, `safety_classification`, `prompt_builder`, `output_comparison`, `rubric_review`. Toda atividade carrega `id` estável `lNN-aM`, `skillId`, `instruction` simples, `data`, `evaluation` determinística, `feedback` (`onFailure` obrigatório; `onSuccess`/`perCheck` por convenção), `storage.policy`, `hints` 1–3 progressivas.
- Catálogo ↔ arquivo devem concordar em `moduleId`, `title`, `estimatedMinutes`, `prerequisites`, `skillIds` (divergência falha o build — validado campo a campo). `planned` não exige arquivo e não entra no read model (`hasContent: false` → "Em breve" no mapa).
- Jornadas: `ia_pratica` = mod-01–04, 06, 07 (20 lições); `dev` = mod-05 (9 lições, missões hospedadas do OS). Evidência: envelope `literacy-evidence` v1, `deterministicChecks` estruturados, `verifierRequired: true`, `mastered` reservado a verificador independente (produtor ≠ verificador).

### 1.2 Reconciliação de ids e divergências (entregável 5 da ordem)
- **Próximo id livre = `l30`, confirmado em 2 fontes independentes:** contrato linha 155 ("próximo livre após `l29`: `l30`; ids nunca são reutilizados") e catálogo (última lição = `l29` "Avalie as dependências sugeridas", mod-05, `ready`). Modules 01–07 presentes; **mod-08** seria o próximo módulo (ids sequenciais, nunca aposentados).
- **Divergência 1 (reportada conforme a ordem):** minhas instruções de agente dizem "next free id is l21" — **defasado em duas ondas** (era verdade no contexto AID-525/AID-558, antes dos re-ids O1/O2). Estado real: `l30`. Nenhum impacto além de leitura: a regra operacional é a mesma (emenda board-gated, regra 7).
- **Divergência 2 (tema do mod-07):** o mod-07 pousou com o tema **(b) multimodal "IA além do texto"** (l24–l26, decisão CEO AID-576/A → O2), **não** com o tema (a) "Rotina com IA II" que o skeleton AID-525 §5(a)/original AID-447 carregava como candidato primário do slot mod-07. Consequência: o tema (a) permanece **não coberto** e é o candidato remanescente do OP-C (§5).
- Missions/bindings: track `ai-pratica` chapterOrder **1–20 contíguo** (l24=18, l25=19, l26=20); track dev 1–13. Lições `l30+` em `ia_pratica` tomariam **chapterOrder 21+**.

### 1.3 Ondas de precedente — padrões reutilizados neste doc
| Onda | Veículo | Padrão herdado |
| --- | --- | --- |
| C1–C3 (l18–l20, mod-06) | spec AID-414 → emenda T0 (PR #199) → T1–T3 (1 lição/tarefa) → promoção única `69bb67a7` → QA wave-level | Convenções por lição (§2.3), split T0–T3 com critérios de aceite, ids em ordem de produção, desvios divulgados, **~2h wall-clock pós-spec** |
| C4/C5 (bindings l15–l17 + game-06) | AID-410/AID-412 | QA wave-level + re-grant de readiness como propriedade da QA |
| OP-A (game-07/08/09) | AID-462 | Registro `_work-products/`, precheck estendido por onda |
| **O2** (l24–l26, mod-07 multimodal) | spec AID-528 rev 3 → T0 → T1–T3 → promoção única | **Prereqs todos canônicos pré-existentes ⇒ T1–T3 paralelizáveis**; onda mínima viável = **prefixo** do chapterOrder; emenda com texto literal na spec (§3 do padrão AID-528) |
| **O1** (l27–l29, dev "ciclo de evolução") | spec AID-610 rev 2 | Mesmo pipeline no lado dev; aprofunda em vez de sobrepor |
| **C2 corredor** (mod-01→03) | spec AID-915 → AID-916/FPE | **Valor sem emenda**: checkpoints `cp-01..03` por composição runtime de atividades existentes (zero ids de lição), revisão [1,7,21] medida, grandfathering integral |
| Telemetria/funil | AID-913 → AID-935 (deploy) → AID-940 (funil 2026-09-06) | Funil anonimizado live nas 2 superfícies — a próxima onda já nasce **observável** (direcional; sem alegação de eficácia) |

### 1.4 Anatomia calibrada (contagens first-hand por grep)
- Ondas recentes: **3 atividades/lição, 130–180 linhas YAML** (l24=154, l25=150, l26=139, l27=153, l28=137, l29=154; módulo dev l16=180 é o teto).
- **Gap de retrofit aberto:** l08–l13 têm **1 atividade** cada (61–87 linhas) — padrão pré-C1–C3; candidatas à janela de consolidação sem-T0 (§5.(b)).

---

## 2. Componente 1 — Template de autoria por lição

### 2.1 Esqueleto canônico (YAML — forma exata; preencher, não reformatar)

```yaml
# Lição lNN — Onda <id> (brief AID-<n> §<x>): <tema curto>.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: lNN                    # alocado só pós-emenda; nunca deriva do título
version: 1                 # toda alteração de conteúdo incrementa
moduleId: mod-08           # pós-emenda (ia_pratica) — ou módulo definido na emenda
title: "<PT-BR: imperativo, ≤8 palavras, específico do ganho>"
objective: "<comportamento observável: 'Diante de X, fazer Y com critério Z' — herda o estilo de l18–l29>"
estimatedMinutes: 4        # 3 | 4 | 5 (3 atividades padrão; 5 se houver transcrito longo)
skillIds: [<fechado: entender|pedir|avaliar|proteger|aplicar|decidir|codificar|integrar>]
prerequisites: [lMM]       # âncora canônica pré-existente (grafo acíclico, intra-journey)

activities:
  - id: lNN-a1             # estável; a1..aM em ordem de dificuldade crescente
    type: <um dos 7>       # ver §2.2; diversificar dentro da lição e na onda
    skillId: <de skillIds>
    instruction: "<uma frase, linguagem simples, MAIÚSCULAS só na pergunta-chave (padrão l18+)>"
    data: {...}            # obrigatório por tipo (§2.2)
    evaluation:
      strategy: deterministic
      <checks por tipo>    # §2.2 — referenciam APENAS ids declarados em data
    feedback:
      onFailure: "<por que errou + o que faria acertar; nomeia a regra, não só 'tente de novo'>"
      perCheck: {...}      # por campo/critério/opção (padrão l18+/l24+)
      onSuccess: "<reforça o hábito/transferência>"
    storage:
      policy: structured_only   # padrão da trilha; digest_only/none só com justificativa
    hints:                 # 1–3, progressivas: (1) pergunta de reflexão; (2) redução; (3) quase-resposta
      - "..."

rubric:
  id: lNN-rubric
  criteria:                # 3 critérios, cada um verificável separadamente, weight 1
    - { id: r-<kebab>, text: "<critério observável>", weight: 1 }

evidence:
  verifierRequired: true
  completionClaim: lesson_completed
  includesFreeText: false

review:
  intervalsDays: [1, 7, 21]

completion:
  minimumScore: 0.75
  requiredActivityIds: [lNN-a1, lNN-a2, lNN-a3]
```

### 2.2 Os 7 tipos — carta de autoria (obrigatórios de `data`/`evaluation` + precedente na trilha)

| `type` | Pessoa faz | `data` obrigatório | `evaluation` obrigatório | Notas de autoria (precedente) |
| --- | --- | --- | --- | --- |
| `choice` | escolhe opções | `options[]` ≥2 (`prompt?`, `multiSelect?`) | `correctOptionIds[]` | distratores plausíveis sem ambiguidade; multiSelect p/ "marque todos" (l20-a1, l24-a1, l26-a2) |
| `sort` | ordena partes | `items[]` ≥2 | `expectedOrder[]` (permutação dos ids) | procedimentos/planos/hierarquias; fecha arcos de módulo (l19-a2, l20-a2, l26-a3) |
| `missing_context` | identifica contexto ausente | `prompt`, `contextOptions[]` | `requiredContextIds[]` (`optionalContextIds?`) | pedidos incompletos; distratores "mito de modelo" funcionam (l19-a1, l24-a3, l25-a3) |
| `safety_classification` | classifica seguro/sensível | `labels {safe,sensitive}`, `items[]` ≥3 | `classification` (todos os itens) | natural para `proteger` (l12, l23-a2, l25-a1); sem PII real |
| `prompt_builder` | monta pedido por campos | `scenario`, `genericPrompt`, `fields[]` ≥2 (`id`,`label`,`hint`) | `fields {fieldId: {minLength? \| mustIncludeAny?}}` | carro-chefe de `pedir`; `mustIncludeAny` cobre variantes PT com/sem acento (l05/l18-a1/l24-a2) |
| `output_comparison` | compara saídas | `scenario`, `outputs[]` ≥2, `criteria[]` ≥2 | `betterOutputId`, `requiredCriterionIds[]` | A = boa prática, B = anti-padrão; critérios nomeiam a regra (l15-a2, l18-a2, l26-a1) |
| `rubric_review` | revisa resposta por critérios | `responseText`, `criteria[]` ≥2 | `expectedVerdicts {met\|partial\|not_met}` | **tipo maduro — provado 3× em produção** (l09-a1, l16-a2, l22-a1); elegível a qualquer onda por fit temático (nota de escopo AID-528 rev 3 §2.3) |

### 2.3 Convenções herdadas (C1–C3/spec AID-414 §2 → O2/O1 — sem exceções)
`evaluation.strategy: deterministic`; `feedback.onFailure` **e** `onSuccess` (+ `perCheck` quando houver campos/critérios); `hints` 1–3 progressivas; `storage.policy: structured_only`; `evidence: {verifierRequired: true, completionClaim: lesson_completed, includesFreeText: false}`; `review.intervalsDays: [1,7,21]`; `completion.minimumScore: 0.75` com **todas** as atividades em `requiredActivityIds`; rubrica `lNN-rubric` com 3 critérios weight 1; `version: 1` inicial; conteúdo pt-BR, linguagem simples; checks referenciam apenas ids declarados em `data`; checks de texto aceitam variantes PT. **Vendor-neutral** (nenhuma lição cita produto/ferramenta específica de IA); copy honesta quando o cenário simula o que na vida real acontece em outra superfície (padrão l24-a2).
**Notas novas pós-O2/C2:** (i) lições `l30+` entram no fim da track `ai-pratica` (chapterOrder 21+ contíguo); (ii) **checkpoints não são lições** — composição runtime de atividades existentes (AID-915 §2): lições novas não alteram `cp-01..03`, e checkpoint em mod-04+ é ativação futura por decisão de conteúdo (não exige emenda); (iii) revisão espaçada por skill agenda automaticamente lições novas pelas janelas [1,7,21] — nenhum campo extra na lição.

---

## 3. Componente 2 — Checklist de qualidade (padrão AID-426/AID-471, atualizado pós-O2/C2)

### 3.1 Por lição (autor — antes de entregar draft ao FPE)
1. **Contrato:** 7 tipos somente; `strategy: deterministic`; `onFailure` em toda atividade; `hints` 1–3; `storage` declarado; `estimatedMinutes ∈ {3,4,5}` coerente com volume (transcrito longo ⇒ 5).
2. **Checks:** todo check referencia id declarado em `data` (validador); `mustIncludeAny` cobre variantes PT; exatamente uma resposta correta não ambígua em `choice`/`output_comparison`; `expectedOrder` é permutação válida; `classification` cobre todos os itens; `expectedVerdicts` cobre todos os critérios.
3. **Rubrica:** 3 critérios verificáveis separadamente, alinhados às atividades; ids `r-<kebab>` sem typos (precedente de normalização em produção).
4. **Evidência v1:** bloco `evidence` idêntico ao §2.3; nenhum texto livre persistido; nada diz `mastered`.
5. **Catálogo:** `moduleId`/`title`/`estimatedMinutes`/`prerequisites`/`skillIds` idênticos à entrada do catálogo; prereq acíclico, intra-journey, **âncora canônica pré-existente** (propriedade O2: T1–T3 paralelizáveis); `skillId` de cada atividade ∈ `skillIds` da lição.
6. **Pedagogia:** objetivo observável (verbo + critério); progressão a1→a2→a3; cenários realistas de trabalho PT-BR; diversidade de tipos dentro da lição e **na onda** (nenhum tipo dominando as 3 lições — distribuição O2: choice ×3, demais ×1 cada); feedback ensina a regra, não só corrige.
7. **Segurança/PII:** nenhum dado pessoal real em cenários; itens de `safety_classification` plausíveis e inofensivos; tema sensível tratado com `proteger` quando cabível.
8. **Custo de leitura:** lição fechada em **130–160 linhas** YAML (teto observado 180 em l16); se passar, simplificar cenário — não cortar feedback.

### 3.2 Por lote (onda — portas sequenciais)
1. **Pre-condição de governança:** emenda T0 aprovada pelo board **antes** de qualquer arquivo `ready` (regra 7; lições entram na emenda como `planned`, flip `ready` só com arquivo — regra 5); texto literal da emenda vem na spec (padrão AID-528 §3), com bump duplo da regra 7 ("após `lNN`: `lNN+3`") e contagens re-gated.
2. **Porta FPE (por tarefa, 1 lição = 1 tarefa):** `validate.py` verde; `gen:content` verde; read model contém a lição no módulo; regras do mission catalog verdes (**chapterOrder 21+ contíguo intra-track**, prereq canônico, entrada `l02` intacta); missão jogável hosted + fallback DOM; evidência `literacy-evidence` v1 `verifierRequired: true`; CI verde; **bump ÚNICO de `contentVersion` por onda**.
3. **Porta de onda:** promoção **ÚNICA** ao fim (nenhum deploy intermediário exponha lição parcial — padrão C1–C3/O2); precheck de produção estendido à onda (motor hosted das novas lições, contentVersion, mapa **33→36 missões**, corredor/checkpoints intactos, funil AID-940 sem regressão).
4. **Porta QA:** issue wave-level independente para QA Lead (produtor ≠ verificador; padrão AID-412/AID-444/AID-464) — GO/NO-GO + re-grant de readiness é propriedade da QA.
5. **Rastreabilidade:** comentário de landing por tarefa na issue de produção; registro `_work-products/AID-<ordem>/WAVE-PROMOTION-<pin>.md`; desvios do spec divulgados no landing.

---

## 4. Componente 3 — Estimativa de esforço

### 4.1 Por lição (autor — Content Designer)
| Item | Esforço | Base |
| --- | --- | --- |
| Brief/spec-grade da lição (objetivo, prereq, 3 atividades com cenário, checks, rubric) | 40–60 min | padrão AID-414 §2 / AID-528 §2; anatomia l18–l29 |
| Draft YAML completo (feedback 3 vias + hints + perCheck + variantes PT) | 30–45 min | 130–160 linhas; tuning de `mustIncludeAny` |
| Ciclo de revisão pós-validação (FPE roda `validate.py`; ajustes de checks/rubric) | 15–30 min | precedentes de normalização em produção |
| **Total por lição** | **≈ 1,5–2,25 h** | |

### 4.2 Por onda de 3 (l30–l32 provisórios)
| Item | Esforço | Dono |
| --- | --- | --- |
| Readiness (este doc §5) → spec no padrão AID-414/AID-528 | ≈ 0,5 dia (spec final curta pós-briefs prontos) | CD (+ System Designer no padrão AID-414) |
| Emenda T0 (docs + schema desc + catalog `planned`) | baixo; pré-carregável antecipadamente (PR #199 precedente) | FPE (texto da spec) |
| T1–T3 produção (1 lição/tarefa: arquivo + flip ready + binding + bump contentVersion) | ~2h wall-clock a onda inteira (C1–C3: T0 01:16Z → promoção ~03:2xZ) | FPE |
| Promoção única + precheck estendido | incluído acima | FPE |
| QA wave-level (GO/NO-GO + re-grant readiness) | 1 ciclo QA | QA Lead |
| **Capacidade CD líquida:** drafts de 3 lições + revisões | **≈ 5–7 h** (2–3 heartbeats) | CD |

- **Onda mínima viável:** 2 lições — obrigatoriamente um **prefixo** do chapterOrder (contiguidade do mission catalog; precedente O2 §1.3); a 3ª realoca à onda seguinte.
- Risco de esforço concentrado: transcritos multi-turno e `rubric_review` são os tipos mais caros (autorais); `choice`/`sort` os mais baratos — equilibrar a mistura por onda controla custo. Tema (a) usa os 6 tipos provados sem custo extra (§5).

---

## 5. Componente 4 — Skeletons de brief do próximo arco (l30+)

> **Governança:** ids `l30–l32` abaixo são **provisórios**, alocados em ordem de produção (precedente AID-414 §1.3), e só viram reais com emenda aprovada (regra 7). Módulo/journey propostos são input para a spec do System Designer, não decisão. **Nenhum conteúdo final aqui.** Tema é decisão de learner-needs (UX) + board — nada é pré-escolhido.

### 5.0 Reconciliação dos candidatos OP-C (draft AID-447 rev `dd27311c`) com o estado real
| Candidato OP-C | Estado @ `4234cebc` | Conclusão |
| --- | --- | --- |
| (a) mod-07 "Rotina com IA II" — agentes/automação de tarefas repetitivas | **Não coberto** — mod-06 cobre reuso de pedidos (l18), conversas longas (l19), verificação (l20); nenhuma lição trata automatizar rotina com ponto de controle humano | **Candidato remanescente → mod-08** (skeleton §5.a) |
| (b) ia_pratica multimodal — imagens e documentos no pedido | **Coberto** — mod-07 "IA além do texto" l24–l26 (spec AID-528 rev 3, decisão AID-576/A → O2) | fechado |
| (c) dev l21+ — testes e revisão de código com IA | **Coberto e aprofundado** — l21–l23 (testes, revisão, limites) + l27–l29 (debug, refactor, dependências — "ciclo de evolução", AID-610 rev 2) | fechado |

**Argumento para mod-08 (pedido na ordem):** como (b) e (c) pousaram, a única lacuna OP-C aberta é (a); o padrão de colocação vigente favorece **módulo novo** (`order: 8`, `journey: ia_pratica`, zero skill nova — `skillIds: [pedir, avaliar, proteger, aplicar]`, emenda de escopo mínimo) em vez de estender módulos fechados com progresso existente (precedente AID-414 §1.4 / AID-528 §1.1). Trade-off conhecido e contratado: o standalone exibe mod-08 "Em breve" na T0 (`planned`/`hasContent: false`).

### 5.(a) mod-08 ia_pratica — "Rotina com IA II: automação com ponto de controle humano" (tema OP-C (a))
- **Hipótese de learner-needs (a validar pela UX):** continuação natural de mod-06 — l18 já ensina reuso de pedidos; a lacuna é decidir **o que** automatizar e **onde manter o humano no loop**. Custo de adoção baixo: cenários de rotina já usados na trilha (relatório semanal, e-mails, resumo de atas). Risco pedagógico baixo: zero conceito técnico novo — "automação/agente" permanece vocabulário de cenário, não tema (anti-R5 do padrão O2).
- **Propriedade estrutural (herdada de O2 §1.3):** prereqs todos canônicos pré-existentes ⇒ T1–T3 paralelizáveis pós-T0; chapterOrder ai-pratica 21–23 contíguo.
- **`l30` "O que vale automatizar"** (4 min, [pedir, aplicar], prereq **[l18]**): a1 `choice` multiSelect — marcar tarefas candidatas a automatizar com pedido-padrão: repetitiva+estruturada+baixo risco ✓✓ vs. julgamento delicado/risco alto ✗ (distratores plausíveis: "tarefa que você nunca fez", "decisão que afeta pessoas"); a2 `prompt_builder` — transformar a tarefa repetitiva do cenário em pedido-padrão parametrizado (campos: tarefa, variáveis que mudam a cada semana, formato — continua l18; `mustIncludeAny` com variantes PT); a3 `output_comparison` — rotina automatizada **com revisão humana antes do uso** vs. envio automático sem verificação (critérios nomeiam a regra). Rubric: `r-identifica-candidato` (repetitiva+estruturada+baixo risco), `r-parametriza-o-pedido`, `r-mantem-ponto-de-controle`.
- **`l31` "Pequenas automações: onde o humano valida"** (4 min, [avaliar, proteger], prereq **[l12]**): a1 `safety_classification` — saídas de rotina automatizada: uso direto (rascunho de e-mail interno, lista de tarefas) vs. exige checagem humana (valores, nomes de pessoas, qualquer coisa que vá para fora); a2 `missing_context` — pedido de automação sem definir gatilho/escala/limite (distratores "mito de modelo": "usar um modelo maior", "pedir para a IA ter cuidado"); a3 `sort` — ordem segura de adoção: piloto pequeno → revisão manual de tudo → ampliar gradualmente → revisar por amostragem. Rubric: `r-classifica-o-que-sai`, `r-nomea-o-que-falta` (gatilho/escala/limite), `r-sequencia-a-adocao`.
- **`l32` "Quando a rotina automatizada erra"** (3–4 min, [avaliar], prereq **[l19]**): a1 `choice` — sinal de que a rotina degradou (saída ficou genérica/desatualizada vs. ruído normal); a2 `output_comparison` — correção mínima do pedido (repor o contexto perdido — ecoa l19) vs. descartar e recomeçar do zero (ecoa l07); a3 `missing_context` — o que o pedido de correção precisa trazer: o caso que falhou + esperado-vs-observado. Rubric: `r-detecta-o-desvio`, `r-corrige-minimamente`, `r-repo-o-contexto`.
- **Viabilidade/custo (para o learner-needs case):** viabilidade **alta** (cenários derivam de l18/l19/l12; tipos baratos/médios — nenhum `rubric_review`, transcritos curtos); custo CD ≈ **5–6 h** a onda de 3; risco **baixo**. Trade-off divulgado: sobreposição **intencional** com mod-06 (retenção por releitura nas janelas [1,7,21], não novidade) — coerente com o ritmo Duolingo da missão.

### 5.(b) Alternativas registradas (sem skeleton completo — exigem input antes de brief)
- **Dev pós-l29 (próxima janela dev):** natural **após o funil O1** (n=5–8 devs, janela ~09-23, founder-gated) — o tema deve vir do learner-needs com os dados do funil AID-940 em mãos; skills existentes (`codificar`, `decidir`, `integrar`) cobrem sem emenda de skill. Não pré-escolho tema (boundary: opinião não substitui pesquisa).
- **Consolidação sem-T0 (estilo O3-C1/AID-558 §2):** retrofit de l08–l13 ao padrão de 3 atividades — zero ids novos, zero emenda; **risco estrutural conhecido**: atividades novas des-completam lições concluídas (`progress.ts:364` `missingActivityIds`) ⇒ exige ruling de migração/grandfathering (padrão C2) como porta da spec. Candidata a janela de consolidação, não à onda l30+.
- **Checkpoint em mod-04..07:** ativação do padrão C2 para o resto do corredor — decisão de conteúdo, zero emenda (composição runtime); pode acompanhar qualquer onda como anexo de spec.

### 5.x Comparativo para a CEO (resumo)
| Candidato | Viabilidade autoria | Custo CD | Risco | Gate |
| --- | --- | --- | --- | --- |
| (a) mod-08 automação (l30–l32) | alta | ≈ 5–6 h | baixo | emenda T0 + learner-needs UX |
| dev pós-l29 | alta (anatomia madura) | ≈ 5–7 h | médio (audiência) | emenda T0 + funil O1 (09-23) |
| consolidação l08–l13 | alta | ≈ 8–12 h (AID-559) | estrutural (des-completar) | zero T0; ruling de migração |

---

## 6. Próximos passos (handoff — sem trabalho não-atribuído iniciado)
1. **UX (learner-needs case):** §5.x responde viabilidade/custo; tema (a) é o candidato OP-C remanescente, mas a escolha é do case + board.
2. **Pós-escolha:** spec do System Designer no padrão AID-414/AID-528 (usar §2/§3/§4 como anexo de autoria; texto literal da emenda na spec, bump duplo da regra 7 "após `l32`: `l33`") → emenda T0 board-gated → T1–T3 FPE (1 lição/tarefa) → promoção única → QA wave-level.
3. **Recomendação de cadência (pergunta da ordem):** onda de **3 lições** (l30–l32) num módulo novo mod-08; mínimo viável 2 (prefixo). Com o funil live (AID-940), a onda já nasce observável — recomendo agendar a leitura de funil **da janela da onda** como porta de decisão para a onda seguinte (substituir crença por medida, nota epistêmica AID-447).
4. **Boundaries respeitados:** nenhuma escrita canônica; nenhum id/módulo criado; nenhum gate/estado learner/promoted mission tocado; nenhum `mastered` ou alegação de eficácia (funil n=5–8 permanece direcional).
