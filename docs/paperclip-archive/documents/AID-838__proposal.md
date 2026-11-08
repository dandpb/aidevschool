<!-- issue: AID-838 | key: proposal | doc_id: 05850be1-57c1-47a6-8fea-98d91fcded02 | updated: 2026-09-05 03:22:38.317+00 -->

# AID-838 — PRE-DRAFT spec O3-C2: retrofit l08–l13 (+12 atividades) — doc proposal rev 2 (consulta CD AID-839 incorporada; baseline 2026-09-04.1; gate d+7 09-09; pacote de dispatch pronto)

(AID-838)

# AID-838 — PRE-DRAFT spec O3-C2: retrofit l08–l13 (+12 atividades) — doc `proposal`

**Status:** PRE-DRAFT revisável (rev 2 — incorpora a resposta da consulta CD AID-839, comentário `a6e125dd`), pronto para acate do board **condicionado ao gate d+7**. **Owner:** System Designer (bb7b8143). **Ordem-fonte:** AID-835/C (esta issue). **Insumo principal:** doc `c1-content` (AID-807) **§2 — pré-spec O3-C2 do Content Designer** (granularidade por atividade, padrão AID-644 §2), re-verificada first-hand pelo SD contra a árvore pós-C1 e **re-confirmada pelo CD pós-pouso da C1** (AID-839: vigência ok, guardas mantêm, nenhum swap de tipo/cenário; ajustes vinculantes incorporados nesta rev). **Zero produção:** nenhum YAML/commit/branch/PR; nenhum issue de produção criado por este documento (dispatch é do CEO, pós-GO).

---

## 0. Sumário executivo e pacote de dispatch

### 0.1 O que isto é
Spec da **ONDA O3-C2** — segunda metade da consolidação aprovada no plano (AID-558 §O3): levar **l08–l13** (mod-03 "Avaliar e verificar" + mod-04 "Segurança e aplicação", jornada `ia_pratica`) ao padrão de **3 atividades/lição**, adicionando **12 atividades novas** (2/lição, slots a2/a3, append-only). Sem T0, sem ids novos, sem bindings estruturais — apenas `contentVersion` pins. Rege pela regra 3 do contrato: **toda alteração de conteúdo incrementa `version`**. Volume: o catálogo tem hoje **75 atividades** (23 lições ×3 + l08–l13 ×1 — conferido CD+SD); pós-C2 = **87**.

### 0.2 Pacote de dispatch (o que o CEO faz em 09-09 pós-GO — minutos, não horas)
1. Confirmar gate d+7 (2026-09-09T17:16:03Z): `CRITERIO_O3C2.md` G1–G5 **GO com veredito QA** (regra imóvel; sem veredito QA o gate não se aplica).
2. Despachar as 3 ordens filhas desta spec (esqueletos prontos — §9.2): **T1 CD autoria** (12 atividades, briefs §2.3 do `c1-content` + esta spec), **T2 FPE produção** (blocked-by T1), **T3 QA countersign** (blocked-by T2) → merge CEO com janela de deploy entre sessões O1 (regra C1).
3. Registrar no despacho: itens I1–I3 anotados, decisão G3 se 1/3, e este doc como base.

### 0.3 Por que agora (e por que esperamos)
C1 está promovido e em produção (`ef67fb06`, `contentVersion 2026-09-04.1`, readiness v29). O plano só libera C2 **se C1 sustentar** — a verificação é o checkpoint d+7. Este pre-draft existe para que o GO→dispatch seja ~instantâneo; **não antecipa nada**.

---

## 1. Baseline verificada first-hand (workspace compartilhado, árvore @ `2026-09-04.1`)

| Lição | título | versão | atividades hoje | tipo de a1 | rubrica | min | storage a1 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| l08 | A primeira resposta não é necessariamente a melhor | **v1** | [a1] | `output_comparison` | **2** crit. | 3 | structured_only |
| l09 | Como reconhecer uma resposta inventada | **v1** | [a1] | `rubric_review` | 3 | 4 | structured_only |
| l10 | Quando procurar fontes externas | **v1** | [a1] | `choice` (multi) | **2** | 3 | structured_only |
| l11 | Como comparar alternativas e explicitar critérios | **v1** | [a1] | `sort` | **2** | 4 | structured_only |
| l12 | Proteja suas informações | **v2** | [a1] | `safety_classification` | 3 | 4 | structured_only |
| l13 | Use IA para uma tarefa real de trabalho | **v1** | [a1] | `prompt_builder` | 3 | 5 | **digest_only** |

Contexto: `catalog.yaml` 29 ready (20 ia_pratica + 9 dev), 0 planned; contagens 29/0 **não mudam** com C2; total de atividades 75 → 87 (l08–l13 saem de 1 para 3 cada). OS bindings: l08–l13 = track `ai-pratica` **chapters 8–13**, prereq chain l07→l08→…→l13 intacta, `tracks[ai-pratica].contentVersion` + `runtime.contentVersion` pinados `2026-09-04.1`. Readiness: literacy standalone + OS `customer-ready` pass (09-04). Mecanismo de aviso retrofit **já pousado** (`retrofitNotice.ts`, S1/S2) — dispara pelo bump, zero trabalho novo.

---

## 2. Spec por lição (l08–l13)

Contrato comum por atividade nova (idêntico ao padrão C1, doc `c1-content` §2.2): id estável `lNN-a2`/`lNN-a3` **append-only** (proibido renumerar/reordenar a1 — âncora de evidência/analytics); tipo determinístico dos 7; `evaluation.strategy: deterministic` com checks só referenciando ids declarados; `onFailure`+`onSuccess`+`perCheck` completo; **hints 2–3** progressivas (padrão verificado do catálogo); `storage.policy: structured_only` nas novas; evidência `literacy-evidence v1 / verifierRequired: true` herdada; pt-BR; vendor-neutral; `contextOptions` kebab sem `ctx-`; critérios `c-*`; itens `sort` `passo-*` com precedência por par adjacente no `onFailure`; distratores significativos (mito que ensina); guardas de duplicação intra-onda e cross-catálogo vinculantes.

| Lição | version bump (regra 3) | novas | tipos propostos | `requiredActivityIds` pós | minutos | rubrica |
| --- | --- | --- | --- | --- | --- | --- |
| l08 | v1→**v2** | +a2, +a3 | a2 `choice` (single) · a3 `missing_context` | [a1,a2,a3] | **3→4** | 2→3 |
| l09 | v1→**v2** | +a2, +a3 | a2 `output_comparison` · a3 `missing_context` | [a1,a2,a3] | 4 | manter 3 |
| l10 | v1→**v2** | +a2, +a3 | a2 `missing_context` · a3 `output_comparison` | [a1,a2,a3] | **3→4** | 2→3 |
| l11 | v1→**v2** | +a2, +a3 | a2 `choice` (single) · a3 `prompt_builder` | [a1,a2,a3] | 4 | 2→3 |
| l12 | **v2→v3** | +a2, +a3 | a2 `choice` (single) · a3 `sort` (4 itens) | [a1,a2,a3] | 4 | manter 3 |
| l13 | v1→**v2** | +a2, +a3 | a2 `choice` (single) · a3 `rubric_review` | [a1,a2,a3] | 5 | manter 3 |

### 2.1 Ângulo pedagógico por atividade (resumo; brief completo = `c1-content` §2.3)

- **l08-a2 `choice`** — ao comparar duas respostas, escolher "comparar pelo que a tarefa pede, com motivo anotado" vs distratores de aparência (confiança/longitude/delegar o veredicto à IA). **l08-a3 `missing_context`** — "qual das duas respostas diferentes é a certa?": faltam finalidade-do-uso, contexto-da-tarefa, formato-da-entrega (optional: prazo); distratores ordem-de-chegada/tamanho. **Vinculante (AID-839):** o texto visível do item formato ancora na decisão de comparação ("para o uso pretendido, que formato a entrega final precisa ter") — eco deliberado em espiral mod-01→mod-03, não duplicação. *Rubrica nova:* `r-aparencia-nao-e-qualidade` — **"Não trata tom confiante, tamanho ou ordem de chegada como evidência de qualidade — o teste é o uso pretendido."** (redação AID-839, sem eco do `r-criterio-explicito` existente).
- **l09-a2 `output_comparison`** — número estatístico: melhor resposta é a que **declara incerteza e origem** (SEBRAE 20–30%, "conferir") vs precisão inventada (43,7%). Inverte o ângulo de a1. **Vinculante (AID-839):** o `out-a` **calibra com faixa + fonte nomeada** — não pode ser mera recusa, senão colapsa no l02-a1 pousado (cujo vencedor declara limites e recusa números); recusa-total é constructo de l02, calibração-com-fonte é o de l09. **l09-a3 `missing_context`** — "estudo de 2024: 87%" sem link indo para a diretoria: faltam título/autoria, origem do número, data; distratores velocidade/emojis.
- **l10-a2 `missing_context`** — o que dispara verificação externa: uso-da-afirmação, consequência-do-erro, tipo (fato checável vs opinião); distratores tom/tamanho. **l10-a3 `output_comparison`** — o MESMO número verificado usado em artefato: out-a anota origem+data inline e modula ("aproximadamente") vs out-b cola como fato redondo. *Rubrica nova:* `r-decide-quando-verificar`.
- **l11-a2 `choice`** — IA devolveu ranking pronto ("a B é a melhor"): conferir na própria lista de critérios e decidir você, com motivo (âncora `r-decisao-humana`). **l11-a3 `prompt_builder`** — montar pedido de comparação estruturada (3 ferramentas de agendamento): campos critérios, formato-da-comparação, regras-iguais. *Rubrica nova:* `r-pede-comparacao-estruturada`.
- **l12-a2 `choice`** — contrato sensível + pressa: sanitizar com marcadores genéricos vs colar-tudo / pedir-sigilo-à-IA (myth-buster) / desistir-da-IA (falso binômio). **l12-a3 `sort`** — fluxo de sanitização: marcar → substituir (CLIENTE A, VALOR X) → conferir → enviar, precedências por par adjacente. Mundo "texto colado" (anexos são l24–l26).
- **l13-a2 `choice`** — resposta veio com 2/3 critérios ok e formato errado: pedido de ajuste específico do que falhou vs recomeçar/aceitar/pedir-5-variações. **l13-a3 `rubric_review`** — avaliar execução alheia do ciclo (relato "pedi 'resume isso aí', colei nomes…") contra c-pedido-com-contexto / c-avaliou-antes-de-usar / c-protegeu-dados, verdicts mistos. a1 `digest_only` **conservado**. **Cobertura (AID-839):** `c-pedido-com-contexto`↔`r-campos-completos` e `c-protegeu-dados`↔`r-sem-dados-sensiveis` são espelho direto; `c-avaliou-antes-de-usar` tem cobertura em nível de lição (ciclo com julgamento próprio), parcial via `r-tarefa-real` — sem realinhamento de texto de rubrica.

### 2.2 Guardas de duplicação (vinculantes)
l08-a2 ≠ l11-a2 (texts de opção distintos, mecânica igual em lições vizinhas); l09-a2 ≠ l03-a3 (fidelidade ao material vs calibração sem material); l10-a2 ≠ l10-a1 (marcar frases vs diagnosticar gatilho); l09-a3 ≠ l20-a3 (sinal de invenção: procedência ausente do "estudo" vs verificação de número específico: fonte oficial + período exato — adjacência temática, constructos distintos, AID-839); l10-a3 ≠ l02-a3/l20 (artefato final vs fluxo/hierarquia de fontes); l13-a2 ≠ l07-a2 (própria avaliação vs feedback dado); l13-a3 ≠ l14 (avaliar execução alheia vs executar). Entre as 3 `missing_context`: conjuntos required distintos **como conjuntos** dos 8 `missing_context` existentes no catálogo (conferidos CD: l01-a3, l04-a3, l06-a1, l15-a3, l20-a3, l21-a2, l27-a3, l29-a3), distratores com no máx. 1 eco deliberado. Distrator "velocidade-da-resposta" (l09-a3) passa a existir 2× cross-track (l15-a3 dev) — journeys distintas, aceitável; **não adicionar mais ocorrências** (AID-839).

### 2.3 Distribuição de tipos (12)
`choice` 4 (l08-a2, l11-a2, l12-a2, l13-a2) · `missing_context` 3 (l08-a3, l09-a3, l10-a2) · `output_comparison` 2 (l09-a2, l10-a3) · `prompt_builder` 1 (l11-a3) · `sort` 1 (l12-a3) · `rubric_review` 1 (l13-a3) · `safety_classification` 0 (omissão precedada — l12-a1 já entrega o tipo). **Nenhum tipo novo.**

---

## 3. Ruling de migração AID-640 (E1–E4) — obrigatório nas seis

1. **E1 — Revisão devida mais longa:** o bump marca revisão devida; quem reabrir vê 3 atividades onde viu 1. Aviso S1/S2 **já pousado** em C1 (`retrofitNotice.ts`): "Esta lição ganhou atividades novas — sua conclusão continua valendo." Zero trabalho novo de aviso.
2. **E2 — Replay exige as novas:** re-conclusão exige [a1,a2,a3] (missingActivityIds version-blind, `progress.ts:364`); status persistido fica `completed` (grandfathering).
3. **E3 — Sessão em voo:** promoção única em horário de baixo tráfego, janela coordenada com o calendário O1 (dona = UX Designer) — igual C1.
4. **E4 — OS hospedado:** `tracks[ai-pratica].contentVersion` + os 6 `runtime.contentVersion` (l08–l13) sobem no landing; fallbacks DOM por lição permanecem válidos (uma linha por lição); nenhum chapterOrder/prereq muda.

---

## 4. Produção mecânica (cargo FPE; nada além disto)

1. **YAML:** append a2/a3 nos 6 arquivos de `modules/03-avaliar-e-verificar/` e `modules/04-seguranca-e-aplicacao/`; `version` conforme §2; `requiredActivityIds=[a1,a2,a3]`; minutos l08/l10→4; rubricas conforme §2; `validate.py` verde.
2. **Catálogo/bindings:** `catalog.yaml` `contentVersion` sobe **1×** (valor do dia do landing; contagens 29/0 não mudam); `mission-bindings.yaml` track `ai-pratica` + 6 missions runtime. **Nada mais em bindings.**
3. **App/tests:** `gen:content` regenera `lessons.ts` + fixtures; pinagem A1–A3 estendida com casos l08–l13 (retrofit mantém `completed` com só-a1 sob o contentVersion antigo; revisão devida no bump; predicado version-blind para novas conclusões); S1/S2 idempotência re-executada; regressão de onboarding (entrada l02) no checklist da onda — guarda barata, l02 fora do diff.

---

## 5. Estimativas (rubrica AID-558 rev 2; sujeitas à consulta CD AID-839)

| Papel | Estimativa | Base |
| --- | --- | --- |
| CD autoria | **≈8–10h** (afinado AID-839; envelope 7,5–11,5h da rubrica mantém) | mix C2: 7 atividades no piso (~0,5h: choice/missing_context) + 5 no teto (~0,75h: output_comparison/sort/rubric_review/prompt_builder) ≈ 8,75–9,75h + 1,5–2,5h overhead; verificação de guardas contra catálogo maior (75→87) +~15–20 min/lote, mitigado pela pinagem A1–A3 que agora estende testes C1 pousados |
| FPE produção | **≈1–1,5h** (+ pinagens/bindings leves, sem T0) | AID-558 §O3; precedente C1 |
| QA countersign | **≈2,5–4h** (superfície 6 lições + migração) | `c1-content` §2.5; porta A1–A8 adaptada |

---

## 6. Riscos

- **R1 Des-completar (estrutural):** retrofit rebaixa `completed:false` até o learner jogar a2/a3 — **mitigado por E1–E4 + mecanismo S1/S2 pousado + testes de pinagem** (ruling AID-640, provado em C1).
- **R2 Superfície de QA 2× onda padrão:** 6 lições vs 3 — mitigado por diff puramente aditivo (append + version + required + 3 rubricas + 2 minutos), checklist A1–A8 e suíte completa.
- **R3 Capacidade CD:** 12 atividades ≈ 1,5–2 ondas de esforço de autoria numa janela — estimativa §5 **calibrada pela AID-839 em ≈8–10h** (taxa efetiva observada na C1: T1 +5 e T2 +8 dentro da banda).
- **R4 Pipeline segue 0 planned:** consolidação não responde crescimento — trade-off aceito no plano (AID-558 §O3); próxima onda de conteúdo volta ao board após C2.
- **R5 NO-GO/INCONCLUSIVO no d+7:** este pre-draft **espera** (sem expirar); risco de drift de baseline — mitigado por re-verificação de baseline no dispatch (§9.3 passo 0) e pela consulta AID-839 re-confirmando vigência.
- **R6 l12 v2→v3 (bump duplo):** já bumpada no piloto; S1/S2 disparam 1×/learner/lição/**bump** — comportamento desejado e testado (idempotência por bump).

## 7. Anti-escopo (rígido)

Nenhum id l30+/T0/módulo/skill nova; nada em schema/contrato/gates/CRITÉRIOS/verifier/learner state; nenhum chapterOrder/prereq/mapa; nada além dos pins de `contentVersion`; nenhum realinhamento de rubrica além das 3 adições; minutos só l08/l10; **nenhuma produção antes do CEO despachar pós-GO**; este documento não cria issues de produção.

## 8. Consulta CD (AID-839, filha desta) — **RESPONDIDA e incorporada nesta rev 2**

Advisory de granularidade (padrão AID-559/AID-794), respondida no comentário `a6e125dd` com verificação first-hand do catálogo pós-C1. Resultado: vigência dos briefs **ok-com-ajustes** (nenhum swap de tipo/cenário; guardas mantêm); rubricas **ok-com-ajustes** (1 redação ajustada, 2 mantidas); version/minutos/armadilhas **ok**; custo **ok com banda afinada ≈8–10h**. Incorporação: checklist de 5 itens do CD aplicado integralmente nesta rev (contagem 75→87; vinculantes novos l09-a2/l09-a3/l08-a3; redação `r-aparencia-nao-e-qualidade`; claim de cobertura l13-a3; estimativa CD).

---

## 9. Gate de dispatch e esqueletos de ordem

### 9.1 Gate (imóvel)
Dispatch **somente** com `CRITERIO_O3C2.md` satisfeito no checkpoint **d+7 = 2026-09-09T17:16:03Z**: **G1–G5 GO com veredito QA** (≥3 iniciados; zero Critical/High no caminho central; ≥2/3 primeira lição H0 ≤20 min; ≥2/3 compreensão do resultado local; todo bloqueio com issue) — sweep CEO d+6 (AID-815) em 09-08 17:16Z prepara o terreno. CEO é o único autorizador; G3 1/3 exige decisão registrada. **GO autoriza somente o despacho ao board — não prova retenção nem domínio.**

### 9.2 Esqueletos de ordem (copiar no dispatch)
- **T1 — ORDEM AID-838/C2-A (CD, f2b1e95d):** autoria das 12 atividades conforme esta spec §2 + briefs `c1-content` §2.3 (re-confirmados pela AID-839); entrega = 6 YAML v-final anexados na issue (padrão C1: validate.py + compile first-hand em árvore descartável); anti-escopo idêntico.
- **T2 — ORDEM AID-838/C2-B (FPE, fa8130d5), blocked-by T1:** produção mecânica §4; PR único puramente aditivo; porta QA obrigatória antes do merge; **janela de deploy entre sessões O1** (dona do calendário = UX Designer); regras §0 pós-deploy (diff 0 em lições fora de escopo + sanity moderador + re-registro de `deploy_id`).
- **T3 — ORDEM AID-838/C2-C (QA, ca6a3f95), blocked-by T2:** countersign no PR — A4 conteúdo (validate, 3 atividades, required completo, rubricas verbatim, versions, minutos, hints 2–3); A1–A3 migração E1–E4 (pinagens l08–l13; nenhum rebaixamento); A5 aviso S1/S2 1×/learner/lição/bump; A6 jornada OS (6 missões hospedadas com 3 atividades; mapa intacto; contagens 20/9); A8 wave-level (diff aditivo; suíte completa; grep vendor-neutral nas 6).

### 9.3 Passo 0 do dispatch (higiene)
Re-verificar baseline: `contentVersion` atual, l08–l13 ainda v1/v2 conforme §1, nenhum diff aberto nas 6 lições, AID-839 incorporada ou dispensada com registro.

---

## 10. Verificação first-hand desta spec (método)

Leitura direta no workspace compartilhado nesta run: `catalog.yaml` (contagens/jornada/contentVersion); os 6 YAML de lição íntegros (versões, atividades, tipos, rubricas por id, minutos, storage, required); `mission-bindings.yaml` (track/chapterOrder 8–13/prereqs/pins); `docs/product-readiness/README.md` (tiers literacy/OS); `CRITERIO_O3C2.md` (G1–G5/I1–I3/assinaturas); doc `c1-content` rev 1 da AID-807 (§1.2, §2.1–2.6) como insumo; AID-558 doc `proposal` rev 2 (rubrica de esforço); AID-815 (sweep d+6). Nenhuma escrita no repo.
