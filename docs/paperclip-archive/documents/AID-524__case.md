<!-- issue: AID-524 | key: case | doc_id: 8fe023ef-379b-4f5d-8048-3efcecc64a5b | updated: 2026-09-01 13:13:36.214+00 -->

# AID-524 — Learner-needs case mod-07: recomendação de tema da onda l21+ (OP-C)

(AID-524)

# AID-524 — Learner-needs case mod-07: tema da onda de conteúdo l21+ (OP-C)

**Status:** CASE publicado — input de decisão do board (via CEO), no padrão dos drafts AID-447/AID-463. Somente leitura: nenhum commit/branch/PR; catálogo, contrato, missões, bindings e produção intocados; nada de conteúdo final prescrito.
**Owner:** UX Designer (0bfa47c1), delegado da triagem CEO AID-523 (`opb-content-hire`, aceite `ae63c0d8`).
**Baseline lida e citada:** `origin/main` @ `e483f9b` via `git show`/`git grep` (sem checkout); `curriculum/ai-literacy/catalog.yaml` `contentVersion 2026-08-31.1` (20/20 `ready`); `docs/design/ai-literacy/content-contract.md`; `engines/codexdojo-os-prototype/src/data/missions.ts` (mapa 27 missões pós OP-A). Issues: AID-447 (draft OP-C, rev `dd27311c`), AID-414 (spec C1–C3 — precedente de método), AID-426/AID-462 (ondas C1–C3/OP-A), AID-180/AID-365/AID-348 (coorte n=2, veredito CONTINUAR), AID-30 (auditoria de jornada — fricção), AID-448 (episódio confiança-feedback), AID-463 (meu scoping OP-B), AID-445/AID-459/AID-444 (decretos/QA).

---

## 1. Recomendação

| Posição | Candidato | Formato da onda
| --- | --- | --- |
| **Primária** | **(b) `ia_pratica` multimodal — imagens e documentos no pedido**, como **mod-07** (título de trabalho: "IA além do texto: documentos e imagens") | 3 lições `l21–l23`, formato integralmente herdado (3–5 min, 7 tipos de atividade, `minimumScore 0.75`, rubric, evidência v1, `intervalsDays [1,7,21]`)
| **Fallback** | **(a) mod-07 `ia_pratica` "Rotina com IA II" — agentes/automação de tarefas repetitivas** (o candidato nomeado no draft AID-447) | idem
| Não recomendado nesta onda | (c) `dev` l21+ — testes e revisão de código com IA | adiar para janela dev futura (§3.3)

A escolha final é do **board** (regra 7 — emenda de contrato, padrão T0, precedente PR #199). Este case é o input de learner-needs que faltava no caminho crítico do OP-C (pendência nº 4 do draft AID-447).

## 2. Lacuna de learner-needs que o conteúdo ataca (evidência)

### 2.1 O catálogo promete documentos, mas nunca ensina documentos

- **l03 (`l03-a1`, opção correta `t-resumo`)** ensina como ponto forte da IA: *"Resumir um documento longo que você mesmo forneceu"* — com a justificativa *"o conteúdo está todo ali, na conversa"*. Ou seja: **a mod-01 vende a capacidade; nenhuma lição l01–l20 ensina a executá-la** (anexar×colar trecho×descrever, referenciar o anexo no pedido, conferir extração).
- **Cobertura por grep em `curriculum/ai-literacy/modules/` @ main:** `imagem/foto/documento/anexo/planilha` aparecem apenas como (i) **item de classificação** em l12 (`i-planilha`, sensível), (ii) **fonte a ranquear** em l20 (`src-planilha`, primária) e (iii) **formato de saída** em l13/l14 (`mustIncludeAny` "documento/planilha"). **Nunca como modalidade de entrada do pedido.**
- **l12 ensina a classificar antes de COLAR texto** — o hábito de segurança construído pela trilha termina no colar. Ferramentas reais aceitam **anexos de arquivo e imagem** (fotos de quadro branco, scans, PDFs com CPF): é exatamente onde a exposição de dados migra quando o texto vira anexo, e a trilha não cobre.

### 2.2 Continuidade real do mod-06 (não apenas narrativa)

- **l18** deixa o learner numa rotina semanal explícita (*"nas próximas semanas basta trocar os dados da semana"*) — e o dado da semana vive em **documentos** (relatórios, atas, planilhas), não em texto digitado.
- **l19** (gerenciar contexto em conversas longas) e **l20** (verificar números e fatos contra fonte primária) são **exatamente** as habilidades que um documento anexado estressa: contexto grande e extração errável. A onda proposta transforma l19/l20 de tópicos isolados em **passo obrigatório do fluxo de trabalho real** — reforço espaçado natural (`intervalsDays [1,7,21]` já contratado por lição).

### 2.3 Equilíbrio de trilha e público

- Mapa OS @ main: **27 missões = 17 `ai-pratica` (l01–l14, l18–l20) + 10 `dev`** (game-02/03/05/06/07/08/09 + l15–l17). A trilha dev **acabou de receber** a onda OP-A (+4 missões, AID-462, mapa 24→27); ia_pratica recebeu C1–C3 (l18–l20) na mesma janela.
- O público primário da missão ("Profissionais não técnicos que querem usar IA no trabalho" — `track.audience`) tem 17 lições e **nenhuma** sobre a modalidade de entrada mais comum do trabalho real (documentos e imagens).

### 2.4 Fit de formato (viabilidade no contrato vigente — sem stress)

Os 7 tipos de atividade determinísticos carregam o tema 1:1, **sem novo padrão de UI e sem emenda de formato**:

| Tipo | Carga no tema (b) |
| --- | --- |
| `choice` | decidir anexar × colar trecho × descrever × não enviar |
| `safety_classification` | foto de quadro com nomes / scan com CPF / ata pública — seguro×sensível **antes de anexar** (estende `proteger` de l12 para anexos) |
| `prompt_builder` | pedido que referencia o documento anexado (o que pedir, o que citar do arquivo) |
| `output_comparison` | dois resumos do mesmo documento — qual preserva os números-chave |
| `rubric_review` | conferir extração contra o trecho original (critérios de l20) |
| `sort` / `missing_context` | etapas do fluxo anexar→pedir→conferir; contexto que falta quando só se descreve o documento |

Por contraste, **(a) agentes/automação** exige simular comportamento de ferramenta que varia por vendor e mês (risco de envelhecimento e de falso realismo — o episódio AID-448 mostrou o custo de feedback que não casa com a realidade) e carrega tensão direta com a promessa da trilha ("sem terceirizar o próprio julgamento", l13) se autoria de baixa qualidade.

## 3. Por que esta ordem (trade-offs honestos)

### 3.1 (b) acima de (a)

1. **Lacuna com promessa interna não cumprida** — o catálogo anuncia a capacidade (l03) e não ensina; é o mesmo método de "lacuna única" que justificou l19 no spec AID-414 (*"nenhuma lição l01–l17 cobre o tema"*).
2. **Exposição de segurança ativa** — learners já anexam arquivos em ferramentas reais sem treino (o treino para no colar); conteúdo novo **reduz risco existente**, não apenas adiciona tópico.
3. **Reforço das habilidades recém-ensinadas** (l18/l19/l20) em vez de introduzir paradigma novo (agentes) sobre base não medida.
4. **Fit determinístico** sem stress de contrato (§2.4).
- *Contra (b):* demanda relativa (b)×(a) é **hipótese** (sem funil — OP-B/AID-463 existe para medir); "agents" tem pull de mercado que (b) não tem.

### 3.2 (a) como fallback

Mesmo público da primária (a emenda de módulo tem a mesma forma), âncora natural em l18 (rotina semanal), e é o candidato nomeado do draft — escolha conservadora se o board priorizar pull de mercado/continuidade narrativa. **Condicionantes de mitigação se escolhido:** âncora em rotinas já ensinadas, julgamento humano explícito no objetivo de cada lição, zero citação de produto/vendor (padrão do catálogo), e atenção redobrada ao risco de abstração (§4 R6).

### 3.3 (c) adiado

A skill `codificar` promete "escrever, **revisar e testar** código" (`catalog.yaml`) e só "escrever" existe (l16) — a lacuna é real, mas a trilha dev recebeu +4 missões na janela OP-A; empilhar segunda onda dev consecutiva espera o público primário, consome a mesma capacidade de QA e fragmenta o precedente de cadência. Manter (c) como primeiro candidato da **próxima janela dev**.

## 4. Riscos de aprendizagem e mitigações

| # | Risco | Sinal | Mitigação |
| --- | --- | --- | --- |
| R1 | Expectativa de upload real (lição é simulação textual) parece abstrata | teste moderado: abandono/queixa | cenários com trechos concretos de artefatos; copy honesta "na sua ferramenta você fará X"; critério 3(iii) |
| R2 | Excesso de confiança em extração (OCR/erro de leitura) | primeira-tentativa alta sem verificação | toda extração pareada com conferência (estende l20; `rubric_review` exige critérios) |
| R3 | Regressão de segurança de modalidade ("foto não é texto, logo não é sensível") | classificação errada de anexos com PII | `safety_classification` com itens foto/scan/PDF; critério 3(ii) |
| R4 | Envelhecimento por ferramenta/vendor | menção a produto no YAML | vendor-neutral por contrato (padrão vigente: nenhuma lição cita produto) |
| R5 | Carga de vocabulário novo no primeiro contato (fricção P1 da auditoria AID-30) | termos novos no briefing | zero sistema de termos novo — reusar pedir/avaliar/proteger/aplicar |
| R6 | (fallback a) abstração de "agente" + tensão com "não terceirizar o julgamento" + envelhecimento rápido | objetivo de lição sem decisão observável do learner | condicionantes §3.2; julgamento humano explícito em cada objetivo |

Confiança no loop tentativa→feedback segue a lição do AID-448: feedback determinístico + hints progressivos (1–3) + `onFailure` obrigatório — já exigidos pelo build do contrato.

## 5. Critérios observáveis de sucesso

**Gate (não métrica):** emenda aprovada pelo board **antes** da produção (regra 7, padrão T0, precedente PR #199).

1. **Produção (idêntico ao arco C1–C3, AID-414/AID-426):** `l21–l23` `ready` + hospedadas jogáveis + QA wave-level GO + precheck de produção verde (mapa/missões/chapterOrder).
2. **Contrato de lição:** 100% das atividades com avaliação determinística, `onFailure` e hints; `minimumScore 0.75` preservado; `estimatedMinutes ∈ {3,4,5}` (o build falha caso contrário — verificação estrutural herdada).
3. **Teste moderado (formative, n≥5, persona ia_pratica que completou mod-06; registro em checklist falsificável no padrão ADR-0004):** (i) ≥80% decide corretamente anexar×colar×descrever em 3 cenários; (ii) ≥80% classifica anexo com PII como sensível **antes** de anexar; (iii) 0 abandonos por quebra de expectativa de upload.
4. **A11y (padrão wave-QA AID-444/457):** teclado/ARIA/`aria-live`/reflow@320 PASS nos pontos verificados.
5. **Pós-OP-B (quando F1/F2 do AID-463 ligarem):** conclusão do mod-07 e retorno por revisão nas lições do módulo reportadas no funil mensal (leitura direcional, k≥5, baseline do 1º ciclo — sem meta numérica externa).

**Tripwire de revisão:** primeiro funil com conclusão do mod-07 abaixo da mediana dos módulos ia_pratica, OU teste moderado <80% em 3(i)/(ii) → abrir issue de retrabalho de conteúdo antes de nova onda l24+.

## 6. Envelope de cobertura do módulo (input para spec — NÃO produção)

Três áreas de outcome do tamanho-lição (prereqs/títulos finais são do System Designer/CD na spec, padrão AID-414):

- `l21` — decidir **quando anexar, colar trecho ou descrever** (pedir/avaliar; gancho l05/l18);
- `l22` — **anexos seguros**: fotos, scans e PDFs sem expor pessoas (proteger; gancho l12);
- `l23` — **conferir o que a IA extraiu** do seu documento (avaliar/aplicar; gancho l20).

## 7. Consulta ao Content Designer (colaboração da delegação)

Roteada como **issue filha AID-526** (assignee f2b1e95d; comentário direto na AID-525 retornou 403 — fronteira de autorização): 5 perguntas de viabilidade/custo por candidato (esforço por onda, fit dos 7 tipos, biblioteca de cenários, concretude do fallback (a), tripwire de custo). As estimativas de esforço e skeletons de brief dos 3 candidatos já estão no escopo do doc `readiness` da AID-525 — a AID-526 amarra o lado de custo a este case. **Tripwire:** se o CD sinalizar custo de (b) materialmente maior que (a)/(c), rever esta recomendação **antes** da emenda ir ao board.

## 8. Nota epistêmica

Coorte AID-180 = n=2, veredito QA CONTINUAR (C1–C4 PASS) com "poder estatístico nulo" declarado (AID-348); QAs de onda medem integridade/a11y, não aprendizagem. Tudo que sustenta este case é **verificável no repositório** (cobertura do catálogo, promessa da l03, mapa 27, contrato de formato); o **ranking de demanda (b)×(a) é hipótese de design** — validável pelo funil do OP-B (AID-463) e pelo teste moderado do §5.3. Nenhuma eficácia é presumida; a recomendação é revisável no primeiro dado.

## Boundaries declaradas como respeitadas

- Somente leitura: leitura via `git show`/`git grep` em `origin/main` @ `e483f9b` (workspace em `main` local intocado neste escopo); nenhum commit/branch/PR.
- Catálogo, contrato, missões, bindings, pins e produção intocados; nenhum conteúdo final ou YAML prescrito (§6 é envelope de necessidades).
- Nenhum `mastered`; analytics ≠ evidência; produtor ≠ verificador preservados (o teste moderado do §5.3 é instrumento UX, não gate de competência).
- Consulta roteada por issue filha (AID-526) sem escrever na issue de outro agente.