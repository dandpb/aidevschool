<!-- issue: AID-807 | key: c1-content | doc_id: d1983545-da77-4178-8425-e98e533e8726 | updated: 2026-09-04 18:18:01.476+00 -->

# AID-807 — ONDA C1: conteúdo + specs (doc c1-content): autoria l15–l17 v1→v2 (+3 atividades, validadas) · pré-spec O3-C2 completa (l08–l13, +12, gated) · leitura de retenção spec-only

(AID-807)

# AID-807 — ONDA C1 (escolha confirmada): conteúdo e specs — doc `c1-content`

**Status:** ENTREGA FECHADA nesta issue (doc + 3 anexos YAML + work products). Zero escrita no repo (nenhum commit/branch/PR; catálogo, contrato, bindings e produção intocados; single-writer `main` preservado). **Owner:** Content Designer (f2b1e95d). **Ordem-fonte:** AID-806/A (esta issue). **Especificação-fonte:** doc `proposal` rev 2 (`d4a2f7fd`) da AID-792, §2C — executada à letra; specs já re-verificadas pelo CD na consulta AID-794 (comentário `3dd809a4`... ver AID-792 §7) e confirmadas pelo CEO via relay AID-806.

**Baseline verificada first-hand nesta run (workspace compartilhado, árvore @ `contentVersion "2026-09-02.3"`):**
- `catalog.yaml`: 29 ready (20 ia_pratica + 9 dev), 0 planned, 6 skills dev, módulos mod-01..mod-07; lições l15–l17 (mod-05, `journey: dev`) **v1**, `estimatedMinutes` 4/5/5, rubricas **3×weight-1** (ids conferidos: l15 `r-reconhece-limites`/`r-avalia-resposta`/`r-criterio-tecnico`; l16 `r-formula-contexto`/`r-avalia-criticamente`/`r-identifica-gaps`; l17 `r-classifica-segredos`/`r-avalia-arquitetura`/`r-decide-cliente-servidor`), `requiredActivityIds` = [a1, a2], `minimumScore 0.75`, `intervalsDays [1,7,21]`.
- 72 atividades no catálogo inteiro, **todas com 2–3 hints** (histograma 37×2 + 35×3 — verificado por script) ⇒ novo padrão de hints = 2–3.
- Precedentes lidos por arquivo: **l27-a1** (`sort` 5 itens com cadeia de precedência no `onFailure` + `perCheck` por item), **l29-a3** (`missing_context` frame "colega planeja agir; o que falta checar", `perCheck` com "Faltou isto"/"Isto é opcional"/"Isto não é cheque"), l15/l16/l17 integrais, l08–l13 integrais (para §2).
- Infra de retrofit já em produção: `engines/literacyDojo/src/domain/retrofitNotice.ts` (S1/S2 verbatim, gatilho por bump de `contentVersion` — onda O3-C1) ⇒ **C1 não precisa de nova superfície de aviso**: o bump de `contentVersion` no landing aciona o mecanismo existente.
- Bindings dev: `mission-bindings.yaml` l15 ch4 / l16 ch5 / l17 ch6, `runtime.contentVersion "2026-09-02.3"` pinado por missão (superfície E4).
- Instrumentos P6: `docs/piloto/FICHA_P6.md` (§4 sinais de ritmo), `SINTESE_PILOTO.md` (contagens brutas + limitações), `LEITURA_FUNIL_OPB.md` (reportVersion 2, k≥5, `--windows 1,7,21 --grace-days 2`), `CRITERIO_O3C2.md` (G1–G5, I1–I3).

---

## 0. Sumário executivo

| # | Entrega | Estado | Superfície |
| --- | --- | --- | --- |
| 1 | Retrofit **l15–l17 v1→v2** (+3 atividades: 1/lição, a3 append-only, zero ids novos, zero T0) | **AUTORIA COMPLETA** — YAML final §1.3, validado first-hand contra schema + `validate.py` + compilação do read model (árvore descartável) | 3 lições dev (mod-05 ch4–6) |
| 2 | **Pré-spec O3-C2 completa** (l08–l13, +12 atividades: 2/lição, granularidade por atividade padrão AID-644 §2) | **SPEC-ONLY** — briefs fechados §2.3; zero produção; gated por `CRITERIO_O3C2.md` (G1–G5 + d+21 09-23) | 6 lições ia_pratica (mod-03/mod-04) |
| 3 | **Leitura de retenção (spec-only)** — readout d+1/d+7 + conclusão + H0 a partir das fichas P6 e células do funil (≥5 instalações) | **SPEC-ONLY** — procedimento §3, consumido pelo fluxo P6 existente (facilitadora produz, QA valida) | instrumentos P6 (nenhum tocado) |

**Ruling obrigatório aplicado:** retrofit des-completa lições concluídas ⇒ **ruling de migração AID-640 (E1–E4)** incorporado por referência na spec de cada lição modificada (§1.1.3, §2.6).

---

# 1. Entrega 1 — Retrofit l15–l17 v1→v2 (+3 atividades)

## 1.1 Decisões de design (evidência → decisão)

### 1.1.1 Sem T0 — edição in-place com version bump (regra 3)
Nenhum id novo (próximo livre segue `l30`), nenhum módulo/skill nova, nenhum arquivo de contrato/schema tocado. Lições permanecem `ready`; contagens 29/0 do catálogo não mudam. `version: 1 → 2` em cada uma das três lições (regra 3 do contrato: toda alteração de conteúdo incrementa).

### 1.1.2 Ordem das atividades: append-only (ruling R1.1)
Cada lição tem hoje [a1, a2]; a nova recebe o próximo slot livre: **a3**, no final do array. Proibido renumerar/reordenar existentes (ids de atividade são âncora de evidência v1 e analytics por `activityId`). `requiredActivityIds` = conjunto completo [a1, a2, a3] (padrão das ondas C4+; é o que dá granularidade diagnóstica ao `lessonScore` e material à janela `[1,7,21]`).

### 1.1.3 Ruling de migração AID-640 — E1–E4 aplicados a l15–l17 (porta obrigatória da ORDEM)
- **E1 — Revisão devida imediata e mais longa:** o bump de `contentVersion` no landing marca revisão devida para toda skill praticada; a revisão das lições retrofitadas abre com **3** atividades onde o learner viu 2 — sem explicação… exceto que **a onda O3-C1 já pousou a copy S1/S2** (`retrofitNotice.ts`): *"Esta lição ganhou atividades novas — sua conclusão continua valendo."* (S1, card Revisão pendente) / *"Esta lição agora tem atividades novas. O que você já concluiu continua valendo."* (S2, intro). **Zero trabalho novo de aviso nesta onda** — o mecanismo dispara pelo bump. Item D (pluralização "refaça as atividades") também já pousado.
- **E2 — Replay/re-conclusão exige as novas atividades:** quem reabrir l15–l17 precisa jogar e passar a3 para novo `completionClaim`; status persistido permanece `completed` (grandfathering, AID-640 §0/§1). Aceito como semântica vigente (Opção A do R4).
- **E3 — Sessão em voo na promoção:** transitório; mitigação = promoção única em horário de baixo tráfego + coordenação de janela com o facilitador P6 (condição de higiene da AID-792 §3 já satisfeita: AID-804 — instrumento O1 não atravessa dev ch 4–6).
- **E4 — OS hospedado e evidência:** missões OS de l15–l17 mantêm estado próprio; fallback DOM por lição permanece válido (uma linha por lição); o comprimento da revisão hospedada cresce como em E1; `tracks[dev].contentVersion` e os `runtime.contentVersion` das 3 missões sobem no land (§1.4.2 — cargo do FPE, padrão AID-644 §4.2).

### 1.1.4 Rubricas: MANTER as 3×weight-1 existentes, verbatim, sem realinhamento
Verificado first-hand: as três lições já estão no padrão 3×w1 e os critérios existentes cobrem as atividades novas no nível de constructo —
- l15-a3 (diagnosticar o plano do colega) ⊂ `r-criterio-tecnico` ("Decide com base em risco, precisão exigida e adequação da ferramenta") + `r-reconhece-limites`;
- l16-a3 (comparar respostas do assistente) ⊂ `r-avalia-criticamente` ("Revê código gerado com critérios objetivos") + `r-identifica-gaps` (a resposta solta = gap de runtime que o tipo não cobre);
- l17-a3 (ordenar a integração) ⊂ `r-avalia-arquitetura` ("critérios de produção: timeout, segurança, resiliência") — a sequência é a arquitetura em miniatura.
Realinhar seria trocar palavras sem ganho de granularidade diagnóstica (precedente Q2 da AID-644 para l02/l05).

### 1.1.5 `estimatedMinutes`: INALTERADOS (4/5/5)
l16/l17 estão no teto do enum (5) e não podem subir; l15 em 4 min com 3 atividades tem precedente direto (l27: 3 atividades, 4 min, onda O1 landed). Decisão de autoria: **nenhum bump** — diff puramente aditivo, superfície de QA mínima.

### 1.1.6 Distribuição de tipos (3 novas)
| Tipo | Nova | Onde | Precedente de type-fit |
| --- | --- | --- | --- |
| `missing_context` | 1 | l15-a3 | l29-a3 (frame "colega planeja agir; o que falta checar antes") — confirmado na spec-fonte |
| `output_comparison` | 1 | l16-a3 | l15-a2/l17-a2 (mesma lição-família); **reframe [CD-C] obrigatório aplicado** — §1.3.2 |
| `sort` | 1 | l17-a3 | l27-a1 (precedência por par adjacente no `onFailure`) |

Nenhum tipo novo; `choice`/`prompt_builder`/`safety_classification`/`rubric_review` não recebem atividades nesta onda (omissão precedada: AID-644 §2.8).

## 1.2 Contrato comum por atividade nova (padrão AID-644 §2 / AID-558 §2)

Id estável `lNN-aM`; tipo determinístico dos 7; `evaluation.strategy: deterministic` com checks referenciando apenas ids declarados em `data`; `feedback.onFailure` + `onSuccess` (+ `perCheck` completo — toda opção/item/critério/contexto tem linha); `hints` **2–3** progressivas (padrão verificado do catálogo: 72/72 atividades têm 2–3); `storage.policy: structured_only`; evidência `literacy-evidence v1 / verifierRequired: true` herdada da lição; pt-BR; vendor-neutral (zero menção a fornecedor nas novas atividades — verificado por grep; nota: l17-a1 existente menciona um fornecedor, fora do escopo desta onda, flag para registro de dívida §1.5); ids de `contextOptions` em kebab **sem** prefixo `ctx-` (padrão O2/O3-C1); critérios de `output_comparison` com ids `c-*`; itens de `sort` com prefixo `passo-*` (padrão l27-a1).

## 1.3 YAML final por lição (autoria completa — fonte de landing do FPE)

Cada bloco abaixo é o **append exato** no arquivo da lição + as 3 linhas que mudam no cabeçalho/rodapé. Arquivos completos anexados (espelho byte-a-byte do que validou): `l15-quando-usar-ia.v2.yaml`, `l16-primeiro-codigo-com-assistente.v2.yaml`, `l17-integre-api-de-ia.v2.yaml`.

### 1.3.1 `l15` "Quando usar IA e quando não usar" (mod-05, [decidir], v1→v2, 4 min) — +a3 `missing_context`

**Mudanças de arquivo:** `version: 2`; append de `l15-a3`; `requiredActivityIds: [l15-a1, l15-a2, l15-a3]`. Rubrica/intervals/evidence inalterados.

**Design:** colega vai colar a planilha da folha inteira numa IA para fechar totais ("IA boa não erra conta"). Faltam **exigência-de-exatidão ✓, sensibilidade-dos-dados ✓, necessidade-de-auditabilidade ✓** (required); **volume-da-planilha** (optional); distratores **fama-do-modelo** ("se o modelo é famoso") e **rapidez-da-resposta** ("se a resposta vem rápido") — conforme spec-fonte §2C, linha a linha. Cenário ecoa `opt-c` de l15-a1 (juros compostos/auditoria regulatória) em mecânica diferente (diagnóstico de plano vs escolha de situação) = aprofundamento, não duplicação; frame "colega planeja agar" herdado de l29-a3.

```yaml
  - id: l15-a3
    type: missing_context
    skillId: decidir
    instruction: "UM COLEGA VAI USAR UMA IA GENERATIVA PARA FECHAR OS TOTAIS DA FOLHA DE PAGAMENTO. O que falta checar no plano dele?"
    data:
      prompt: "COLEGA (plano): 'Colo a planilha da folha inteira na IA, peço os totais de salários, descontos e encargos, confiro se o número de funcionários bate e lanço no sistema. IA boa não erra conta.' — nada mais foi checado antes do lançamento."
      contextOptions:
        - id: exigencia-de-exatidao
          text: "A exigência de exatidão: folha fecha no centavo ou admite aproximação"
        - id: sensibilidade-dos-dados
          text: "A sensibilidade dos dados: nomes, salários e cargos de pessoas reais saem da empresa"
        - id: necessidade-de-auditabilidade
          text: "A necessidade de auditoria: o cálculo tem de dar para reconstituir e conferir depois"
        - id: volume-da-planilha
          text: "O volume da planilha: quantas linhas e colunas cabem no pedido"
        - id: fama-do-modelo
          text: "Se o modelo de IA é o mais famoso do momento"
        - id: rapidez-da-resposta
          text: "Se a resposta vem rápida ou demora para sair"
    evaluation:
      strategy: deterministic
      requiredContextIds: [exigencia-de-exatidao, sensibilidade-dos-dados, necessidade-de-auditabilidade]
      optionalContextIds: [volume-da-planilha]
    feedback:
      onFailure: "'IA boa não erra conta' não é controle: folha é cálculo exato, com dado pessoal, que auditoria pode pedir um dia. Exatidão, sensibilidade e auditoria são os cheques que faltam; fama e rapidez do modelo não checam nada — são critério de marketing, não de engenharia."
      perCheck:
        exigencia-de-exatidao: "Faltou isto: exatidão — totais de folha têm que fechar no centavo, e geração probabilística não garante casa decimal."
        sensibilidade-dos-dados: "Faltou isto: sensibilidade — a planilha leva nome, salário e cargo de pessoa real para fora da empresa antes de qualquer avaliação."
        necessidade-de-auditabilidade: "Faltou isto: auditoria — 'a IA somou' não é rastro; folha tem de dar para reconstituir linha por linha."
        volume-da-planilha: "Isto é opcional: volume muda como a planilha cabe no pedido, mas o plano não nasce errado por causa dele."
        fama-do-modelo: "Isto não é cheque: fama é marketing — não mede precisão de cálculo nem proteção de dado."
        rapidez-da-resposta: "Isto não é cheque: rapidez fala da latência do modelo, não da correção do total."
      onSuccess: "Exato: exatidão exigida, dado sensível e auditoria futura — os três cheques antes de colar a folha em qualquer IA. Volume completa o juízo; fama e rapidez continuam fora da lista."
    storage:
      policy: structured_only
    hints:
      - "Folha de pagamento é cálculo exato com dado de pessoa real — quais riscos o plano do colega não considerou?"
      - "Se a auditoria pedir o cálculo amanhã, o rastro 'a IA somou' basta?"
      - "Fama e rapidez falam do modelo, não da tarefa — o cheque tem de falar da tarefa."
```

### 1.3.2 `l16` "Seu primeiro código com um assistente de IA" (mod-05, [codificar], v1→v2, 5 min) — +a3 `output_comparison` · **[CD-C] reframe aplicado**

**Mudanças de arquivo:** `version: 2`; append de `l16-a3`; `requiredActivityIds: [l16-a1, l16-a2, l16-a3]`. Rubrica/intervals/evidence inalterados.

**Design + reframe obrigatório:** a spec-fonte (AID-792 §2C, marca [CD-C]) determina: mesma tarefa pedida de duas formas; **`outputs[]` = as duas RESPOSTAS do assistente** (uma aterrada em arquivo/teste/restrição, outra confiante e solta) — nunca os dois pedidos (no contrato, `outputs[]` são saídas da IA com `betterOutputId`; comparar pedidos quebraria anatomia/validador). Implementado: os dois pedidos vivem no `scenario` (o do rush vs o com contexto: runtime, schema anexado, zod única dependência, restrição de log); `out-a` é a resposta aterrada (cita o contrato anexado, respeita a restrição, declara hipótese, sugere teste); `out-b` é a confiança solta (adjetivos, "qualquer payload", zero rastro). Critérios **c-contexto-do-projeto / c-restrição-declarada / c-verificavel** (nomes da spec-fonte, padrão `c-*`), todos required. Eco deliberado do cenário de l16-a1 (webhook Stripe) — espiral: a1 monta o pedido, a2 revisa o código, a3 mostra o que o pedido com contexto compra NA RESPOSTA (e que ainda precisa ser avaliada).

```yaml
  - id: l16-a3
    type: output_comparison
    skillId: codificar
    instruction: "VOCÊ PEDIU A MESMA FUNÇÃO DE DUAS FORMAS — UMA VEZ NO RUSH, UMA VEZ COM CONTEXTO. CHEGARAM DUAS RESPOSTAS DO ASSISTENTE. COMPARE E ESCOLHA A MELHOR BASE PARA SEGUIR."
    data:
      scenario: "Mesma tarefa, dois momentos. No rush: 'escreve uma função que valida payload de webhook'. Depois, com calma: 'TypeScript 5 / Node 20. Anexei o contrato do payload (schema do webhook). A função recebe unknown, valida com zod (única dependência permitida), NÃO loga campo com token/secret no nome e roda no handler Express em produção.'"
      outputs:
        - id: out-a
          text: "Seguindo o contrato que você anexou: input unknown validado com zod contra o schema; retorno tipado ou lança ValidationError para o handler tratar; antes de logar, removo as chaves com token/secret no nome (lista de exclusão em um só lugar); sem dependência além de zod. Assumi que payload inválido lança — se preferir Result, é um ajuste de uma linha. Um teste com payload válido e outro inválido fecham o comportamento."
        - id: out-b
          text: "Aqui está uma função robusta e pronta para produção, que valida qualquer payload com segurança total. Ela usa um validador interno avançado, cobre todos os casos de webhook de qualquer serviço e é otimizada para alta performance. Pode confiar no código: segue as melhores práticas do mercado. Qualquer coisa, é só pedir."
      criteria:
        - id: c-contexto-do-projeto
          text: "Usa o contexto do projeto (runtime, contrato anexado, onde roda)"
        - id: c-restrição-declarada
          text: "Respeita as restrições declaradas (dependência única, o que não logar)"
        - id: c-verificavel
          text: "Deixa o comportamento verificável (hipótese declarada, teste sugerido)"
    evaluation:
      strategy: deterministic
      betterOutputId: out-a
      requiredCriterionIds: [c-contexto-do-projeto, c-restrição-declarada, c-verificavel]
    feedback:
      onFailure: "A resposta A anda sobre o seu chão: cita o contrato anexado, respeita zod como única dependência, protege o log e declara o que assumiu — dá para verificar. A B é confiança solta: 'robusta', 'qualquer payload', 'segurança total', sem uma linha que se apoie no seu contexto. Pedido com contexto não compra resposta boa sozinho — a resposta é conferida contra o pedido."
      perCheck:
        betterOutputId: "A resposta A é aterrada: cada frase volta ao seu pedido (schema, zod, log, handler). A B serviria para qualquer projeto — e por isso não serve para o seu."
        c-contexto-do-projeto: "Faltou este critério: a resposta A cita TypeScript, o contrato anexado e o handler; a B não toca no seu projeto nenhuma vez."
        c-restrição-declarada: "Faltou este critério: a A usa só zod e exclui token/secret do log; a B promete 'qualquer payload' e ignora as restrições."
        c-verificavel: "Faltou este critério: a A declara a suposição (lança vs Result) e sugere dois testes; na B não há o que verificar — só adjetivos."
      onSuccess: "Isso: resposta aterrada em arquivo, restrição e teste vence confiança solta. Pedido com contexto é metade do caminho; avaliar a resposta contra o pedido é a outra metade."
    storage:
      policy: structured_only
    hints:
      - "Cada frase da resposta A volta a algo que você declarou; na B, troque 'robusta' por um fato do SEU projeto — existe?"
      - "Onde a resposta fala de verificação? Hipótese declarada e teste sugerido são rastro; adjetivo não é."
      - "A A cita o schema anexado, zod como única dependência e a exclusão de token/secret no log; a B ignora os três."
```

### 1.3.3 `l17` "Integre uma API de IA em um projeto real" (mod-05, [integrar], v1→v2, 5 min) — +a3 `sort`

**Mudanças de arquivo:** `version: 2`; append de `l17-a3`; `requiredActivityIds: [l17-a1, l17-a2, l17-a3]`. Rubrica/intervals/evidence inalterados.

**Design:** ordem da integração em 5 passos conforme spec-fonte: **ler contrato da API → guardar chave fora do código → implementar chamada mínima → tratar erro/limite → testar com caso real**. **Precedências por par adjacente declaradas no `onFailure`** (padrão l27-a1): contrato→chave (o contrato informa escopo/formato do segredo e os erros/limites que o tratamento cobrirá), chave→chamada (o segredo precisa estar guardado **antes** da primeira chamada que o usa — senão vaza no commit ou a chamada nasce quebrada), chamada→erro (o tratamento cobre a chamada que existe, não a imaginada), erro→teste (o caso real fecha o ciclo depois que chamada e tratamento existem). `perCheck` item a item (padrão l27-a1).

```yaml
  - id: l17-a3
    type: sort
    skillId: integrar
    instruction: "A PROVA DE CONCEITO VIROU PROJETO: VOCÊ VAI INTEGRAR A API DE IA NO APP. Ordene a integração: o que vem antes do quê?"
    data:
      items:
        - id: passo-ler-contrato
          text: "Ler o contrato da API: autenticação, limites de taxa, erros retornados, formatos"
        - id: passo-guardar-chave
          text: "Guardar a chave fora do código: variável de ambiente ou gerenciador de segredos, nunca no commit"
        - id: passo-chamada-minima
          text: "Implementar a chamada mínima: um endpoint, um caso de uso, resposta logada"
        - id: passo-tratar-erro
          text: "Tratar erro e limite da chamada: timeout, 429, falha inesperada — cada um com destino definido"
        - id: passo-testar-real
          text: "Testar com caso real: payload de verdade, chave de verdade, ponta a ponta"
    evaluation:
      strategy: deterministic
      expectedOrder: [passo-ler-contrato, passo-guardar-chave, passo-chamada-minima, passo-tratar-erro, passo-testar-real]
    feedback:
      onFailure: "A ordem é: contrato → chave → chamada mínima → tratar erro → testar. Cada par vizinho tem um porque: o contrato informa os erros e limites que o tratamento vai cobrir; a chave precisa estar guardada fora do código ANTES da primeira chamada que a usa — senão vaza no commit ou a chamada nasce quebrada; o tratamento cobre a chamada mínima que existe, não a que você imagina; e o teste com caso real só fecha o ciclo depois que chamada e tratamento existem."
      perCheck:
        passo-ler-contrato: "Primeiro o contrato: é ele que diz quais erros e limites existem — sem isso, tratamento é chute."
        passo-guardar-chave: "Depois a chave fora do código: a primeira chamada já usa o segredo — ele precisa estar guardado antes dela."
        passo-chamada-minima: "A chamada mínima vem na sequência: um endpoint, um caso — o menor pedaço que já exige contrato e chave."
        passo-tratar-erro: "O tratamento cobre a chamada que você tem: timeout, 429 e falha inesperada ganham destino definido um a um."
        passo-testar-real: "Por fim o caso real: valida chamada e tratamento ponta a ponta — antes disso, tudo é especulação."
      onSuccess: "Isso: contrato → chave → chamada mínima → tratamento → teste real. Cada passo cria a condição do seguinte — é isso que integra sem surpresa."
    storage:
      policy: structured_only
    hints:
      - "O que você precisa saber sobre erros e limites antes de poder tratá-los?"
      - "A primeira chamada já usa a chave: onde ela precisa estar quando a chamada nasce?"
      - "Testar ponta a ponta é o último passo — o que precisa existir antes dele?"
```

## 1.4 Produção mecânica (o que exatamente muda em arquivos — cargo do FPE)

### 1.4.1 Conteúdo
3 YAMLs em `curriculum/ai-literacy/modules/05-dev-contexto-e-escolha/l1{5,6,7}-*.yaml`: append das atividades novas (R1.1); `version: 2`; `requiredActivityIds` = conjunto completo; header de comentário ganha a nota de onda (padrão dos arquivos anexados). `validate.py` verde + `gen:content` regenera `lessons.ts` + fixtures regenerados (padrão pretest/prebuild). **Validado first-hand nesta autoria** (árvore descartável fora do repo): `validate.py` OK (29 ready: 20+9) e `--compile` gera `lessons.ts` sem erros.

### 1.4.2 Versionamento e bindings (bump ÚNICO no landing; E4)
- `catalog.yaml`: `contentVersion` sobe 1× (de `2026-09-02.3` para o valor do dia do landing — número exato é do FPE).
- `engines/codexdojo-os-prototype/config/mission-bindings.yaml`: `tracks[dev].contentVersion` + os 3 `runtime.contentVersion` das missões l15/l16/l17. **Nada mais em bindings:** `chapterOrder` (4/5/6), prereqs (l15←∅, l16←l15, l17←l16), fallbacks DOM, entradas de missão e `recommendedEntryMissionId` intactos.
- S1/S2 + item D: **já pousados** (O3-C1, `retrofitNotice.ts`) — disparam pelo bump; zero trabalho novo. Ordem de pouso irrelevante (mecanismo pré-existente).

### 1.4.3 App/tests (FPE)
Pinagem de comportamento (padrão A1–A3 da AID-644, já estendidos para retrofit na O3-C1): caso retrofit em `migration.test.ts` (l15 concluída só com [a1,a2] ⇒ permanece `completed`; revisão devida marcada); predicado version-blind em `progress.test.ts` (bestScores só-a1/a2 ⇒ `completed:false` + `missingActivityIds=[a3]`; 3× ≥0.75 ⇒ `completed:true`). Fixtures/conteúdo hospedado: revisão dev de 3 atividades renderiza.

## 1.5 QA e critérios de aceitação (superfície: 3 lições dev; QA Lead ca6a3f95, produtor ≠ verificador)

- **A4 Conteúdo** — `validate.py` verde; l15–l17 com 3 atividades; `requiredActivityIds` = conjunto completo; rubricas 3×w1 **inalteradas verbatim**; `version: 2` nas três; `estimatedMinutes` 4/5/5; hints 2–3 nas novas.
- **A1–A3 Migração** — testes de pinagem §1.4.3 verdes; nenhum rebaixamento de status; revisão devida preservada.
- **A5 Aviso** — S1/S2 renderizam 1× por learner/lição/bump (mecanismo existente; teste de idempotência já pousado na O3-C1 — re-executar).
- **A6 Jornada dev** — missões OS l15–l17 hospedadas com 3 atividades; mapa 36 missões intacto; contagens ia_pratica 20 / dev 9; prereqs/chapters intactos.
- **A8 QA wave-level sobre 3 lições** — checklist de leitura + diff puramente aditivo (só append + version + required) + suíte literacyDojo (`gen:content`, lint, test, build, e2e) + grep vendor-neutral nas 3 lições (nota registrada: l17-a1 pré-existente menciona fornecedor — dívida anterior a esta onda, fora do diff; não bloqueia).
- **Janela de consolidação** — começa na promoção única, dura 21 dias, checkpoints d+1/d+7/d+21; métricas só de superfícies existentes (evidência local `literacy-evidence v1`: tentativas/pass por a3; conclusão de revisões; abandono de revisão E1); hipóteses, nunca claim de eficácia.

---

# 2. Entrega 2 — Pré-spec O3-C2: retrofit l08–l13 (+12 atividades) — **GATED, SPEC-ONLY**

## 2.1 Regra do gate (imóvel; esta pré-spec não a emenda)
Produção de O3-C2 **só entra no board** com `CRITERIO_O3C2.md` satisfeita: **G1–G5 GO com veredito QA** (amostra ≥3 iniciada; zero Critical/High no caminho central; ≥2/3 primeira lição com H0 ≤20 min; ≥2/3 compreensão do resultado local; todo bloqueio com issue) **+ O3-C1 sustentando na saída d+21 (09-23)**. Enquanto isso: **zero YAML de produção, zero commit, zero dispatch**. O propósito desta pré-spec é deixar o GO→dispatch ~instantâneo (AID-792 §2C): os briefs abaixo estão no padrão AID-644 §2 (granularidade por atividade), prontos para virar autorias T1/T2 no padrão da O3-C1.

## 2.2 Contrato comum por atividade nova (idêntico ao §1.2)
Mais notas de autoria obrigatórias: (1) append-only — as seis lições têm hoje só a1 ⇒ novas recebem **a2/a3**; (2) `requiredActivityIds` = [a1,a2,a3]; (3) **ruling de migração AID-640 (E1–E4) obrigatório em todas as seis** (§2.6); (4) rubricas terminam 3×w1 (§2.3 por lição: 3 sobem de 2→3; 3 mantêm as 3 existentes); (5) hints 2–3; (6) `contextOptions` kebab sem `ctx-`; (7) critérios `c-*`; (8) distratores significativos (mito que ensina, não filler); (9) vendor-neutral; (10) **proibições de duplicação intra-onda e cross-catalogo** listadas por brief (vinculantes).

## 2.3 Briefs per-lesson (l08–l13)

### 2.3.1 `l08` "A primeira resposta não é necessariamente a melhor" (mod-03, [avaliar], v1→v2, **3→4 min**) — +a2, +a3
a1 (output_comparison, existe): clínica — ações concretas vs genéricas.
**+a2 `choice` (single, skill avaliar)** — chegaram duas respostas para o mesmo pedido; qual a decisão correta ao comparar: **opt-uso** "Comparar as duas pelo que a tarefa pede — e escolher com o motivo anotado" ✓ vs **opt-confiante** "Ficar com a que soa mais convicta: quem afirma com segurança sabe" ✗ vs **opt-longa** "Ficar com a mais longa: resposta completa cobre mais" ✗ vs **opt-perguntar** "Perguntar à própria IA qual das duas está certa e seguir a resposta" ✗. Distratores atacam aparência≠qualidade e apelo à autoridade.
**+a3 `missing_context` (skill avaliar)** — colega pediu duas vezes a mesma coisa, recebeu respostas diferentes e quer saber "qual é a certa?". Faltam: **finalidade-do-uso ✓, contexto-da-tarefa ✓ (o que já foi tentado/restrições), formato-da-entrega ✓**; optional **prazo-disponível**; distratores **ordem-de-chegada** ("qual chegou primeiro"), **tamanho-da-resposta** ("qual é mais longa").
**Rubrica 2→3:** + `r-aparencia-nao-e-qualidade`: "Não confunde tom confiante, tamanho ou ordem de chegada com qualidade para o uso pretendido."
**Vinculante:** l08 não ensina critérios-primeiro (isso é l11-a1/l11-a3); o ângulo de l08 é aparência/confiança vs uso. `opt-perguntar` difere do cenário de l11-a2 (a IA **deu** o veredicto) — aqui o learner é que delegaria o julgamento.

### 2.3.2 `l09` "Como reconhecer uma resposta inventada" (mod-03, [avaliar], v1→v2, 4 min) — +a2, +a3
a1 (rubric_review, existe): home office — estudo USP sem link, 87%/35%.
**+a2 `output_comparison` (skill avaliar)** — pergunta "quantas pequenas empresas fecham no primeiro ano no Brasil?": **out-a** recusa o número redondo ("Não tenho número oficial confirmado; SEBRAE costuma citar 20–30% — conferir a publicação mais recente antes de usar") vs **out-b** precisão inventada ("43,7%, segundo pesquisa nacional de 2024"). Critérios `c-numero-com-origem`, `c-incerteza-declarada`, `c-fonte-identificavel` (todos required; better = out-a). Inverte o ângulo de a1: a melhor resposta é a que **declara** incerteza.
**+a3 `missing_context` (skill avaliar)** — colega vai colar numa apresentação para a diretoria um "estudo de 2024: 87%" sem link. Faltam: **titulo-e-autoria-do-estudo ✓, origem-do-numero-exato ✓, data-da-informacao ✓**; optional **alcance-da-apresentacao** (quem vai receber); distratores **velocidade-da-resposta** ("se a IA respondeu rápido"), **formato-do-texto** ("se a resposta tem emojis").
**Rubrica: MANTER 3** (`r-fontes-verificaveis`/`r-numeros-sem-origem`/`r-confianca-excessiva`) — cobrem a2/a3 exatamente no constructo.
**Vinculante:** a2 ≠ l03-a3 (O3-C1): lá fidelidade ao **material fornecido**; aqui calibração de incerteza vs precisão inventada **sem material fornecido**. a3 foca sinais de invenção — a checagem operacional de afirmações/fontes continua de l10/l20.

### 2.3.3 `l10` "Quando procurar fontes externas" (mod-03, [avaliar], v1→v2, **3→4 min**) — +a2, +a3
a1 (choice multiSelect, existe): 5 frases — quais exigem fonte.
**+a2 `missing_context` (skill avaliar)** — uma afirmação da IA vai entrar num material; o que determina se a fonte externa é necessária: **uso-da-afirmacao ✓ (vira decisão/comunicação?), consequencia-do-erro ✓, tipo-da-afirmacao ✓ (fato checável vs opinião/conselho)**; optional **publico-que-vai-ler**; distratores **tom-confiante-da-resposta**, **tamanho-da-resposta**.
**+a3 `output_comparison` (skill avaliar)** — dois usos do MESMO número já verificado no relatório: **out-a** anota origem+data inline ("4,2% — IBGE, conferido em ibge.gov.br em [data]") e modula a frase ("aproximadamente") vs **out-b** cola como fato redondo e reforça ("comprovadamente 4,2%"). Critérios `c-origem-anotada`, `c-confianca-proporcional`, `c-rastro-para-reconferir` (better = out-a). Ensina que a verificação deixa rastro no artefato.
**Rubrica 2→3:** + `r-decide-quando-verificar`: "Decide se a verificação é necessária a partir do uso da afirmação e da consequência do erro — não do tom da resposta."
**Vinculante:** a2 ≠ l10-a1 (marcar frases prontas vs diagnosticar o QUE dispara verificação); a3 ≠ l02-a3 (O3-C1, fluxo verificar-antes-de-usar) e ≠ l20 (hierarquia de fontes): aqui o objeto é o **artefato final** (como o dado verificado entra no seu material).

### 2.3.4 `l11` "Como comparar alternativas e explicitar critérios" (mod-03, [avaliar], v1→v2, 4 min) — +a2, +a3
a1 (sort, existe): critérios → pedir → comparar → decidir.
**+a2 `choice` (single, skill avaliar)** — a IA devolveu o ranking pronto ("a ferramenta B é a melhor"): **opt-refazer** "Conferir na sua própria lista de critérios e decidir você, com motivo" ✓ vs **opt-aceitar** "Aceitar: ela analisou todas por você" ✗ vs **opt-mais** "Pedir uma análise ainda mais longa para ter certeza" ✗ vs **opt-descartar** "Descartar as três e começar de novo" ✗. Âncora: decisão humana com motivo registrado (`r-decisao-humana`).
**+a3 `prompt_builder` (skill avaliar)** — montar o pedido de comparação estruturada. Cenário: escolher entre 3 ferramentas de agendamento (eco do mundo de a1). `genericPrompt`: "qual dessas três ferramentas é melhor?" Campos: **criterios** ("o que importa: preço, suporte em português, relatórios, integração…" — mustIncludeAny tipo [preço, suporte, critério, custo, relatório, integração]), **formato-da-comparacao** ("tabela lado a lado, nota por critério…" — [tabela, lado a lado, nota, pontos, comparativo, coluna]), **regras-iguais** ("o que manter igual para as três: mesmo cenário, mesmos dados de teste" — [mesmo, igual, as três, todas, cenário, teste]).
**Rubrica 2→3:** + `r-pede-comparacao-estruturada`: "Pede comparação estruturada com critérios declarados e regras iguais — não veredicto pronto."
**Vinculante:** proibido reutilizar textos de opção entre l11-a2 e l08-a2 (mesma mecânica choice em lições vizinhas do mesmo módulo — padrão nota 4 da AID-644).

### 2.3.5 `l12` "Proteja suas informações" (mod-04, [proteger], **v2→v3**, 4 min) — +a2, +a3
a1 (safety_classification, existe): 7 itens seguro/sensível.
**+a2 `choice` (single, skill proteger)** — tarefa real com contrato sensível (nomes de clientes, valores) e pressa: **opt-sanitizar** "Descrever a tarefa e trocar os dados por marcadores genéricos antes de colar" ✓ vs **opt-colar-tudo** "Colar o contrato inteiro: é mais rápido e IA é ferramenta de trabalho" ✗ vs **opt-sigilo** "Colar tudo e pedir para a IA não compartilhar com ninguém" ✗ vs **opt-desistir** "Não usar IA em nada dessa tarefa, nem na parte sem dado sensível" ✗. `opt-sigilo` = myth-buster (prometer sigilo ao modelo não é controle); `opt-desistir` ataca o falso binômio.
**+a3 `sort` (skill proteger)** — fluxo de sanitização antes de colar (4 itens, precedências por par adjacente no `onFailure`, padrão l27-a1/l17-a3): **marcar** o que é sensível no material → **substituir** por marcadores genéricos (CLIENTE A, VALOR X) → **conferir** que nada identificável sobrou → **enviar** o pedido com o material limpo. Pares: marcar→substituir (só se troca o que identificou); substituir→conferir (a troca pode falhar — sobrenome no meio do parágrafo); conferir→enviar (o pedido só sai limpo depois de conferido).
**Rubrica: MANTER 3** (`r-dados-pessoais`/`r-credenciais-financeiro`/`r-conteudo-publico`) — classificação é o constructo; sanitizar é a sua aplicação (padrão l02/l05 da O3-C1: manter quando as 3 existentes cobrem).
**Vinculante:** mundo "texto colado" — anexos são de l24–l26 (l25 é dona de "anexos seguros"); não usar cenário de upload de arquivo.

### 2.3.6 `l13` "Use IA para uma tarefa real de trabalho" (mod-04, [aplicar], v1→v2, 5 min) — +a2, +a3
a1 (prompt_builder, existe, `storage: digest_only` — conservar; a2/a3 novas usam `structured_only`).
**+a2 `choice` (single, skill aplicar)** — a resposta veio: 2 dos 3 critérios ok, o formato é o que falhou; próximo passo do ciclo pedir-avaliar-melhorar: **opt-ajuste-especifico** "Pedido de ajuste só do que falhou: 'mantenha o conteúdo, volte para o formato pedido'" ✓ vs **opt-recomecar** "Jogar tudo fora e recomeçar o pedido do zero" ✗ vs **opt-aceitar** "Aceitar como está e enviar" ✗ vs **opt-variacoes** "Pedir 5 versões novas e escolher a melhor aparente" ✗. Iteração critério-a-critério sobre a própria avaliação.
**+a3 `rubric_review` (skill aplicar)** — avaliar a execução de um colega no ciclo: `responseText` = relato do colega ("pedi 'resume isso aí', colei o contrato com nomes de clientes, a primeira resposta parecia boa, mandei para o gerente"). Critérios `c-pedido-com-contexto` (objetivo/contexto/formato), `c-avaliou-antes-de-usar` (critérios antes do envio), `c-protegeu-dados` (removeu sensível). `expectedVerdicts`: mix met/partial/not_met (ex.: not_met, not_met, not_met + um partial para nuance — fechamento de autoria define).
**Rubrica: MANTER 3** (`r-tarefa-real`/`r-campos-completos`/`r-sem-dados-sensiveis`) — a3 espelha os três exatamente.
**Vinculante:** a2 ≠ l07-a2 (O3-C1: qual pedido de ajuste para um feedback dado) — aqui o próximo passo do ciclo é escolhido a partir da PRÓPRIA avaliação com critérios; a3 ≠ l14 (desafio final hands-on) — aqui avalia-se execução alheia, não se executa.

## 2.4 Totais e distribuição de tipos — tabela final (12)

| Tipo | Novas | Onde |
| --- | --- | --- |
| `choice` | **4** | l08-a2; l11-a2; l12-a2; l13-a2 |
| `missing_context` | **3** | l08-a3; l09-a3; l10-a2 |
| `output_comparison` | **2** | l09-a2; l10-a3 |
| `prompt_builder` | **1** | l11-a3 |
| `sort` | **1** | l12-a3 |
| `rubric_review` | **1** | l13-a3 |
| `safety_classification` | **0** | omissão precedada (AID-644 §2.8; l12-a1 já entrega o tipo no subescopo) |

Guardas de variedade entre as 3 `missing_context` (l08-a3/l09-a3/l10-a2): conjuntos required distintos (uso/contexto/formato · autoria/origem/data · uso/consequência/tipo) e distratores com no máximo 1 eco ("tamanho-da-resposta" aparece em l08-a3 e l10-a2 — reforço deliberado, 1× cada).

## 2.5 Versionamento/minutos/rubricas — resumo executivo
| Lição | versão | minutos | rubrica |
| --- | --- | --- | --- |
| l08 | v1→v2 | **3→4** | 2→3 (+`r-aparencia-nao-e-qualidade`) |
| l09 | v1→v2 | 4 | manter 3 |
| l10 | v1→v2 | **3→4** | 2→3 (+`r-decide-quando-verificar`) |
| l11 | v1→v2 | 4 | 2→3 (+`r-pede-comparacao-estruturada`) |
| l12 | **v2→v3** | 4 | manter 3 |
| l13 | v1→v2 | 5 | manter 3 |

Minutos: bump só nas duas lições de 3 min (padrão Q3 da O3-C1: l01/l04 3→4); l13 já no teto. Bindings na produção: `tracks[ai-pratica].contentVersion` + `runtime.contentVersion` das 6 missões ia-pratica (E4); nenhum chapterOrder/prereq muda. Esforço estimado (padrão AID-644 §5): autoria 12 × 0,5–0,75h + 15–25 min/lição ≈ **7,5–11,5h** + QA ≈ 2,5–4h (bate com AID-792 §2C).

## 2.6 Ruling de migração AID-640 — obrigatório nas seis (aplicação idêntica ao §1.1.3)
E1–E4 por lição modificada: aviso S1/S2 pelo bump (mecanismo existente); status grandfathered; pinagem A1–A3 estendendo os testes já pousados na O3-C1 com os casos l08–l13; E4 nos bindings ia-pratica. Nota adicional para o dispatch: l02 é a lição de entrada (A6 da O3-C1) — **l08–l13 não incluem a lição de entrada**, mas a regressão de onboarding continua no checklist da onda (guarda barata).

---

# 3. Entrega 3 — Leitura de retenção (SPEC-ONLY; consumida pelo fluxo P6 existente)

## 3.1 Escopo e fronteiras
**O que é:** procedimento de leitura que define o readout de retorno **d+1/d+7 + conclusão + H0** a partir dos instrumentos P6 existentes — [fichas](FICHA_P6.md) (§4) e células do funil quando houver **≥5 instalações** (item I3 do critério). **Quem executa:** facilitadora/founder produz (produtor da evidência); **QA valida** auditabilidade (producer ≠ verifier); CEO consome no despacho (item I2 anotado). **O que NÃO é:** nenhum instrumento novo, nenhum campo novo em FICHA/FOLHA/SINTESE, zero toque no piloto, zero lembrete enviado a participante (retorno é opcional por decisão founder — card `3c0474e9` Q2 = `optional`, 2026-09-03; AID-718). Nada disto gateia O3-C2 sozinho: I2/I3 são itens **informados** (CRITERIO_O3C2 §"Itens informados").

## 3.2 Readout d+1 (janela 24–48 h — a célula que o instrumento já mede)
**Denominador (participantes elegíveis):** quem concluiu a S1 dentro dos critérios do kit **e** tem "Janela combinada de retorno (24–48 h)" registrada na ficha de identificação. Quem abandonou antes da conclusão sai do denominador e vira linha à parte ("não elegível: não concluiu S1").
**Classificação por participante (da ficha §4, sem reclassificar):** `direto (observado)` / `relatado` / `não` / `inconclusivo`. Regras de leitura:
1. `direto` exige "Evidência do retorno" preenchida (observação da facilitadora, não inferência);
2. `relatado` entra em coluna separada — **nunca soma com direto**;
3. `inconclusivo` não conta como `não` (fica "não observado", motivo em 1 linha);
4. **0/3 retornos (qualquer coluna) precisa constar em destaque** (regra I2 do critério).
**Células derivadas (mesma ficha §4):** achou-onde-continuar-com-H0 (sim/não), fez-exatamente-a-próxima-recomendada (sim/não/outra rota), duração-da-sessão-de-retorno (min, valores brutos sem média), sinal-de-ritmo-próprio (sim/não + resumo curto).

## 3.3 Readout d+7
O instrumento P6 **não tem campo próprio** para d+7 — a leitura é honesta sobre isso:
1. Se o protocolo de 3 sessões (kit AID-639) agendou S3 dentro dos dias 3–9 (equivalente manual de R7 com tolerância 2 dias, alinhado ao `--grace-days 2` do funil): registrar as mesmas células de §3.2 para essa sessão, fonte = FOLHA_OBSERVACAO + fatos da síntese.
2. Se não houve sessão nem observação de retorno na janela: d+7 = **`não observado`** — nunca inferido de intenção relatada ("vou voltar semana que vem" é fala, não retorno; pode citar como fala Q, não como contagem).
3. Qualquer retorno espontâneo extra na janela (observado) entra como fato F com código/sessão.

## 3.4 Conclusão e H0 (modelos de preenchimento — denominador sempre explícito, nunca percentual)
**H0 da leitura (definição operacional):** "retorno sem ajuda" = retorno classificado `direto` **E** "Achou onde continuar com H0 = sim". H0 aqui é retomada sem ajuda — distinto do H0 do gate (G3: concluir a primeira lição sem ajuda); a leitura registra os dois com os nomes separados ("1ª conclusão com H0" vs "retorno com H0").
**Frase-modelo de conclusão (a facilitadora preenche na síntese):**
> "Retorno d+1 (24–48 h): __/N direto, __/N relatado, __/N não, __/N inconclusivo; retomada sem ajuda (retorno com H0): __/N; seguiram a próxima lição recomendada: __/N. d+7: [observado nas mesmas células / não observado — motivo]."
com N = participantes elegíveis. **Proibido na conclusão:** percentuais, "retenção de X%", claim de eficácia de aprendizagem, extrapolação para mercado (amostra 1–3 por conveniência; CRITERIO_O3C2 §preamble; SINTESE §Limitações).
**Onde landing (células existentes, zero novo campo):** SINTESE "Contagens brutas" → "Retornos diretos sem lembrete __ de __ participantes elegíveis" e "Retornos somente relatados __ de __"; "Cobertura das promessas" coluna "Retorno" (S/F/A/NO + D/R); "Limitações do recorte" → "Retorno: observado diretamente / parcialmente relatado / não observado"; despacho O3-C2 → item **I2** anotado com as contagens.

## 3.5 Células do funil quando houver ≥5 instalações (item I3 — condicional)
Pré-condição de ativação do funil: decisão do board (ADR-0010) — esta leitura **não** ativa nada. Quando o NDJSON existir e houver **≥5 instalações distintas por célula** (k-anonimato imutável, ADR-463 §3.0):
1. Executar `LEITURA_FUNIL_OPB.md` §§1–3 (export → drift-check → agregação com `--k 5 --windows 1,7,21 --grace-days 2 --now <fechamento>`).
2. Mapear para esta leitura: **R1** (coorte estreita: 1ª missão concluída — primária) ≙ d+1 com tolerância de graça; **R7** ≙ d+7; `reviewReturn` (sessão de retorno com revisão) é a contraparte do "achou onde continuar" — registrar lado a lado, sem mesclar fontes (funil mede a superfície **OS**; o P6 entra pelo LiteracyDojo avulso, cujo sink hoje é rejeitado 422 — LEITURA_FUNIL_OPB §escopo honesto; fichas continuam a evidência primária do P6).
3. Célula `suppressed (n<k)` = **não-publicável** (não é zero nem baixo): listar as seções suprimidas no registro; citar o `n` apenas como tráfego.
4. Registrar como work product datado (`_work-products/AID-<execucao>/funil-<data>.md`) + resumo de 1 frase/seção no comentário da issue de execução; NDJSON bruto nunca é anexado.
**Regra transversal (ADR-0009):** analytics ≠ evidência de aprendizagem; nada do funil conecta a claim de domínio/competência; `mastered` não existe em analytics.

## 3.6 Validação QA desta leitura (superfície de conferência)
QA confere (não reexecuta o piloto): fontes marcadas observado vs relatado por participante; denominadores coerentes entre fichas/síntese/despacho (mesmo N nas células d+1); `inconclusivo` não somado a `não`; destaque presente quando 0 retornos; d+7 ou observado-com-fonte ou `não observado`; nenhuma célula de funil publicada com n<k; conclusão sem percentual e sem claim de eficácia.

---

## 4. Anti-escopo global (o que esta entrega NÃO faz)
1. Zero escrita no repo: nenhum commit/branch/PR (lane do FPE), nenhuma edição de catálogo/contrato/bindings — os YAML anexos são **drafts de autoria**, espelho validado em árvore descartável fora do repo.
2. Nenhum id novo (próximo livre `l30`), nenhum T0, nenhum módulo/skill nova, nenhum tipo de atividade novo.
3. Sem renome de títulos/objetivos (ruling §7 da O3-C1); rubricas de l15–l17 intactas verbatim.
4. Nada em O3-C2 é produzido (spec-only, §2.1); `CRITERIO_O3C2.md` permanece imóvel.
5. Nenhum instrumento P6 tocado (FICHA/FOLHA/SINTESE/LEITURA_FUNIL); nenhum lembrete a participante; leitura consome artefatos, não os produz.
6. Sem toque em: missões voxel/games, O1 (AID-641/768/785), watchdog da janela (AID-670), AID-780/782, gates/verifier policy/learner state canônico.
7. Sem claim de mastery/eficácia; sem promessa de retenção a partir de n de piloto.

## 5. Método de verificação desta entrega (first-hand, nesta run)
- Baseline l15–l17/l08–l13 lida por arquivo (versões, tipos, rubricas, minutos, required, storage, hints); histograma de hints 72/72 por script; precedentes l27-a1/l29-a3/l15-a2/l17-a2 lidos na íntegra.
- **Validação executável:** árvore descartável `curriculum/ai-literacy` completa + os 3 patches (append a3, version 2, required completo) ⇒ `tools/validate.py` **OK: 29 ready (20+9), 0 planned** e `--compile` gera `lessons.ts` sem erros. Estrutura conferida por script: [a1,a2,a3] nas três, hints 3/3/3, rubricas 3×w1 inalteradas, `minimumScore 0.75`.
- Grep vendor-neutral nos três YAMLs novos: zero menção a fornecedor (dívida pré-existente de l17-a1 registrada em §1.5, fora do diff).
- Especificação-fonte AID-792 §2C conferida linha a linha contra a entrega (required/optional/distractors de l15-a3; reframe [CD-C] de l16-a3 com `outputs[]` = respostas do assistente; 5 passos + precedências adjacentes no `onFailure` de l17-a3; hints 2–3; rubricas sem realinhamento; +12 da pré-spec = l08–l13 com 2/lição; ruling AID-640 em todas as modificadas).
