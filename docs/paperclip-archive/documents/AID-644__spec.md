<!-- issue: AID-644 | key: spec | doc_id: f6522dd6-8984-4784-8f9b-57c68247f51a | updated: 2026-09-02 14:45:10.964+00 -->

# Spec O3-C1 — retrofit l01–l07 ao padrão de 3 atividades (rev 2 FECHADA: advisory CD 13/13 + errata §2.8 + sign-off UX S1/S2 verbatim + item D consolidados; autorias T1/T2 liberadas)

(AID-644)

# AID-644 — Spec O3-C1 rev 2 FECHADA (retrofit l01–l07 ao padrão de 3 atividades): advisory CD AID-645 (13/13, ajustes A1/A2, tabela §2.8 final + errata) + sign-off UX AID-646 (S1/S2 verbatim + item D) consolidados — autorias T1/T2 LIBERADAS

**Estado desta rev 2:** SPEC **FECHADA** — as duas portas de fechamento da rev 1 foram respondidas e estão consolidadas aqui: (1) **advisory CD de granularidade** AID-645 `done` (comentário `2ed06cf2`, 2026-09-02T14:25Z — tabela 13/13 + decisões Q1–Q5 + errata da §2.8 rev 1); (2) **sign-off UX da copy S1/S2** AID-646 `done` (comentário `d5d582b8`, 2026-09-02T14:23Z — APROVADO VERBATIM + 1 adição de superfície mínima, item D, incorporada no §3). Produção liberada: **T1 (mod-01, +5) / T2 (mod-02, +8)** abertas como filhas desta issue nesta heartbeat (dispatch via relay ao CD). Nenhuma escrita canônica por esta spec. Rev 1 = revisão `b2ca7df3` do doc `spec` (id `f6522dd6`).

**Baseline re-verificado first-hand (rev 1, SD @ `44b45d45`; re-confirmado nesta rev 2 pelo SD — ver §7):** catálogo `contentVersion "2026-09-02.2"`; **l01–l07 = 8 atividades** (l01=1, l02=1, l03=2, l04=1, l05=1, l06=1, l07=1); **rubricas 2/3/2/2/3/2/2 critérios** (3 em l02/l05); `estimatedMinutes` 3/4/4/3/5/4/4 ∈ enum `[3,4,5]`; versões v1/v3/v1/v1/v2/v1/v1; `requiredActivityIds` = conjunto vigente; bindings `ai-pratica` ch 1–20 contíguo, `recommendedEntryMissionId: l02`, `runtime.contentVersion` uniforme. Main vigente (`7101cf4`) não toca l01–l07 nem bindings `ai-pratica`.

---

## 0. Sumário executivo

- **Onda O3-C1** (decisão CEO AID-642, registrada na AID-644): retrofit de **l01–l07** (mod-01 "AI sem mistério" + mod-02 "Pedir bem", trilha `ia_pratica`) ao padrão de 3 atividades das ondas recentes (l14+, l18–l29). **+13 atividades** (l01+2, l02+2, l03+1, l04–l07 +2 cada); 8 → 21 atividades no subescopo. **Zero ids/módulos/skills novos** → **sem T0 board-gated** (regra 7 não dispara; precedente de edição in-place: l02 v3, l05 v2, l12 v2).
- **Porta obrigatória da ORDEM cumprida na rev 1:** ruling de migração **AID-640 (done)** incorporado — **§1.1 E1–E4 verbatim no §1.2** + R1–R4 por referência (rev `24082db2`, attachment `7d36fcee`).
- **Fechamento desta rev 2 (estado das portas):** advisory AID-645 → **13/13 atividades VALIDADAS**, 2 ajustes leves de cenário (A1 l01-a2; A2 l02-a2), rubricas confirmadas (5 critérios novos com textos fixados; l02/l05 mantêm as 3 existentes), 2 bumps de minutos confirmados, **zero exceções R1.3**, tabela §2.8 FINAL + errata da rev 1 consolidada (§2.8 abaixo). Sign-off UX AID-646 → **S1/S2 aprovados verbatim** + **item D** (pluralização da copy de review, `LessonScreen.tsx` ≈:225) incorporado à superfície mínima (§3). **Nada mais pendente para produzir.**
- **Por que (racional CEO AID-642):** (i) duas ondas de conteúdo novo consecutivas enquanto a jornada core l01–l13 segue em 1–2 atividades — `lessonScore` = média das obrigatórias, todo o peso do `minimumScore 0.75` numa única nota (AID-558 §1.2); (ii) funil OP-B desligado — nenhum sinal de demanda por conteúdo novo; (iii) trilha dev +3 (saturação desconhecida); (iv) enabler resolvido: ruling AID-640 done (grandfathering `migration.ts:87–98`; o que muda é o predicado de novas avaliações + superfície de revisão — comunicação, não perda de estado).
- **Ganho do design system:** consistência da jornada de primeira semana do público primário (ritmo "3–5 min" prometido), granularidade diagnóstica de score e material real para a janela de revisão `[1,7,21]` nas 7 lições de maior tráfego.

## 1. Decisões de design (evidência → decisão)

### 1.1 Sem T0 — retrofit é edição in-place com version bump (regra 3), não emenda

Nenhum id de lição/atividade/módulo/skill novo (próximo livre continua **l30**, regra 7); nenhum binding novo (missões já hospedadas; `chapterOrder` intacto). Regras acionadas: **regra 3** (version bump por lição alterada: l01 v1→v2, l02 v3→v4, l03 v1→v2, l04 v1→v2, l05 v2→v3, l06 v1→v2, l07 v1→v2) + **bump único de `contentVersion`** no primeiro landing (§4.2) + **regra 4** (progresso concluído permanece válido — implementado como grandfathering de status, `migration.ts:87–98`). Advisory Q5: **`skillId` das novas não muda `skillIds` de lição** (l01-a2/a3 `entender`; l02-a2/a3 `avaliar`; l03-a3 `entender`; l04/l05/l06 novas `pedir`; l07-a2 `avaliar`, l07-a3 `pedir`) → **diff de catálogo limitado a version/minutos**.

### 1.2 Porta obrigatória da ORDEM — ruling AID-640 §1.1 E1–E4, VERBATIM

> ### 1.1 Consequências concretas do retrofit C1 sem nenhuma mudança de código (E1–E4)
>
> - **E1 — Revisão devida imediata e mais longa:** o bump de `contentVersion` (inerente ao land) marca revisão devida para toda skill praticada (§1.4). No card "Revisão pendente" (`HomeScreen.tsx:138–152`), a lição retrofitada abre com **3** atividades onde o learner viu 1–2 — sessão de ~1 min vira ~3–5 min, **sem explicação**; abandono no meio deixa a revisão pendente (pressão de streak/meta diária). O force-due catálogo-wide já ocorre a cada onda (todo land é bump); o que muda em O3-C1 é a **superfície** da revisão nas 7 lições do subescopo.
> - **E2 — Replay/re-conclusão exige as novas atividades:** quem reabrir l01–l07 precisa jogar e passar a2/a3 para ver o resumo de conclusão (`canFinish`, §1.2); enquanto isso o outcome é `completed: false` com `missingActivityIds = [a2, a3]`. O status persistido permanece "completed" (§1.3) — não há rebaixamento, mas a experiência de "refazer" fica mais longa e o `completionClaim` novo só emite com o conjunto completo.
> - **E3 — Sessão em voo na promoção (raro, transitório):** sessão iniciada sob `required` antigo e finalizada após o land não passa em `canFinish`; o finish não produz payload. Recarregar retoma do início (respostas transitórias) e a nova sessão já cobre as 3 atividades. Mitigação: disciplina de promoção única em horário de baixo tráfego (padrão já praticado nas ondas).
> - **E4 — OS hospedado e evidência:** missões OS de l01–l07 mantêm estado próprio (não afetado pelo retrofit); fallback DOM por lição permanece válido (uma linha por lição); o comprimento da revisão hospedada cresce como em E1; `tracks[ai_pratica].contentVersion` e `contentVersion` dos bindings 7× sobem no land (cargo da tarefa de produção, padrão AID-610 §3.D).

Fonte: ruling AID-640 doc `ruling` rev `24082db2` §1.1 (attachment `7d36fcee`), incorporado sem edição. R1–R4 do mesmo ruling são incorporados por referência e especializados nos §1.3–§1.5 e §3–§6 abaixo.

### 1.3 Migração: Opção A do R4 adotada (sem mecanismo novo de estado)

`completed` persistido NÃO é rebaixado (grandfathering da regra 4, pinado por `migration.test.ts:12–18`); o contato com conteúdo novo acontece pela **revisão espaçada** (force-agendada pela migração), não por re-conclusão obrigatória. O buraco real é **comunicação (E1) + pinagem de comportamento (A1–A3, A6)** — §§3–4. Opções B/C/D do ruling §5: rejeitadas/registradas como fallback condicionado a funil pós-OP-B (decisão do ruling, não reaberta aqui).

### 1.4 Ordem das atividades novas: append-only (ruling R1) — advisory Q4: NENHUMA exceção

**R1.1:** atividades existentes mantêm id e posição; as novas recebem o próximo slot livre: `lNN-a2`/`lNN-a3` (**l03 recebe apenas `l03-a3`**). **Proibido renumerar/reordenar existentes** (ids são âncora de evidência v1 e analytics por `activityId`; o returning learner reconhece a1 como "a lição"; diff de produção/QA puramente aditivo — A4/A8). **R1.4:** bump de `estimatedMinutes` permitido dentro do enum `[3,4,5]` — **advisory Q3 CONFIRMA os 2 bumps: l01 3→4 e l04 3→4**; demais mantidos (l02 4, l03 4, l05 5, l06 4, l07 4). **R1.5:** `requiredActivityIds` = **conjunto completo das 3 atividades** em todas as 7 lições; **rubrica realinhada 1:1 ao novo conjunto — 3 critérios × weight 1** (decisões finais do advisory Q2 na §2). Exceção pedagógica de ordem (R1.3): **advisory Q4 — nenhuma lição pede exceção; o default append fica.** Nota única registrada: l05 tem `prompt_builder` no slot 1 (pré-existente, intocável); a sequência resultante **fazer→refletir→observar** (montar → julgar o que muda → ver o efeito) é espiral válida, não violação da progressão.

### 1.5 Distribuição de tipos: só os 7 tipos determinísticos provados, com progressão reconhecer→aplicar→diagnosticar

Padrão observado nas ondas recentes (l24–l29): a1 reconhecer/ordenar, a2 aplicar/construir, a3 diagnosticar/avaliar. Os briefs §2 seguem essa progressão com os tipos provados (`choice`, `sort`, `prompt_builder`, `missing_context`, `output_comparison`, `safety_classification`, `rubric_review`). Advisory Q1: **13/13 validados nos tipos propostos — zero tipos novos; zero `safety_classification`/`rubric_review` (omissão precedada: l18–l20 omitiu 2 tipos; l24–l26 omitiu rubric_review)**; progressão reconhecer→aplicar→diagnosticar confirmada lição a lição (única assimetria estrutural é l05, §1.4). Sem render de imagem/upload, sem free-text (storage `structured_only`), pt-BR, vendor-neutral (anti-escopo §8).

## 2. Especificação per-lesson (briefs CONSOLIDADOS — advisory AID-645 `2ed06cf2` aplicado; fonte de autoria das T1/T2)

**Contrato comum por atividade nova** (padrão AID-558 §2 / template AID-525 §2, checklists readiness §2/§3 — 8 checks/lição): id estável `lNN-aM`; tipo determinístico dos 7; `feedback.onFailure`+`onSuccess` (+`perCheck`); `hints` 1–3; `storage.policy: structured_only`; evidência `literacy-evidence v1 / verifierRequired: true` herdada da lição; pt-BR; vendor-neutral. **Notas de autoria do advisory (obrigatórias nas T1/T2):** (1) **l02 é a lição de entrada** (`recommendedEntryMissionId`, Mapa Inicial — A6): a2/a3 serão o primeiro contato de novos learners com o padrão-3 ⇒ orçamento de simplicidade máximo na copy (além da QA redobrada da spec); (2) ids de `contextOptions` das novas `missing_context` (l01-a3, l04-a3): kebab **sem** prefixo `ctx-` (precedente O2, l24/l25; l06-a1 existente conserva os seus `ctx-*` — sem colisão, l06 não recebe `missing_context` nova); (3) critérios de `output_comparison` com ids `c-*` (precedente l02-a1/l22-a1); (4) **l05-a2 × l06-a3 proibidos de reutilizar textos de opção entre si** (mesma mecânica multiSelect em lições vizinhas, props distintos; "cor da fonte" pode ecoar 1× em l06-a3 — reforço deliberado de `r-descarta-irrelevante`); (5) **l04-a2** parte exatamente do distrator `opt-melhora` de l04-a1 ("Melhora esse texto pra mim") — eco deliberado; manter o vocabulário da lição ("objetivo claro/verificável"), sem jargão novo além de tarefa/material/resultado; (6) distratores de l01-a3 ("nome do modelo de IA", "temperatura") aprovados — myth-busting de setup, vendor-neutral; (7) esforço ≈0,5–0,75h/atividade + 15–25 min/lição ⇒ onda ≈**8–12h** (lotes T1/T2 conforme §5.4).

### 2.1 `l01` "Sua primeira conversa com uma IA" (mod-01, [entender], v1→v2, 3→4 min ✔Q3) — +a2, +a3

a1 (choice, existe): resposta pronta = rascunho a revisar. **+a2 `sort` (4 itens — ajuste A1)** — o ciclo da primeira conversa: **escolher uma tarefa simples e concreta → escrever a pergunta com o mínimo de contexto → ler a resposta como rascunho → ajustar e usar**. **A1 (vinculante):** o ciclo é distinto do de l07-a1 (iteração-para-eficiência) pelos bookends "tarefa simples e concreta" e "usar o que passou pela sua revisão", e pela ausência do passo "repetir"; **proibido reutilizar o léxico dos itens de l07-a1** nos textos dos itens; **manter 4 itens** (não 5) para preservar o ritmo de l01 (3→4 min). Skill: `entender`. **+a3 `missing_context`** — colega vai fazer a primeira pergunta e mostra "me ajuda aí": faltam **tarefa-definida ✓, contexto-mínimo ✓, formato-esperado ✓** (distratores "nome do modelo de IA", "temperatura" — mito de setup, aprovados). Skill: `entender`. **Rubrica 2→3 (Q2):** critérios existentes verbatim + **`r-monta-a-primeira-pergunta`: "Monta a primeira pergunta com tarefa definida, contexto mínimo e formato esperado."**

### 2.2 `l02` "IA não é uma fonte de verdade" (mod-01, [entender, avaliar], v3→v4, 4 min) — +a2, +a3 · **ATENÇÃO A6: Mapa Inicial · lição de entrada (nota 1)**

a1 (output_comparison, existe): resposta confiável = declara limites + indica verificação. **+a2 `choice` (ajuste A2)** — resposta convincente com número específico SEM fonte, uso no trabalho pendente: o que fazer antes de usar (verificar na fonte primária ✓ vs confiar porque "parece específico" ✗ vs descartar a resposta inteira ✗). **A2 (vinculante):** juízo fica no nível **decisão** ("o que fazer antes de usar"); l20 é a dona da profundidade de verificação (marcar afirmações → hierarquia de fontes → completude); **não reutilizar o prop de l20** ("número de % para reunião") — sugestão do advisory: **número de mercado num texto de apresentação**. Skill: `avaliar`. **+a3 `sort`** — fluxo verificar-antes-de-usar: receber resposta → identificar afirmações que vão virar decisão → localizar a fonte → confirmar divergência → usar com a devida anotação (objeto distinto do sort de l20-a2 "hierarquia de fontes" — ok). Skill: `avaliar`. **Rubrica: MANTER as 3 existentes verbatim, sem realinhamento (Q2)** — `r-identifica-risco`/`r-escolhe-verificavel`/`r-justifica-criterios` já cobrem a2 (decisão) e a3 (fluxo) no nível de constructo; realinhar seria trocar palavras sem ganho de granularidade diagnóstica do `lessonScore`. **QA redobrada:** `MAP_INITIAL_LESSON_ID = l02` (`progress.ts:5`); fluxos `completeOnboarding` (`progress.ts:189–216`) e `migrateV2toV3` (`migration.ts:48–61`, referencia l01/l02 literalmente) devem sair intocados (critério A6).

### 2.3 `l03` "O que a IA faz bem e onde costuma falhar" (mod-01, [entender], v1→v2, 4 min) — **+a3 apenas**

a1/a2 (choice ×2, existem): bem × falha por categoria de tarefa. **+a3 `output_comparison`** — mesma tarefa pedida duas vezes, saída A fiel ao documento fornecido vs saída B inventando dado recente/citação precisa: escolher + marcar por quê (critérios `c-fiel-ao-material` + `c-sem-dado-inventado` — sugestão do advisory, padrão `c-*`; fecha o "por tipo de tarefa" com evidência de saída, não só de categoria). Ponte para l24–l26 (multimodal) permitida como cenário, sem a ensinar aqui. Skill: `entender` (mantém `skillIds` da lição — zero drift de catálogo). **Rubrica 2→3 (Q2):** + **`r-evidencia-na-saida`: "Prefere a saída fiel ao material fornecido e justifica pela evidência da saída, não só pela categoria da tarefa."**

### 2.4 `l04` "Dê um objetivo claro" (mod-02, [pedir], v1→v2, 3→4 min ✔Q3) — +a2, +a3

a1 (choice, existe): reconhecer o objetivo verificável entre 4 pedidos. **+a2 `prompt_builder`** — transformar "melhora esse e-mail" (eco deliberado do distrator `opt-melhora` de l04-a1 — nota 5) em pedido com **tarefa / material / resultado esperado verificável** (mustIncludeAny alinhados; vocabulário da lição, sem jargão novo). Skill: `pedir`. **+a3 `missing_context`** — pedido vago do colega: falta tarefa ✓, material ✓, resultado-esperado ✓ (eco diagnóstico do critério "objetivo que pode ser verificado"; contextOptions kebab sem `ctx-` — nota 2). Skill: `pedir`. **Rubrica 2→3 (Q2):** + **`r-tarefa-material-resultado`: "Completa e diagnostica pedidos com tarefa, material e resultado esperado verificável."** Núcleo de `pedir` — maior cuidado de copy (jornada de maior tráfego).

### 2.5 `l05` "Dê contexto para obter resposta útil" (mod-02, [pedir], v2→v3, 5 min) — +a2, +a3

a1 (prompt_builder, existe, slot 1 pré-existente — intocável; sequência resultante fazer→refletir→observar = espiral válida, Q4). **+a2 `choice` multiSelect** — quais contextos MUDAM a resposta para a tarefa dada ✓ vs detalhes que não mudam nada ✗ (treina o juízo "contexto ≠ tudo sobre mim"; **proibido reutilizar textos de opção com l06-a3** — nota 4). Skill: `pedir`. **+a3 `output_comparison`** (≠ prompt_builder — ver errata §2.8) — mesmo pedido com e sem os campos preenchidos: qual resposta está pronta para usar e por quê (critérios `c-responde-a-situacao-real`, `c-pronta-para-usar` — como no brief). Skill: `pedir`. **Rubrica: MANTER as 3 existentes verbatim, sem realinhamento (Q2)** — `r-campos-especificos`/`r-contexto-suficiente`/`r-pedido-utilizavel` cobrem a2 (o que muda = contexto suficiente) e a3 (pronta para usar = pedido utilizável) exatamente.

### 2.6 `l06` "Defina público, tom e formato" (mod-02, [pedir], v1→v2, 4 min) — +a2, +a3

a1 (missing_context, existe): detectar público/tom/formato ausentes (conserva seus `ctx-*`). **+a2 `prompt_builder`** — acrescentar público/tom/formato explícitos a um pedido que já tem objetivo+contexto (progressão natural do a1). Skill: `pedir`. **+a3 `choice` multiSelect** — o que muda quando público/tom/formato estão definidos ✓ vs o que não muda a resposta (ex.: cor da fonte — eco 1× permitido, reforço deliberado de `r-descarta-irrelevante`; **proibido reutilizar textos de opção com l05-a2** — nota 4). Skill: `pedir`. **Rubrica 2→3 (Q2):** + **`r-adiciona-apresentacao`: "Acrescenta público, tom e formato a um pedido que já tem objetivo e contexto."**

### 2.7 `l07` "Melhore a resposta em etapas" (mod-02, [pedir, avaliar], v1→v2, 4 min) — +a2, +a3

a1 (sort, existe): ciclo pedir → ler → ajustar → repetir. **+a2 `choice`** — dado o feedback "o tom está formal demais", qual é o próximo pedido certo (ajuste específico do que mudar ✓ vs "refaz tudo" ✗ vs aceitar como está ✗). Skill: `avaliar` (já ∈ skillIds de l07). **+a3 `prompt_builder`** — montar o pedido de ajuste com campos **o-que-mudar / onde / o-que-manter** (planta o eco de l19 "Conversas longas", dona do padrão de contexto-perdido — nota ruling §6). Skill: `pedir`. **Rubrica 2→3 (Q2):** + **`r-pedido-de-ajuste`: "Formula o pedido de ajuste dizendo o que mudar, onde e o que manter."**

### 2.8 Totais e distribuição de tipos — TABELA FINAL (advisory Q5; SUBSTITUI a provisória da rev 1)

| Tipo | Novas | Onde |
| --- | --- | --- |
| `choice` | **4** | l02-a2; l05-a2 (multi); l06-a3 (multi); l07-a2 |
| `prompt_builder` | **3** | l04-a2; l06-a2; l07-a3 |
| `sort` | **2** | l01-a2; l02-a3 |
| `missing_context` | **2** | l01-a3; l04-a3 |
| `output_comparison` | **2** | l03-a3; l05-a3 |
| `safety_classification` / `rubric_review` | **0** | omissão precedada (l18–l20 omitiu 2 tipos; l24–l26 omitiu rubric_review) |

**Total = 13 ✓ (4+3+2+2+2). ERRATA da rev 1:** a contagem provisória estava errada — l05-a3 é `output_comparison` (não prompt_builder) e missing_context/sort são 2 cada (não 3). A tabela acima é a definitiva.

## 3. R2 — Comunicação ao learner (copy S1/S2 + item D; sign-off UX AID-646 `d5d582b8`: APROVADO VERBATIM + 1 adição incorporada)

**S1/S2 aprovados VERBATIM pelo UX Designer (AID-646, 2026-09-02T14:23Z) — texto final, sem ajuste:**

- **S1 — card "Revisão pendente" do Home**, quando a revisão devida for de lição retrofitada: linha adicional, texto literal: *"Esta lição ganhou atividades novas — sua conclusão continua valendo."*
- **S2 — intro da lição retrofitada**, primeira execução pós-bump por learner: *"Esta lição agora tem atividades novas. O que você já concluiu continua valendo."*

**Gatilho:** bump de `contentVersion` cujo diff inclua novas atividades em lição com status persistido "completed" para aquele learner. **Idempotência:** exatamente 1× por learner/lição/bump de `contentVersion` (chave local estruturada; nada de texto livre persistido — respeita `storage.policy`). **Constraints mantidas:** ≤2 frases; sem "você precisa refazer"; sem culpa; pt-BR simples; vendor-neutral. **Dono de produção:** FPE (superfície mínima: UI + flag idempotente; zero mudança de domínio; ≈0,5–1 dia incl. testes). **Ordem de pouso:** S1/S2 entra no MESMO PR da onda ou ANTES dele — nunca depois (senão E1 fica sem explicação na primeira revisão force-devida).

**Item D (aditivo do sign-off UX, incorporado à superfície mínima desta onda):** pluralizar a copy de review existente — `LessonScreen.tsx` ≈:225 (modo review, intro): "Repetir é o que fixa: refaça **a atividade** desta lição…" → ajuste mínimo: **"refaça as atividades desta lição"** (resto da frase inalterado). Justificativa UX: pós-retrofit TODAS as revisões de l01–l07 rodam 3 atividades — o singular contradiz o próprio aviso S1/S2 na mesma tela onde ele mora; hoje já está impreciso para l03 (2 atividades). Custo ≈ zero (mesma linha/arquivo que o FPE toca para S2; zero mudança de domínio/schema).

**Notas de colocação do UX (não mudam a copy; para o FPE):** S1 como `<p>` próprio imediatamente acima do botão "Revisar agora" (amarra o demonstrativo ao alvo único do CTA — verificado: `reviewLesson` abre exatamente uma lição), com estilo secundário/muted para não competir com o CTA primário do card; S2 como linha própria na intro, antes do CTA ("Começar missão"/"Começar revisão").

**Trade-off registrado pelo UX (hipótese, não bloqueio):** quem abandonar a sessão no meio e reabrir depois não revê S2 (idempotência 1×/bump) — o S1 do Home continua cobrindo a explicação nas revisões subsequentes. Aceitável na superfície mínima; reavaliar com evidência de funil pós-OP-B.

## 4. Produção mecânica (o que exatamente muda em arquivos)

### 4.1 Conteúdo (CD → drafts; FPE → landing)

- 7 YAMLs em `curriculum/ai-literacy/modules/{01-ai-sem-misterio,02-pedir-bem}/lNN-*.yaml`: append das atividades novas (R1.1); `version` bump por lição (§1.1); rubrica 3×weight-1 (5 lições +critério novo verbatim §2; l02/l05 mantêm as 3 existentes); `requiredActivityIds` = conjunto completo; `estimatedMinutes` ∈ enum (**bumps: l01 3→4, l04 3→4** — Q3); skills por atividade conforme §1.1 (zero mudança de `skillIds` de lição).
- `validate.py` verde + `gen:content` regenera o read model (`src/data/generated/lessons.ts`) + fixtures de conteúdo regenerados (padrão pretest/prebuild).

### 4.2 Versionamento e bindings (bump ÚNICO no primeiro landing)

- `catalog.yaml`: `contentVersion` sobe 1× (ex.: `2026-09-02.2` → `2026-09-02.3`; número exato é do FPE no momento do landing).
- `engines/codexdojo-os-prototype/config/mission-bindings.yaml`: `tracks[ai-pratica].contentVersion` + os 7 `runtime.contentVersion` das missões l01–l07 (E4). **Nada mais em bindings:** `chapterOrder`, prereqs, `recommendedEntryMissionId: l02`, fallbacks DOM e entradas de missão intactos.
- Nenhum arquivo de contrato/schema tocado (sem T0): regra 7 não dispara; `l30` segue o próximo livre.

### 4.3 App/tests (FPE)

- **S1/S2 + item D + flag idempotente** (§3) em `engines/literacyDojo` + teste de idempotência (A5). Item D = pluralização de 1 linha em `LessonScreen.tsx` ≈:225 (mesma área que S2).
- **Pinagem de comportamento (A1–A3, A6):** estender `tests/domain/migration.test.ts` com caso retrofit (l01 concluída só com a1 permanece `completed`; A1/A2); estender `progress.test.ts` com o predicado version-blind (bestScores só-a1 ⇒ `completed:false` + `missingActivityIds=[a2,a3]`; 3× ≥0.75 ⇒ `completed:true`; A3); regressão de onboarding l02/Mapa Inicial + `migrateV2toV3` (A6).

## 5. Pipeline de produção, portas e esforço (padrão AID-610 §6, adaptado sem T0) — estado das portas na rev 2

**Sequência (portas):**
1. ~~**Advisory CD — granularidade**~~ — ✅ **FECHADA**: AID-645 `done`, comentário `2ed06cf2` (13/13; A1/A2; Q2–Q5; errata §2.8).
2. ~~**Sign-off UX — copy S1/S2**~~ — ✅ **FECHADA**: AID-646 `done`, comentário `d5d582b8` (S1/S2 verbatim + item D incorporado no §3).
3. ~~**Spec rev 2 fechada (SD)**~~ — ✅ **ESTA REVISÃO** (consolida advisory + sign-off + verificação first-hand §7); produção liberada.
4. **Autoria CD** — **ABERTA nesta heartbeat**: **T1 (mod-01: l01–l03, +5)** e **T2 (mod-02: l04–l07, +8)** como filhas desta issue, assigned ao CD (f2b1e95d), dispatch via relay SD→CD (precedente AID-614: assignment pode não disparar run). 7 drafts como docs `draft` nas issues de produção (template/checklist readiness §2/§3 AID-525 — 8 checks/lição).
5. **Landing FPE** — recomendado **PR único da onda** (7 lições + S1/S2 + item D + testes A1–A6 + bump único §4.2): diff puramente aditivo revisável por lição no mesmo PR; evita 6 rebases sequenciais de `contentVersion` do padrão por-lição. Trade-off (PR maior) aceito: superfície de QA é wave-level de qualquer forma. Alternativa por-lição permanece a critério do FPE SE rebases provarem baratos — bump único no primeiro landing em qualquer caso (ORDEM). S1/S2/item D podem começar com o FPE em paralelo às autorias (ordem de pouso §3), a critério do dispatch do board.
6. **Promoção única** (padrão AID-630): pin/alias/permalink + rollback owner FPE + precheck estendido: hosted das 7 lições retrofitadas com 3 atividades, aviso S1/S2 renderizando, `contentVersion` novo, mapa 36 missões intacto, contagens ia-pratica 20/dev 9, horário de baixo tráfego (E3).
7. **QA wave-level independente** (QA Lead ca6a3f95; produtor ≠ verificador; padrão AID-631/AID-638): GO/NO-GO + re-grant de readiness sobre a superfície de **7 lições** (maior que onda padrão de 3 — flag (ii) AID-559); checklist A1–A8 (§6); a11y e grep vendor-neutral.
8. **Close-out** (SD): receipt na AID-644 + reconciliação de gates (padrão AID-607) + abertura formal da **janela de consolidação 21 dias** (§6) com checkpoints d+1/d+7/d+21.

**Esforço (ruling §6 + AID-559 + advisory nota 7):** CD ≈**8–12h** (13 atividades × 0,5–0,75h + 15–25 min/lição de integração; T1 ≈3–4h, T2 ≈5–7h); FPE ≈**1–1,5h** landing + **≈0,5–1 dia** S1/S2+item D+testes; QA **1 ciclo** (superfície 7 lições); SD spec rev1+rev2 ≈1 heartbeat cada.

## 6. Janela de consolidação R3 — critérios de aceitação A1–A8 (ruling §4, incorporados por referência; QA independente)

**Janela:** começa na **promoção única** e dura **21 dias** (alinhada ao maior intervalo `[1,7,21]`), checkpoints **d+1/d+7/d+21**. **Métricas:** só superfícies existentes (evidência local `literacy-evidence v1`: tentativas/pass por atividade nova; conclusão de revisões nas 7 lições; abandono de revisão E1) + funil OP-B quando existir (direcional; **hipóteses, nunca claim de eficácia** sem gate evidence).

- **A1 Nenhum rebaixamento de status** — caso retrofit em `migration.test.ts` (l01 concluída só com a1 ⇒ permanece `completed`).
- **A2 Revisão devida preservada** — migração marca `nextReviewAt=now` para skills praticadas (re-pin sob catálogo novo).
- **A3 Predicado version-blind pinado** — `evaluateLessonCompletion`: só-a1 ⇒ `completed:false` + `missingActivityIds=[a2,a3]`; 3× ≥0.75 ⇒ `completed:true` (`progress.test.ts`).
- **A4 Conteúdo** — `validate.py` verde; 7 lições com 3 atividades; `requiredActivityIds` = conjunto completo; rubricas 3 critérios weight 1 (l02/l05 = as 3 existentes mantidas); `version` bump nas 7; `estimatedMinutes` ∈ enum (l01/l04 = 4).
- **A5 Aviso** — S1/S2 renderizam 1× por learner/lição/bump (teste de idempotência); item D plural aplicado; zero mudança em gates/evidence schema.
- **A6 Regressão de jornada** — learner `in_progress` completa normalmente; novo learner vê minutos coerentes; **l02 (Mapa Inicial, `MAP_INITIAL_LESSON_ID`) intacto** no onboarding e em `migrateV2toV3` (que referencia l01/l02 literalmente).
- **(E3 documentado e aceito)** — sessão em voo não crasha; finish sem payload trata como "ainda falta".
- **A8 QA wave-level sobre 7 lições modificadas** — checklist de leitura + diff puramente aditivo (R1) + suíte literacyDojo (`gen:content`, lint, test, build, e2e).

**Saída da janela:** d+21 com A1–A8 verdes e sem defeito P1/P2 aberto nas lições C1; senão, follow-up issue com dono nomeado.

## 7. Método de verificação

- **Da rev 1 (executado, registro mantido):** leitura first-hand no workspace da onda (@ `44b45d45`, árvore limpa): catálogo, os 7 YAMLs de l01–l07 por parse scriptado, bindings, `mission-bindings.yaml`/`progress.ts:5` para A6, e o ruling AID-640 integral (doc `ruling` rev `24082db2` + attachment) do qual E1–E4 foram copiados verbatim. Nota de defasagem: workspace 1 onda atrás do main (`7101cf4` = l29 + registro de promoção + re-grant docs) — nenhum desses lands toca l01–l07 ou bindings `ai_pratica`.
- **Da rev 2 (executado nesta heartbeat, SD):** (i) **baseline re-confirmado por leitura direta** dos 7 YAMLs @ `44b45d45` — versões v1/v3/v1/v1/v2/v1/v1; minutos 3/4/4/3/5/4/4; rubricas **2/3/2/2/3/2/2** critérios (ids conferidos: l01 `r-rascunho`,`r-julgamento`; l02 `r-identifica-risco`,`r-escolhe-verificavel`,`r-justifica-criterios`; l03 `r-pontos-fortes`,`r-pontos-fracos`; l04 `r-objetivo-verificavel`,`r-reconhece-vago`; l05 `r-campos-especificos`,`r-contexto-suficiente`,`r-pedido-utilizavel`; l06 `r-identifica-faltantes`,`r-descarta-irrelevante`; l07 `r-ciclo-iteracao`,`r-ajuste-especifico`) — bate com o advisory AID-645 e valida a pré-condição das decisões Q2 (5 lições saem de 2; l02/l05 já têm 3); 8 atividades no subescopo. (ii) **âncoras de copy conferidas** no mesmo commit: card `card-review` "Revisão pendente" com lista de skills + CTA único "Revisar agora" (`HomeScreen.tsx` ≈139–154 — alvo de S1); linha singular de review "Repetir é o que fixa: refaça **a atividade** desta lição…" (`LessonScreen.tsx` ≈225 — alvo do item D); intro compartilhada initial/review (`≈199–267`) e contador dinâmico "atividade X de Y" (`≈289` — já plural-safe); `MAP_INITIAL_LESSON_ID = "l02"` (`progress.ts:5` — A6). Nenhuma divergência entre advisory AID-645, sign-off AID-646 e o código-fonte inspecionado.
- **Da onda (portas abertas):** gates do §5 por porta + QA A1–A8 (§6). Eficácia pedagógica NÃO é presumida por este spec — teste moderado (kit AID-639) e funil OP-B (quando ligar) são os instrumentos, propriedade do UX.

## 8. Anti-escopo e decisões explicitamente reservadas

**Anti-escopo (o que esta onda NÃO faz):**
1. Nenhum id/módulo/skill novo (próximo livre **l30**); nenhum T0; nenhum arquivo de contrato/schema tocado.
2. Nenhum binding além dos `contentVersion` (E4): `chapterOrder`, prereqs, missões, fallbacks e entradas intactos.
3. Nada toca gates, verifier policy, mastery, learner state canônico; `mastered` permanece do verificador independente (produtor ≠ verificador).
4. Nenhum tipo de atividade novo; nenhum render de imagem/upload real; sem free-text persistido.
5. Zero menção a vendor/produto de IA no conteúdo (grep RD4 na QA).
6. **Renome de títulos/objetivos das lições NÃO acontece** (ruling §7: manter títulos estáveis reduz superfície de QA; permitido pela regra 2, não usado nesta onda).
7. O3-C2 (l08–l13, +12) **não é liberado** — somente após C1 sustentar (janela §6) + evidência OP-B.

**Reservadas (resolvidas ou remanescentes):**
1. ~~Granularidade final por atividade (cenário/tipo/distratores/copy) — advisory CD~~ → **RESOLVIDA nesta rev 2** (§§2.1–2.8, decisões Q1–Q5 aplicadas).
2. ~~Copy final S1/S2 — sign-off UX~~ → **RESOLVIDA nesta rev 2** (§3, verbatim + item D).
3. Número exato do `contentVersion` novo e formato do PR (único vs por-lição recomendado §5.5) — FPE no landing.
4. Timing de promoção e GO de QA — gates de produção (§5.6–5.7).
5. Renome de mod-05 e prioridade l30+ — decisões reservadas da spec AID-610 §8, re-levantáveis no close-out desta onda.
6. Eficácia pedagógica e métricas de retenção — UX com evidência de coorte/funil; hipóteses até OP-B ligar.
