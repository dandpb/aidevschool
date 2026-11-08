<!-- issue: AID-525 | key: readiness | doc_id: 60b61f00-98c8-47ae-95f1-198f38a384f3 | updated: 2026-09-01 13:11:26.152+00 -->

# AID-525 — mod-07 authoring readiness: template de autoria, checklist de lote, esforço e brief skeletons (OP-C/AID-447)

(AID-525)

# AID-525 — mod-07 authoring readiness (Content Designer, primeiro mandato)

**Status:** ONBOARDING + READINESS concluídos — somente leitura; nenhuma escrita canônica (nenhum commit/branch/PR; catálogo, contrato, bindings, pins e produção intocados).
**Owner:** Content Designer (f2b1e95d). Primeira ordem pós-contratação (ORDEM CEO AID-523/B; contratação `ae63c0d8` → `opb-content-hire`, AID-483).
**Baseline lida e citada (via `git show origin/main:<path>`, sem checkout):** `docs/design/ai-literacy/content-contract.md` e `evidence-contract.md`; `curriculum/ai-literacy/catalog.yaml` (`contentVersion 2026-08-31.1`, 20/20 `ready`, 0 `planned`); `schemas/lesson.schema.json` + `rubric.schema.json`; lições de referência l18/l19/l20 (anatomia) e l05/l12/l14/l15/l16/l17 (padrões por tipo de atividade); work-products `_work-products/AID-440/WAVE-PROMOTION-69bb67a7.md` (onda C1–C3) e `_work-products/AID-462/WAVE-PROMOTION-9a22041b.md` (onda OP-A); spec AID-414 (doc `spec` rev `ce535af7` — template de spec/emenda); draft AID-447 (doc `draft` rev `dd27311c` — OP-C e candidatos mod-07); fio AID-426 (padrão de produção em lote T0–T3); ORDEM AID-524 (learner-needs case da UX).
**Este doc NÃO rascunha conteúdo final:** ids `l21+` dependem de emenda aprovada pelo board (regra 7 do contrato; precedente PR #199/T0). Os skeletons do §5 são proposições de *brief*, não conteúdo de produção.

---

## 0. Sumário executivo

- **Problema:** OP-C (nova onda l21+) tem padrão de execução provado (C1–C3: T0–T3+promoção em ~2h de wall-clock pós-spec), mas a etapa longa é a **spec/autoria** — e não existia template de autoria, checklist de qualidade por lote nem estimativa de esforço do lado do Content Designer. O learner-needs case AID-524 (UX) também precisa de input de viabilidade/custo de autoria por candidato.
- **Entregável deste doc (4 componentes, conforme escopo):** (§2) template de autoria por lição; (§3) checklist de qualidade por lote (padrão AID-426/AID-471); (§4) estimativa de esforço por lição e por onda de 3; (§5) skeletons de brief dos 3 temas candidatos do OP-C (rev `dd27311c`).
- **Impacto de aprendizagem:** reduz o passo longo do arco (spec) e antecipa riscos pedagógicos (prereqs, skills, adequação aos 7 tipos) antes do gate de board — sem violar a regra 7.
- **Recomendação:** §5 fornece custo/risco de autoria por candidato para a AID-524; nenhum tema é pré-escolhido aqui (decisão é de learner-needs + board). Skills existentes (8) são suficientes para os 3 candidatos — recomendo **não** propor skill nova na emenda (escopo mínimo).

---

## 1. Onboarding — o que foi verificado (evidence-backed)

### 1.1 Contrato de conteúdo (estado @ main)
- `LessonDefinition` canônica: `id` estável (`lNN`), `version` ≥1 (toda mudança incrementa), `moduleId`, `title`, `objective` observável, `estimatedMinutes ∈ {3,4,5}`, `skillIds`, `prerequisites` (grafo sem ciclos), `activities[]`, `rubric`, `evidence`, `review`, `completion`. Build falha em: minutos fora {3,4,5}, versão inválida, lição sem rubrica, atividade sem avaliação ou sem `onFailure`, `requiredActivityIds` inexistente.
- **7 tipos de atividade** (união discriminada por `type`): `choice`, `sort`, `missing_context`, `safety_classification`, `prompt_builder`, `output_comparison`, `rubric_review`. Toda atividade carrega `id` estável `lNN-aM`, `skillId`, `instruction` em linguagem simples, `data`, `evaluation` determinística, `feedback` (`onFailure` obrigatório), `storage.policy` e `hints` opcionais 1–3 progressivas.
- **Regra 7 (vigente):** extensão/aposentação de ids exige emenda via issue aprovada pelo board; próximo id livre `l21`; ids nunca reutilizados. **Toda autoria mod-07 começa gated.**
- Catálogo ↔ arquivo devem concordar em `moduleId`, `title`, `estimatedMinutes`, `prerequisites`, `skillIds` (divergência falha o build). Lições `planned` não exigem arquivo e não entram no read model (`hasContent: false` → "Em breve").
- Evidência: envelope `literacy-evidence` v1 (`LiteracyEvidenceRecord`), `deterministicChecks` estruturados (nunca texto livre), `verifierRequired: true` literal, `mastered` reservado a verificador independente (produtor ≠ verificador).

### 1.2 Ondas precedentes — padrões reutilizados neste doc
| Onda | Veículo | Padrão herdado |
| --- | --- | --- |
| C1–C3 (l18–l20, mod-06) | spec AID-414 → emenda T0 (PR #199) → T1–T3 (PRs #201–203, 1 lição/tarefa) → promoção única `69bb67a7` → QA wave-level | Convenções por lição (§2.3), split T0–T3 com critérios de aceite por tarefa, ids alocados em ordem de produção, desvios divulgados |
| C4/C5 (bindings l15–l17 + game-06) | AID-410/AID-412 | QA wave-level + re-grant de readiness como propriedade da QA |
| OP-A (game-07/08/09) | AID-462 → `WAVE-PROMOTION-9a22041b.md` | Registro de execução em `_work-products/`, mapa 24→27, precheck estendido por onda |
- Esforço observado (C1–C3): **T0–T3 + promoção ≈ 2h de wall-clock DEPOIS da spec pronta** (draft AID-447 OP-C); a spec/autoria é o passo longo. Anatomia: lição de 3 atividades com hints/perCheck ≈ 130–150 linhas YAML (l18=147, l19=134, l20=132; lições 1–14: 61–99 linhas, sem hints).

---

## 2. Componente 1 — Template de autoria por lição

### 2.1 Esqueleto canônico (YAML — forma exata; preencher, não reformatar)

```yaml
# Lição lNN — Onda <id> (brief AID-<n> §<x>): <tema curto>.
# Validada por curriculum/ai-literacy/tools/validate.py contra schemas/lesson.schema.json.
id: lNN                    # alocado só pós-emenda; nunca deriva do título
version: 1                 # toda alteração de conteúdo incrementa
moduleId: mod-07           # pós-emenda (ia_pratica) — ou módulo definido na emenda
title: "<PT-BR: imperativo, ≤8 palavras, específico do ganho>"
objective: "<comportamento observável: 'Diante de X, fazer Y com critério Z' — herda o estilo de l18–l20>"
estimatedMinutes: 3        # 3 | 4 | 5 (3 atividades padrão; 5 se houver transcrito longo)
skillIds: [<fechado: entender|pedir|avaliar|proteger|aplicar|decidir|codificar|integrar>]
prerequisites: [lMM]       # grafo acíclico, intra-journey, resolve para missão vinculada

activities:
  - id: lNN-a1             # estável; a1..aM em ordem de dificuldade crescente
    type: <um dos 7>       # ver §2.2; diversificar dentro da lição e na onda
    skillId: <de skillIds>
    instruction: "<uma frase, linguagem simples, MAIÚSCULAS só na pergunta-chave (padrão l18)>"
    data: {...}            # obrigatório por tipo (§2.2)
    evaluation:
      strategy: deterministic
      <checks por tipo>    # §2.2 — referenciam APENAS ids declarados em data
    feedback:
      onFailure: "<por que errou + o que faria acertar; nomeia a regra, não só 'tente de novo'>"
      perCheck: {...}      # por campo/critério/opção (padrão l18-a1/a2)
      onSuccess: "<reforça o hábito/transferência>"
    storage:
      policy: structured_only   # padrão da trilha; digest_only/none só com justificativa
    hints:                 # 1–3, progressivas: (1) pergunta de reflexão; (2) redução; (3) quase-resposta
      - "..."
      - "..."
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

### 2.2 Os 7 tipos — carta de autoria (obrigatórios de `data`/`evaluation` + uso na trilha)

| `type` | Pessoa faz | `data` obrigatório | `evaluation` obrigatório | Notas de autoria (precedente) |
| --- | --- | --- | --- | --- |
| `choice` | escolhe opções | `options[]` ≥2 (`prompt?`, `multiSelect?`) | `correctOptionIds[]` | distratores plausíveis mas incorretos sem ambiguidade; multiSelect p/ "marque todos" (l20-a1) |
| `sort` | ordena partes | `items[]` ≥2 | `expectedOrder[]` (permutação dos ids) | para procedimentos/planos/hierarquias (l19-a2, l20-a2) |
| `missing_context` | identifica contexto ausente | `prompt`, `contextOptions[]` | `requiredContextIds[]` (`optionalContextIds?`) | para pedidos incompletos; distratores "mito de modelo" funcionam (l19-a1) |
| `safety_classification` | classifica seguro/sensível | `labels {safe,sensitive}`, `items[]` ≥3 | `classification` (todos os itens) | natural para `proteger` (l12); itens plausíveis do dia a dia, sem PII real |
| `prompt_builder` | monta pedido por campos | `scenario`, `genericPrompt`, `fields[]` ≥2 (`id`,`label`,`hint`) | `fields {fieldId: {minLength? \| mustIncludeAny?}}` | carro-chefe de `pedir`; `mustIncludeAny` com variantes PT (com/sem acento, sinônimos) — padrão l05/l18 |
| `output_comparison` | compara saídas | `scenario`, `outputs[]` ≥2, `criteria[]` ≥2 | `betterOutputId`, `requiredCriterionIds[]` | A = boa prática, B = anti-padrão; critérios nomeiam a regra (l15-a2, l18-a2) |
| `rubric_review` | revisa resposta por critérios | `responseText`, `criteria[]` ≥2 | `expectedVerdicts {met\|partial\|not_met}` | natural para revisão/verificação (candidato dev c) — ainda **sem uso na trilha**: alta aderência pedagógica, custo médio |

### 2.3 Convenções herdadas (C1–C3, spec AID-414 §2 — sem exceções)
`evaluation.strategy: deterministic`; `feedback.onFailure` **e** `onSuccess` (+ `perCheck` quando houver campos/critérios); `hints` 1–3 progressivas; `storage.policy: structured_only`; `evidence: {verifierRequired: true, completionClaim: lesson_completed, includesFreeText: false}`; `review.intervalsDays: [1,7,21]`; `completion.minimumScore: 0.75` com **todas** as atividades em `requiredActivityIds`; rubrica `lNN-rubric` com 3 critérios weight 1; `version: 1` inicial; conteúdo em pt-BR, linguagem simples; checks referenciam apenas ids declarados em `data`; checks de texto aceitam variantes PT (`números`/`numeros`).

---

## 3. Componente 2 — Checklist de qualidade por lote (padrão AID-426/AID-471)

### 3.1 Por lição (autor — antes de entregar draft ao FPE)
1. **Contrato:** 7 tipos somente; `strategy: deterministic`; `onFailure` presente em toda atividade; `hints` 1–3; `storage` declarado; `estimatedMinutes ∈ {3,4,5}` coerente com volume (transcrito longo ⇒ 5).
2. **Checks:** todo check referencia id declarado em `data` (validador); `mustIncludeAny` cobre variantes PT; exatamente uma resposta correta não ambígua em `choice`/`output_comparison`; `expectedOrder` é permutação válida; `classification` cobre todos os itens.
3. **Rubrica:** 3 critérios verificáveis separadamente, alinhados 1:1 com as atividades; ids `r-<kebab>` sem typos (precedente: `r-adpta`→`r-adapta` normalizado em produção).
4. **Evidência v1:** bloco `evidence` idêntico ao padrão §2.3; nenhum texto livre persistido; nada diz `mastered`.
5. **Catálogo:** `moduleId`/`title`/`estimatedMinutes`/`prerequisites`/`skillIds` idênticos à entrada do catálogo; prereq acíclico, intra-journey, resolvível; `skillId` de cada atividade ∈ `skillIds` da lição.
6. **Pedagogia:** objetivo observável (verbo + critério); progressão a1→a2→a3; cenários realistas de trabalho PT-BR; diversidade de tipos dentro da lição e **na onda** (nenhum tipo dominando as 3 lições); feedback ensina a regra, não só corrige.
7. **Segurança/PII:** nenhum dado pessoal real em cenários; itens de `safety_classification` plausíveis e inofensivos; tema sensível tratado com `proteger` quando cabível.
8. **Custo de leitura:** lição fechada em 130–150 linhas YAML (3 atividades + hints); se passar disso, simplificar cenário (não cortar feedback).

### 3.2 Por lote (onda — portas sequenciais do padrão AID-426/AID-471)
1. **Pre-condição de governança:** emenda T0 aprovada pelo board ANTES de qualquer arquivo `ready` (regra 7; lições entram na emenda como `planned`, flip `ready` só com arquivo — regra 5).
2. **Porta FPE (por tarefa, 1 lição = 1 tarefa):** `validate.py` verde; `gen:content` verde; read model contém a lição no módulo; regras do mission catalog verdes (chapterOrder contíguo intra-track, prereq canônico, entrada `l02` intacta); missão jogável hosted + fallback DOM; evidência `literacy-evidence` v1 com `verifierRequired: true`; CI verde.
3. **Porta de onda:** promoção ÚNICA ao fim (nenhum deploy intermediário exponha lição parcial — padrão C1–C3); precheck de produção estendido à onda (motor hosted das novas lições, contentVersion, mapa, contagens).
4. **Porta QA:** issue wave-level independente para QA Lead (produtor ≠ verificador; padrão AID-412/AID-444/AID-464) — GO/NO-GO + re-grant de readiness é propriedade da QA.
5. **Rastreabilidade:** comentário de landing por tarefa na issue de produção; registro `_work-products/AID-<ordem>/WAVE-PROMOTION-<pin>.md`; desvios do spec divulgados no landing (precedente T0/T1).

---

## 4. Componente 3 — Estimativa de esforço

### 4.1 Por lição (autor — Content Designer)
| Item | Esforço | Base |
| --- | --- | --- |
| Brief/spec-grade da lição (objetivo, prereq, 3 atividades com cenário, checks, rubric) | 40–60 min | AID-414 §2 (~1 laudo por lição); anatomia l18–l20 |
| Draft YAML completo (feedback 3 vias + hints + perCheck + revisão de variantes PT) | 30–45 min | 130–150 linhas; checks determinísticos exigem tuning de `mustIncludeAny` |
| Ciclo de revisão pós-validação (FPE roda `validate.py`; ajustes de checks/rubric) | 15–30 min | precedentes de normalização em produção (typos de rubric, checks) |
| **Total por lição** | **≈ 1,5–2,25 h** | |

### 4.2 Por onda de 3 (l21–l23)
| Item | Esforço | Dono |
| --- | --- | --- |
| Readiness/briefs (este doc §5 → spec do System Designer no padrão AID-414) | ≈ 0,5 dia (spec final ~7 min de escrita pós-briefs prontos; precedentes AID-414/AID-447) | CD + System Designer |
| Emenda T0 (docs + schema desc + catalog `planned`) | baixo; preparável antecipadamente (PR #199 foi pré-carregado pré-aceite) | FPE (texto da spec) |
| T1–T3 produção (1 lição/tarefa: arquivo + flip ready + binding + bump contentVersion) | ~2h wall-clock a onda inteira (C1–C3: T0 01:16Z → promoção ~03:2xZ) | FPE |
| Promoção única + precheck estendido | incluído acima | FPE |
| QA wave-level (GO/NO-GO + re-grant readiness) | 1 ciclo QA | QA Lead |
| **Capacidade CD líquida:** drafts de 3 lições + revisões | **≈ 5–7 h** (2–3 heartbeats) | CD |

- **Onda mínima viável:** 2 lições (precedente AID-414 §4.1); 3ª lição realocável à onda seguinte se capacidade/QA apertar.
- Risco de esforço concentrado: transcritos multi-turno e `rubric_review` são os tipos mais caros (autorais); `choice`/`sort` os mais baratos — equilibrar a mistura por onda controla custo.

---

## 5. Componente 4 — Skeletons de brief dos 3 candidatos (OP-C, draft AID-447 rev `dd27311c`)

> **Goverança:** ids `l21/l22/l23` abaixo são provisórios, alocados em ordem de produção (precedente AID-414 §1.3) e SÓ viram reais com emenda aprovada. Módulo/journey propostos são input para a spec do System Designer, não decisão. **Nenhum conteúdo final aqui.** Este §5 responde também à consulta de viabilidade/custo da AID-524 (UX).

### 5.(a) mod-07 ia_pratica — "Rotina com IA II" (agentes/automação de tarefas repetitivas)
- **Hipótese de learner-needs:** continuação natural de mod-06 (l18 já ensina reuso de pedidos); lacuna = decidir *o que* automatizar e *onde manter o humano no loop*. Custo de adoção baixo: cenários de rotina já usados na trilha (relatório semanal, e-mails).
- **Colocação proposta:** `mod-07` novo, `journey: ia_pratica`, `order: 7`, `skillIds: [pedir, avaliar, aplicar]` (reuso das skills de mod-06 — emenda de escopo mínimo, zero skill nova).
- **L21 "Rotinas repetitivas: o que vale automatizar"** (4 min, [pedir, aplicar], prereq [l18]): a1 `choice` multiSelect (marcar tarefas candidatas: repetitiva+estruturada+baixo risco ✓ vs. julgamento delicado ✗); a2 `prompt_builder` (transformar tarefa repetitiva em pedido-padrão parametrizado — continua l18); a3 `output_comparison` (automação com revisão humana vs. envio automático sem verificação). Rubric: identifica candidato; parametriza pedido; mantém ponto de controle humano.
- **L22 "Pequenas automações: onde o humano valida"** (4 min, [avaliar, proteger], prereq [l21]): a1 `safety_classification` (saídas de automação: seguras p/ uso direto vs. exigem checagem — dados, valores, nomes); a2 `missing_context` (pedido de automação sem definir gatilho/escala/limite); a3 `sort` (ordem segura de adoção: piloto → revisão manual → ampliar). Rubric: classifica risco; identifica contexto faltante; sequencia adoção.
- **L23 "Quando a automação erra: detectar e corrigir"** (3 min, [avaliar], prereq [l22]): a1 `choice` (sinal de que a rotina automatizada degradou); a2 `output_comparison` (correção mínima do pedido vs. descartar tudo); a3 `missing_context` (o que o pedido de correção precisa trazer — ecoa l19). Rubric: detecta desvio; corrige minimamente; repõe contexto.
- **Feito para AID-524:** viabilidade **alta** (todos os cenários derivam de l18/l19/l12; tipos baratos/médios); risco pedagógico **baixo** (não introduz conceito técnico novo — "agente" fica vocabulário de cenário, não tema); custo ≈ padrão C1–C3. Trade-off: sobreposição intencional com mod-06 (retenção por releitura, não novidade).

### 5.(b) ia_pratica — multimodal (imagens e documentos no pedido)
- **Hipótese de learner-needs:** uso real cotidiano (foto de nota, PDF de contrato) sem cobertura na trilha; reforça `pedir` (contexto não é só texto) e `proteger` (imagem carrega PII invisível ao copiar-colar).
- **Colocação proposta:** `mod-07` novo, `journey: ia_pratica`, `skillIds: [pedir, avaliar, proteger]`.
- **L21 "Peça com imagem: mostre e diga"** (4 min, [pedir], prereq [l05]): a1 `prompt_builder` (pedido com anexo: o que a IA deve fazer + o que observar na imagem + formato); a2 `missing_context` (foto enviada sem instrução de tarefa/área/período); a3 `choice` (quando a imagem ajuda mais que descrever à mão). Rubric: instrui sobre a imagem; define tarefa/formato; escolhe o canal certo.
- **L22 "Documentos: extraia com conferência"** (4 min, [avaliar], prereq [l21] e coerência com l20): a1 `output_comparison` (extração com conferência campo a campo vs. copiar cega); a2 `choice` multiSelect (quais campos exigem verificação externa — valores, datas, nomes); a3 `sort` (passo a passo de conferência antes de usar). Rubric: confere campos críticos; verifica externamente; sequencia conferência.
- **L23 "Imagens e privacidade: o que a foto revela"** (3 min, [proteger], prereq [l12]): a1 `safety_classification` (fotos/docs: seguro vs. sensível — nota de compra, crachá, tela com cliente, documento público); a2 `choice` (o que remover/tampar antes de enviar); a3 `missing_context` (pedido que precisa de dado sensível da imagem — quando não enviar). Rubric: classifica; higieniza; recusa quando sensível.
- **Feito para AID-524:** viabilidade **média-alta** (contraste pedagógico forte: `proteger` ganha caso de uso novo); risco **médio**: os 7 tipos são textuais — a "imagem" vive em `scenario`/`responseText` descritos (sem render de imagem no MVP); validar com UX se a promessa "multimodal" decepciona sem visual. Custo ≈ C1–C3 + 10–20% (cenários descritivos mais longos).

### 5.(c) dev l21+ — testes e revisão de código com IA
- **Hipótese de learner-needs:** mod-05 cobre decidir→codificar→integrar; lacuna natural = **verificação** (testes e code review assistidos); skill `codificar` já descreve "escrever, revisar e testar" — metade da promessa sem conteúdo.
- **Colocação proposta (decisão da spec/emenda):** estender `mod-05` (chapterOrder 5–7 na trilha dev, após l17 — emenda só de lições) **ou** `mod-07` novo `journey: dev`. Recomendação de custo: estender mod-05 (menor escopo de emenda; padrão "módulo fechado" foi contornado em mod-06 por lições concluídas — aqui a trilha dev tem poucos aprendizes, mas a regra do precedente favorece módulo novo **apenas** se skillIds divergirem).
- **L21 "Peça testes que valem a pena"** (4 min, [codificar], prereq [l16]): a1 `prompt_builder` (pedido de testes com contexto: linguagem, framework, caso de bordo alvo); a2 `missing_context` (pedido "escreve testes" sem framework/entrada esperada/comportamento); a3 `choice` (quais casos o assistente costuma errar — bordas de limite, concorrência, etc.). Rubric: dá contexto técnico; define comportamento alvo; desconfia do caso fácil.
- **L22 "Revise o código sugerido como engenheiro"** (5 min, [codificar, avaliar], prereq [l21]): a1 `rubric_review` (aplicar critérios — trata erros? nomes claros? escopo mínimo? — a uma resposta de assistente; **primeiro uso do tipo na trilha**, aderência máxima ao tema); a2 `output_comparison` (revisão que aceita s/ ler vs. revisão com critérios); a3 `sort` (ordem de uma revisão útil: entender intenção → chegar bordas → estilo). Rubric: aplica critérios; separa o que aceita; ordena revisão.
- **L23 "O que aceitar: limites do assistente"** (3 min, [decidir, codificar], prereq [l22]): a1 `choice` (aceitar sugestão em código crítico vs. caminho convencional — ecoa l15); a2 `safety_classification` (trechos seguros vs. arriscados para copiar: parsing, auth, crypto — nunca copiar cego); a3 `choice` multiSelect (sinais de que a sugestão precisa de humano). Rubric: decide com critério; classifica risco; reconhece limite.
- **Feito para AID-524:** viabilidade **alta** (anatomia de referência l15–l17 madura); risco **baixo no contrato** (todos os tipos existem) e **médio na audiência** (dev), público com menos missões de lição (3) mas mapa forte de jogos (OP-A adicionou 3); custo: l22 é a lição mais cara da cesta (`rubric_review` + 5 min). Trade-off: fecha promessa da skill `codificar` sem nova skill.

### 5.x Comparativo para a AID-524 (resumo)
| Candidato | Viabilidade autoria | Custo CD (3 lições) | Risco pedagógico | Observação-chave |
| --- | --- | --- | --- | --- |
| (a) Rotina com IA II | alta | ≈ 5–6 h | baixo | retenção por releitura (mod-06); menor novidade |
| (b) Multimodal | média-alta | ≈ 6–7 h | médio | `proteger` ganha caso novo; limitação visual do MVP deve ser validada com UX |
| (c) Dev testes/revisão | alta | ≈ 5–7 h | baixo (contrato) | primeiro `rubric_review` da trilha; fecha promessa da skill `codificar` |

---

## 6. Próximos passos (handoff — sem trabalho não-atribuído iniciado)
1. **AID-524 (UX):** §5.x responde viabilidade/custo por candidato; estou disponível para consulta (comentário de relay publicado lá).
2. **Pós-escolha do tema:** spec do System Designer no padrão AID-414 (usar §2/§3/§4 como anexo de autoria) → emenda T0 board-gated (regra 7) → T1–T3 FPE (1 lição/tarefa) → promoção única → QA wave-level.
3. **Boundaries respeitados:** nenhuma escrita canônica; nenhum id criado; nenhum gate/estado learner tocado; nenhum `mastered` ou alegação de eficácia (coorte n=2 continua direcional).

