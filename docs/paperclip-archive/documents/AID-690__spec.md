<!-- issue: AID-690 | key: spec | doc_id: 34457133-57fe-45fa-a06a-a3d81beb7d43 | updated: 2026-09-02 20:13:13.879+00 -->

# AID-690 — Spec O3-C2 rev 1 DRAFT (retrofit l08–l13, +12): baseline verificável + granularidade proposta + portas pendentes — ONDA GATED (AID-644 §8.7)

(AID-690)

# AID-690 — Spec O3-C2 rev 1 **DRAFT** (retrofit l08–l13 ao padrão de 3 atividades): baseline verificável + granularidade proposta + portas pendentes — **ONDA GATED (AID-644 §8.7)**

**Estado desta rev 1: PRE-DRAFT (DRAFT ONLY).** Lane paralela de preparação para eliminar o cold-start da onda O3-C2 no fim da janela 21d de O3-C1 (saída d+21 = **2026-09-23T17:16Z**, watchdog AID-670). **Este draft NÃO despacha T1/T2, NÃO toca produção/repo, NÃO faz escrita canônica.** Onda permanece fechada pelo gate verbatim (spec AID-644 rev 2, §8 item 7):

> **"O3-C2 (l08–l13, +12) não é liberado — somente após C1 sustentar (janela §6) + evidência OP-B."**

**Baseline re-verificado first-hand (SD @ main `a10158d`, árvore limpa, 2026-09-02; método no §7):** catálogo `contentVersion "2026-09-02.3"`; **l08–l13 = 6 atividades** (1 por lição); rubricas **2/3/2/2/3/3** critérios (3 em l09/l12/l13); `estimatedMinutes` **3/4/3/4/4/5** ∈ enum `[3,4,5]`; versões **v1/v1/v1/v1/v2/v1**; `requiredActivityIds` = conjunto vigente (1 atividade cada); bindings `ai-pratica` de l08–l13 presentes com `runtime.contentVersion` uniforme `2026-09-02.3`; `recommendedEntryMissionId: l02`. Main vigente (`a10158d` = PRs #249/#250/#251/#253 pós-promoção C1) **não toca os YAMLs de l08–l13** (últimos touches: `a0f8776`/`957ca0f`, anteriores à onda C1).

---

## 0. Sumário executivo

- **Onda O3-C2 (proposta, GATED):** retrofit de **l08–l13** (mod-03 "Avaliar e verificar" + mod-04 "Segurança e aplicação", trilha `ai_pratica`) ao padrão de 3 atividades. **+12 atividades** (2 por lição, uniforme — nenhuma exceção de slot); 6 → 18 atividades no subescopo. **Zero ids/módulos/skills novos** → **sem T0 board-gated** (regra 7 não dispara; próximo livre segue `l30`).
- **Por que (racional herdado de AID-642/C1):** a jornada core l01–l13 fica toda no padrão-3 (C1 levou l01–l07; C2 fecha o arco até o desafio final l14); `lessonScore` = média das obrigatórias — hoje 1 nota carrega todo o peso do `minimumScore 0.75` em 6 lições de tráfego médio; granularidade diagnóstica + material real para a revisão espaçada `[1,7,21]`.
- **Economia estrutural vs C1:** toda a maquinaria de onda já existe e é genérica — migração/grandfathering (pinado), predicado version-blind (pinado), **aviso S1/S2 implementado e genérico** (`retrofitNotice.ts`), pluralização item D no ar (`LessonScreen.tsx:228`). Superfície de app nova = **1 entrada no registro de onda + testes** (§3).
- **Este draft propõe; as portas decidem:** granularidade final (12/12) é validação do **advisory CD** (porta própria, padrão AID-645) e a cobertura de copy é sign-off **UX** (padrão AID-646) — ambas só abrem **se/como onda abrir** (§5, §8).

## 1. Decisões de design propostas (evidência → decisão)

### 1.1 Sem T0 — retrofit é edição in-place com version bump (regra 3)

Nenhum id de lição/atividade/módulo/skill novo; nenhum binding novo (missões já hospedadas). Regras acionadas: **regra 3** (version bump por lição alterada: l08 v1→v2, l09 v1→v2, l10 v1→v2, l11 v1→v2, l12 v2→v3, l13 v1→v2) + **bump único de `contentVersion`** no primeiro landing (§4.2) + **regra 4** (progresso concluído permanece válido — grandfathering `migration.ts`, pinado na C1). `skillId` das novas não muda `skillIds` de lição (l08–l11 novas `avaliar`; l12 novas `proteger`; l13 novas `aplicar`) → diff de catálogo limitado a version/minutos.

### 1.2 Consequências E1–E4: ruling AID-640 aplica por referência; estado C2

O ruling AID-640 §1.1 (E1–E4) descreve as consequências do padrão retrofit **sem mudança de código** e é incorporado por referência (texto verbatim na spec AID-644 rev 2 §1.2; não reaberto aqui). Especialização C2: (i) **E1** — revisão devida imediata nas 6 lições retrofitadas (sessão ~1 min → ~3–5 min), **agora com explicação**: o aviso S1/S2 já existe e o registro de onda (§3) o estende a l08–l13; (ii) **E2** — replay/re-conclusão exige a2/a3 (`canFinish` version-blind, já pinado); (iii) **E3** — sessão em voo: mesma mitigação (promoção única em horário de baixo tráfego); (iv) **E4** — `tracks[ai-pratica].contentVersion` + 6 `runtime.contentVersion` sobem no land.

### 1.3 Append-only (R1.1) e minutos (proposta Q3)

Atividades existentes mantêm id e posição; as novas recebem `lNN-a2`/`lNN-a3` (**todas as 6 lições recebem a2+a3 — nenhuma exceção de slot**, ao contrário de l03 na C1). Proibido renumerar/reordenar. `requiredActivityIds` = conjunto completo das 3. `estimatedMinutes` ∈ enum `[3,4,5]`: **bumps propostos: l08 3→4 e l10 3→4** (mix passa a ter 3 mecânicas); mantidos: l09 4, l11 4, l12 4, l13 5 (capstone do módulo, mix pesado prompt_builder+sort+output_comparison). Confirmação é do advisory (porta Q3).

### 1.4 Tipos: só os 7 determinísticos provados; progressão reconhecer→aplicar→diagnosticar

Padrão das ondas recentes (C1; l24–l29): a1 reconhecer, a2 aplicar/decidir, a3 diagnosticar/julgar. Briefs §2 seguem essa progressão com os tipos provados (`choice`, `sort`, `prompt_builder`, `missing_context`, `output_comparison`, `safety_classification`, `rubric_review`). **Proposta: zero `safety_classification`/`rubric_review` novas** (omissão precedada: l18–l20 omitiu 2 tipos; l24–l26 e C1 omitiram rubric_review) — a1 de l12 já treina `safety_classification`; nenhuma nova precisa do tipo. Sem render de imagem/upload, sem free-text persistido (novas = `storage.policy: structured_only`; **exceção pré-existente intocável**: `l13-a1` `digest_only`), pt-BR, vendor-neutral.

## 2. Especificação per-lesson (briefs PROPOSTOS — fonte para o futuro advisory CD; NÃO são autorização de produção)

**Contrato comum por atividade nova** (padrão AID-558 §2 / template AID-525 §2, checklists readiness §2/§3 — 8 checks/lição): id estável `lNN-aM`; tipo determinístico dos 7; `feedback.onFailure`+`onSuccess` (+`perCheck`); `hints` 1–3; `storage.policy: structured_only`; evidência `literacy-evidence v1 / verifierRequired: true` herdada da lição; pt-BR; vendor-neutral. **Notas de autoria (vinculantes nos futuros drafts):** (1) ids de `contextOptions` das novas `missing_context`: kebab **sem** prefixo `ctx-` (precedente O2/C1); (2) critérios de `output_comparison` com ids `c-*` (precedente l02-a1/l22-a1/l08-a1); (3) **sorts vizinhos**: l13-a3 não pode reutilizar o léxico dos itens de l07-a1/l01-a2/l11-a1 (objetos distintos — ver 2.6); (4) **choices multi de "marca o que X"**: l09-a2 e l12-a3 têm mecânica vizinha da C1 (l05-a2/l06-a3) — props distintos, zero reuso de textos entre lições; (5) esforço ≈0,5–0,75h/atividade + 15–25 min/lição ⇒ onda ≈**7–11h** (lotes §5.4).

### 2.1 `l08` "A primeira resposta não é necessariamente a melhor" (mod-03, [avaliar], v1→v2, 3→4 min ✔proposta Q3) — +a2, +a3

a1 (output_comparison, existe): clínica/20% faltas — escolher a resposta aplicável + marcar motivos (critérios `c-acoes`/`c-comeco`/`c-extenso`). **+a2 `choice`** — primeira resposta veio genérica/corporativa; qual a próxima ação certa para melhorar: pedir 2–3 alternativas concretas e compará-las nos critérios da situação ✓ vs aceitar porque parece completa ✗ vs repetir o mesmo pedido literal ✗ vs pedir "mais longa" ✗. Skill: `avaliar`. **Fronteira:** l07-a2 é ajuste específico de resposta boa dado feedback; l08-a2 é não parar na primeira quando ela não serve (regenerar/comparar com critério). **+a3 `missing_context`** — colega pediu "me dá outra opção" e recebeu mais do mesmo; faltam **critério-de-escolha ✓, restrições-da-situação (prazo/custo) ✓** (distratores: "pedir à IA para conferir se ela tem certeza" ✗ — mito, a IA não sabe se está certa; "nome do modelo" ✗). Skill: `avaliar`. **Rubrica 2→3 (proposta Q2):** critérios existentes verbatim + **`r-pede-alternativas`: "Pede alternativas e compara com critérios explícitos em vez de aceitar a primeira resposta."**

### 2.2 `l09` "Como reconhecer uma resposta inventada" (mod-03, [avaliar], v1→v2, 4 min) — +a2, +a3

a1 (rubric_review, existe): resposta com "estudo da USP"/87%/35% — vereditos por critério. **+a2 `choice` multiSelect** — nova resposta para um relatório: marcar as frases com sinal de invenção (citação genérica sem título/autor/link ✓, estatística precisa sem origem ✓, "especialistas confirmam" ✓ vs fato trazido pelo próprio usuário no pedido ✗, recomendação com ressalva explícita ✗). Skill: `avaliar`. **Fronteira:** sinais ficam no nível l09 (superfície da resposta); l20 é dona de marcar afirmações + hierarquia de fontes; l02-a2 é a decisão de uso. **+a3 `missing_context`** — colega quer pedir "à IA" para confirmar se o estudo existe; o pedido de verificação está incompleto: faltam **a-citação-exata ✓, a-fonte-onde-conferir ✓** (distratores: "perguntar se a IA tem certeza" ✗; "pedir outra resposta" ✗). Myth-busting: verificar é atividade **externa** à IA. Skill: `avaliar`. **Rubrica: MANTER as 3 existentes verbatim (proposta Q2)** — `r-fontes-verificaveis`/`r-numeros-sem-origem`/`r-confianca-excessiva` cobrem a2 (sinais) e a3 (verificação externa) no nível de constructo.

### 2.3 `l10` "Quando procurar fontes externas" (mod-03, [avaliar], v1→v2, 3→4 min ✔proposta Q3) — +a2, +a3

a1 (choice multiSelect, existe): quais frases conferir em fonte externa (fato checável vs conselho de escrita). **+a2 `choice`** — você conferiu a lei na fonte oficial e lá o prazo é 15 dias, não 30: o que fazer no relatório: corrigir o número e citar a fonte oficial ✓ vs manter porque a IA leu a lei ✗ vs remover a frase sem explicação ✗. Skill: `avaliar`. **Fronteira:** a1 decide **quando** conferir; a2 decide **o que fazer com o resultado**; l26 confere extração contra documento **anexado** (props distintos); l20 é dona da hierarquia de fontes. **+a3 `missing_context`** — pedido do colega "confere se isso tá certo" sem dizer o quê: faltam **qual-afirmação ✓, onde-conferir (fonte oficial) ✓** (distratores: "pedir para a IA revisar o relatório inteiro" ✗; "formato do relatório" ✗). Skill: `avaliar`. **Rubrica 2→3 (proposta Q2):** + **`r-corrigi-com-fonte`: "Corrige a afirmação divergente com a fonte oficial consultada, em vez de manter a versão da IA."**

### 2.4 `l11` "Como comparar alternativas e explicitar critérios" (mod-03, [avaliar], v1→v2, 4 min) — +a2, +a3

a1 (sort, existe): critérios → pedir → comparar → decidir (processo). **+a2 `prompt_builder`** — montar o pedido de comparação à IA com campos **critérios / alternativas-a-avaliar / formato-da-comparação (tabela lado a lado)**. Skill: `avaliar`. **Fronteira:** campos distintos de l04-a2 (tarefa/material/resultado), l06-a2 (público/tom/formato), l13-a1 (objetivo/contexto/formato). **+a3 `output_comparison`** — duas comparações da IA nas mesmas alternativas: A por impressão/vaguidade ("ambas boas, a B parece mais moderna") vs B critério a critério, tabela, devolvendo a decisão; escolher + marcar por quê (critérios `c-compara-criterio-a-criterio`, `c-devolve-decisao`). Skill: `avaliar`. **Rubrica 2→3 (proposta Q2):** + **`r-monta-pedido-de-comparacao`: "Monta o pedido de comparação com critérios explícitos e resultado lado a lado."**

### 2.5 `l12` "Proteja suas informações" (mod-04, [proteger], v2→v3, 4 min) — +a2, +a3

a1 (safety_classification, existe): 7 itens safe/sensitive (senha, site público, planilha CPF/salário, vaga, cartão, ata interna, legenda). **+a2 `choice`** — colega quer resumir a ata com valores de contrato e nomes de clientes: preparação certa antes de enviar à IA: substituir nomes/valores por genéricos mantendo a estrutura ✓ vs colar tudo e pedir confidencialidade à IA ✗ vs desistir de usar IA para qualquer documento interno ✗. Skill: `proteger`. **Fronteira:** l25 é dona de **anexos** (fotos/scans/PDF e metadados); l12 fica no **texto colado**. **+a3 `choice` multiSelect** — depois de tirar os nomes, o que AINDA identifica pessoas naquele texto: CPF ✓, salário exato ✓, nº de matrícula ✓, telefone ✓ vs cargo genérico sem empresa ✗, tarefa sem pessoas ✗. Diagnóstico de anonimização mal feita. Skill: `proteger`. **Rubrica: MANTER as 3 existentes verbatim (proposta Q2)** — `r-dados-pessoais`/`r-credenciais-financeiro`/`r-conteudo-publico` cobrem a2 (aplicar a classificação) e a3 (identificação indireta = ainda `r-dados-pessoais`); **nota ao advisory:** se a3 ficar sub-coberta, avaliar realinhamento leve — decisão do advisory, não deste draft.

### 2.6 `l13` "Use IA para uma tarefa real de trabalho" (mod-04, [aplicar], v1→v2, 5 min) — +a2, +a3

a1 (prompt_builder, existe, `digest_only` intocável): montar pedido com objetivo/contexto/formato para tarefa real. **+a2 `output_comparison`** — mesma resposta da IA para a tarefa real, **dois usos finais**: A copia-e-cola no entregável; B usa como rascunho, confere os fatos, adapta ao contexto próprio e decide; escolher + marcar por quê (critérios `c-confere-antes-de-usar`, `c-adapta-a-tarefa-real`). Skill: `aplicar`. **Fronteira:** l08-a1 compara duas **respostas**; l13-a2 compara dois **usos da mesma resposta**; l02-a2 é decisão genérica (número sem fonte) — l13-a2 é o uso na tarefa real; eco do "sem terceirizar o julgamento" (promessa da lição). **+a3 `sort` (5 itens)** — o ciclo completo da tarefa real: montar o pedido completo (sem dados sensíveis) → receber o rascunho → conferir fatos e comparar com o critério → pedir ajustes específicos → usar com julgamento final próprio. Skill: `aplicar`. **Nota de autoria:** objeto distinto de l07-a1 (iteração-para-eficiência), l01-a2 (primeira conversa) e l11-a1 (comparar alternativas) — aqui o ciclo **embute proteger + verificar + decisão humana**, com bookends "tarefa real" e "julgamento final"; proibido reutilizar o léxico daqueles itens. **Rubrica: MANTER as 3 existentes verbatim (proposta Q2)** — `r-tarefa-real`/`r-campos-completos`/`r-sem-dados-sensiveis`; **nota ao advisory:** o juízo de a2 (uso final) pode merecer 4º critério `r-julgamento-final` ou realinhamento — avaliar granularidade diagnóstica vs custo de score; decisão do advisory.

### 2.7 Totais e distribuição de tipos — TABELA PROPOSTA (confirmação é do advisory Q5)

| Tipo | Novas | Onde |
| --- | --- | --- |
| `choice` | **5** | l08-a2; l09-a2 (multi); l10-a2; l12-a2; l12-a3 (multi) |
| `missing_context` | **3** | l08-a3; l09-a3; l10-a3 |
| `output_comparison` | **2** | l11-a3; l13-a2 |
| `prompt_builder` | **1** | l11-a2 |
| `sort` | **1** | l13-a3 |
| `safety_classification` / `rubric_review` | **0** | omissão precedada (l18–l20 omitiu 2 tipos; l24–l26 e C1 omitiram rubric_review) |

**Total = 12 ✓ (5+3+2+1+1).** Skills das novas: l08–l11 `avaliar`; l12 `proteger`; l13 `aplicar` — zero mudança de `skillIds` de lição.

## 3. R2 — Comunicação ao learner: S1/S2 JÁ EXISTEM e são genéricos; superfície C2 = registro de onda (proposta)

**Estado verificado no main (`a10158d`):** o aviso de retrofit da C1 está implementado como mecanismo genérico — copy S1/S2 verbatim em constantes (`retrofitNotice.ts:21–26`), gatilho derivado em runtime (lição da onda + status persistido `completed`), idempotência 1×/learner/lição/bump via ack estruturado (`retrofitNotice.ts:35–46`); pluralização item D no ar (`LessonScreen.tsx:228` "refaça as atividades"). **A adesão da onda é um registro explícito:** `RETROFITTED_LESSONS_BY_CONTENT_VERSION` (`retrofitNotice.ts:16–18`) hoje mapeia `"2026-09-02.3" → [l01..l07]`.

**Superfície C2 (proposta, dono FPE):** adicionar **1 entrada** ao registro — novo `contentVersion` do landing → `["l08".."l13"]` — + testes de idempotência/gatilho para a onda C2 (estender `retrofitNotice.test.*`). **Zero copy nova** (S1/S2 aplicam-se verbatim à C2). **Ordem de pouso:** a entrada do registro entra no MESMO PR da onda ou ANTES dele — nunca depois (senão E1 fica sem explicação na primeira revisão force-devida das 6 lições). Trade-off UX da C1 (quem abandona e reabre não revê S2) permanece aceito; reavaliar com funil pós-OP-B.

## 4. Produção mecânica (o que exatamente mudaria — PROPOSTA; zero execução por este draft)

### 4.1 Conteúdo (CD → drafts; FPE → landing)
- 6 YAMLs em `curriculum/ai-literacy/modules/{03-avaliar-e-verificar,04-seguranca-e-aplicacao}/lNN-*.yaml`: append a2/a3 (R1.1); `version` bump por lição (§1.1); rubrica 3×weight-1 (l08/l10/l11 +critério proposto verbatim §2; l09/l12/l13 mantêm as 3 existentes); `requiredActivityIds` = conjunto completo; `estimatedMinutes` ∈ enum (**bumps: l08 3→4, l10 3→4**); skills por atividade conforme §1.1.
- `validate.py` verde + `gen:content` regenera o read model + fixtures de conteúdo regenerados (padrão pretest/prebuild).

### 4.2 Versionamento e bindings (bump ÚNICO no primeiro landing)
- `catalog.yaml`: `contentVersion` sobe 1× (de `"2026-09-02.3"`; número exato é do FPE no momento do landing).
- `engines/codexdojo-os-prototype/config/mission-bindings.yaml`: `tracks[ai-pratica].contentVersion` + os 6 `runtime.contentVersion` de l08–l13 (E4). Nada mais em bindings: `chapterOrder`, prereqs, `recommendedEntryMissionId: l02`, fallbacks DOM e entradas de missão intactos.
- Nenhum arquivo de contrato/schema tocado (sem T0): regra 7 não dispara; `l30` segue o próximo livre.

### 4.3 App/tests (FPE)
- **Registro de onda C2 + testes** (§3) em `engines/literacyDojo`.
- **Pinagem de comportamento (extensão dos pinos C1):** estender `migration.test.ts` com caso retrofit C2 (ex.: l12 concluída só com a1 permanece `completed`; revisão devida no bump); `progress.test.ts` — predicado version-blind já genérico, re-pin com fixture de mod-03/04 (só-a1 ⇒ `completed:false`+`missingActivityIds=[a2,a3]`; 3× ≥0,75 ⇒ `completed:true`).
- **A6-C2:** escopo não toca l01/l02 — regressões de onboarding/`migrateV2toV3` da C1 seguem como guard intocado.

## 5. Pipeline de produção, portas e esforço — **TODAS GATED; nenhuma aberta por este draft**

**Pré-condição de tudo (gate §8.7):** (a) veredito de saída d+21 da janela AID-670 com A1–A8 verdes + zero P1/P2; (b) evidência OP-B (transporte ativado pelo board — ADR-0010 §4; QA GO wave-level AID-677 já publicado). **Sem (a)+(b), nenhuma porta abaixo abre.**

**Sequência (padrão AID-644 §5, adaptado):**
1. **GO board** (§8.7) — decisão CEO/board registrada.
2. **Advisory CD — granularidade** (porta própria, padrão AID-645): valida 12/12 briefs (Q1), rubricas (Q2: confirmar manter-3 em l09/l12/l13 e os 3 critérios novos; decidir as 2 notas ao advisory §2.5/§2.6), minutos (Q3), exceções de ordem (Q4 — proposta: nenhuma), tabela final (Q5).
3. **Sign-off UX** (porta própria, padrão AID-646): confirmar que S1/S2 genéricos cobrem a C2 sem copy nova (proposta deste draft) + incorporar síntese AID-641 se publicada.
4. **Spec rev 2 FECHADA (SD)** — consolida advisory + sign-off + inputs pendentes (§8) + baseline re-verificado no main vigente à época.
5. **Autoria CD** — **T1 (mod-03: l08–l11, +8)** / **T2 (mod-04: l12–l13, +4)** como filhas da spec rev 2, dispatch via relay (padrão AID-614).
6. **Landing FPE** — **PR único da onda** (6 lições + registro §3 + testes + bump único §4.2), mesmo racional da C1 (dif puramente aditivo revisável por lição; evita rebases de `contentVersion`).
7. **Promoção única** (padrão AID-630): pin/alias/permalink + precheck estendido (hosted das 6 lições com 3 atividades, aviso renderizando, cv novo, mapa intacto, horário de baixo tráfego — E3).
8. **QA wave-level independente** (produtor ≠ verificador): GO/NO-GO + re-grant de readiness sobre a superfície de **6 lições** (entre a padrão de 3 e a C1 de 7) + a11y + grep vendor-neutral.
9. **Close-out (SD)**: receipt + reconciliação de gates + abertura da janela 21d C2 (checkpoints d+1/d+7/d+21).

**Esforço estimado (AID-559 + C1):** CD ≈**7–11h** (12 × 0,5–0,75h + 6 × 15–25 min; T1 ≈4,5–7h, T2 ≈2,5–4h); FPE ≈**1–1,5h** landing + **≈2–4h** registro/testes (menor que C1 — sem copy nova); QA 1 ciclo (6 lições).

## 6. Janela de consolidação C2 (se a onda rodar) — critérios propostos

Mesmo formato C1 (21 dias; checkpoints d+1/d+7/d+21; métricas só de superfícies existentes `literacy-evidence v1`; hipóteses, nunca claim sem gate evidence), com superfície = **6 lições**: A1–A3 (migração/predicado/aviso — testes genéricos re-pinados à C2), A4 conteúdo (6×3 atividades, rubricas, versions, minutos ∈ enum), A5 aviso (registro C2 + idempotência), A6 jornada (regressões C1 intactas; escopo não toca onboarding), E3 documentado, A8 QA wave-level (6 lições: `gen:content`, lint, test, build, e2e + checklist de leitura + dif aditivo).

## 7. Método de verificação DESTE DRAFT (executado, SD)

- Leitura first-hand em worktree limpa @ **main `a10158d`** (2026-09-02): parse scriptado dos **6 YAMLs de l08–l13** (atividades/tipos/skills/rubricas com ids e textos/minutos/versões/`requiredActivityIds`/storage policies — fonte da tabela do cabeçalho e dos §2); `catalog.yaml` (bloco l08–l13, `contentVersion`, enum `[3,4,5]` no schema); `mission-bindings.yaml` (6 bindings l08–l13, cv uniforme, entrada l02, contagem ai-pratica 20); histórico git dos arquivos (últimos touches pré-C1; PRs #249–#253 não tocam l08–l13).
- Mecânica de onda conferida no código: `retrofitNotice.ts:16–46` (registro + gatilho + idempotência), `LessonScreen.tsx:228` (item D), `migration.test.ts:21/34` (pinos A1/A2 C1), `tests/*/retrofitNotice.test.*` (superfície de teste a estender); `content-contract.md` §Regras (2/3/4/7) e tabela dos 7 tipos.
- Documentos de governança: spec AID-644 rev 2 integral, advisory AID-645 (método Q1–Q5), AID-610 §8 (decisões reservadas), estado da janela AID-670 (watchdog `255989ed`, d+0/datas), AID-641 `in_progress`, QA GO AID-677 + ativação OP-B pendente no board.
- **Nada foi escrito no repo:** worktree scratch read-only, zero commits/pushes, zero dispatch, zero escrita canônica. Limitações: `estimatedMinutes` de l13 no catálogo (5) confere com o YAML; nenhuma divergência encontrada entre catálogo, YAMLs e bindings no subescopo.

## 8. Anti-escopo e portas pendentes de fechamento

**Anti-escopo (o que esta onda NÃO faria — espelho C1):**
1. Nenhum id/módulo/skill novo (próximo livre `l30`); nenhum T0; nenhum arquivo de contrato/schema tocado.
2. Nenhum binding além dos `contentVersion` (E4): `chapterOrder`, prereqs, missões, fallbacks e entradas intactos.
3. Nada toca gates, verifier policy, mastery, learner state canônico; `mastered` permanece do verificador independente (produtor ≠ verificador).
4. Nenhum tipo novo; nenhum render de imagem/upload; sem free-text persistido nas novas (`l13-a1 digest_only` é exceção pré-existente intocável).
5. Zero menção a vendor/produto de IA no conteúdo (grep RD4 na QA).
6. Renome de títulos/objetivos das lições NÃO acontece (ruling AID-640 §7; permitido pela regra 2, não usado).
7. **GATE (verbatim, AID-644 rev 2 §8 item 7): "O3-C2 (l08–l13, +12) não é liberado — somente após C1 sustentar (janela §6) + evidência OP-B."** Este draft não libera nada.

**Portas pendentes de fechamento do spec (antes de uma rev 2 CLOSED; nenhuma é fechável hoje):**
1. **Veredito de saída d+21 da janela AID-670** (A1–A8 verdes + zero P1/P2) — dono: SD/watchdog AID-670; data: **2026-09-23T17:16Z**.
2. **Evidência OP-B** — ativação do transporte permanece gate do board (ADR-0010 §4); QA GO wave-level AID-677 publicado; confirmação de ativação pendente.
3. **Síntese do teste moderado O1 (AID-641, UX)** — se publicada até o fechamento; hoje `in_progress`.
4. **Advisory CD de granularidade** (validação 12/12, Q1–Q5) — porta própria a abrir somente com a onda (§5.2).
5. **Sign-off UX** (cobertura S1/S2 + qualquer copy nova) — porta própria a abrir somente com a onda (§5.3).
6. **Decisões reservadas AID-610 §8** (renome de mod-05 §8.6; prioridade l30+ §8.4) — re-levantáveis no close-out da C1; este draft as mantém **reservadas**.

**Decisões reservadas deste draft (não-tomadas; donos nomeados):** número exato do `contentVersion` novo e formato do PR (FPE no landing); timing de promoção e GO de QA (gates de produção §5.7–5.8); confirmação de minutos l09 (4 vs 5) e rubricas l09/l12/l13 (manter-3 vs realinhar) — **advisory CD**; eficácia pedagógica e retenção — UX com evidência de coorte/funil (hipóteses até OP-B ligar).
