<!-- issue: AID-699 | key: pre-scopo | doc_id: ba2a459b-fd75-481d-a971-47b9094b1ff2 | updated: 2026-09-04 00:02:06.105+00 -->

# AID-699 — Pre-escopo pós-janela O3-C1: decisões reservadas re-levantadas (renome mod-05, prioridade l30+) + pré-escopo O3-C2 (l08–l13, +12) — SPEC-ONLY, gates §8.7 intactos

(AID-699)

# AID-699 — Pre-escopo pós-janela O3-C1 (ORDEM CEO AID-698)

**Estado:** documento de spec/recomendação — **NADA publica/landa/mergeia**. Os gates da spec AID-644 rev 2 **§8.7 permanecem intactos**: O3-C2 (l08–l13, +12) **NÃO é liberada** por este documento. Watchdog AID-670 intocado (apenas leitura).

**RESOLUÇÃO (2026-09-04T00:00:40Z):** founder respondeu o card `26d4fc07` (ask:aid699:pos-janela-o3c1:v1) marcando as 3 opções recomendadas — ver §6. Endorsement CEO registrado no meio tempo (comentário `456f9d9d`, review AID-703 via RELAY AID-705) — input de revisão, não decisão.

**Gatilho:** close-out da ORDEM AID-644 (receipt via AID-668, comentário `c8ee1c6c`) tornou as decisões reservadas da spec AID-610 §8 **re-levantáveis agora** (AID-644 rev 2 §8.5: "Renome de mod-05 e prioridade l30+ — decisões reservadas da spec AID-610 §8, re-levantáveis no close-out desta onda").

---

## 0. Sumário executivo

1. **(a) Renome de mod-05 — RECOMENDO NÃO renomear na janela de consolidação.** A superfície mecânica é pequena (título em `catalog.yaml:71` + fixture + 2 comentários stale + projeções regeneradas), mas qualquer land de catálogo carrega bump de `contentVersion` → revisão forçada catalog-wide (mecânica E1) **no meio da janela 21d que mede exatamente conclusão/abandono de revisão do bump C1** — confundiria a própria evidência que decide O3-C2. Se o renome for aprovado, **embarcar no land da próxima onda de conteúdo** (bump compartilhado), com nome fechado por advisory CD na spec daquela onda. RD6 (AID-610 §5) fica **fechado por decisão de timing**; o nome final permanece questão de autoria (CD), não de agora.
2. **(b) Prioridade l30+ — RECOMENDO O3-C2 como única candidata da próxima janela de conteúdo**, condicionada ao gate §8.7 já registrado (C1 sustentar d+21 + evidência OP-B); **l30+ (lição nova, qualquer trilha) fica adiada** até (i) funil OP-B ativo e (ii) primeira leitura utilizável. Fundamento: sem funil não há sinal de demanda por conteúdo novo (racional AID-642/§0 da AID-644 ainda vigente); O3-C2 é **retrofit de lições existentes** (consistência da jornada core), não superfície nova. Teste moderado O1 (AID-641, recrutamento pendente) informa l30+ dev, **não gateia C2**.
3. **Pré-escopo O3-C2 (l08–l13, +12 atividades):** baseline verificado first-hand @ main `a10158d4` (mesmo método da rev 2 §7): 6 lições, **1 atividade cada** (6→18 no subescopo), rubricas **2/3/2/2/3/3** critérios, minutos **3/4/3/4/4/5** ∈ enum `[3,4,5]`, versões **v1/v1/v1/v1/v2/v1**, bindings contíguos chapterOrder 8–13 com `contentVersion "2026-09-02.3"` uniforme. Aplicação das decisões Q1–Q5 do C1: direta, com 3 notas próprias (skill única `avaliar` em 4 lições seguidas; tipos pesados já no slot 1 de l09/l12; l13 como lição aplicada pré-capítulo final). Esforço ≈ **8–12h** (mesmo perfil C1). Riscos específicos mapeados (§2.3), incluindo arestas de prereq **para fora** do intervalo (l20←l10, l25←l12, l14←l13).
4. **Card founder ÚNICO** criado nesta issue (ask_user_questions): confirmação das 2 recomendações + 1 steer condicional (d+21 verde com OP-B inativo: manter gate vs abrir C2). O card de ativação OP-B **já existe** (`39741f6a`, AID-669, pending) e **não é duplicado** aqui.

---

## 1. Re-levantamento das decisões reservadas (AID-610 §8, itens 4 e 6)

### 1.1 (a) Renome de mod-05 — AID-610 §8.6 / RD6

**A decisão reservada (verbatim, AID-610 §8.6):** "Renome de mod-05 ('Dev: contexto e decisão' vs 9 lições acumuladas) — flag para janela de consolidação; zero mudança nesta onda (RD6)". RD6: "Título de mod-05 ('contexto e decisão') acumulando conteúdo — Registro no close-out; decisão de renome pertence a janela de consolidação".

**Fatos verificados first-hand @ `a10158d4`:**

- mod-05 = `05-dev-contexto-e-escolha`, title `"Dev: contexto e decisão"`, journey `dev`, skillIds `[decidir, integrar, codificar]` (`catalog.yaml:67–72`). **9 lições acumuladas**: l15 (decidir), l16/l17 (integrar/codificar — onda inicial), l21–l23 (codificar — onda AID-528), l27–l29 (codificar — onda O1/AID-610). O nome descreve bem o arco de entrada (l15–l17: contexto e decisão) e descreve **mal** o bloco de 6 lições de trabalho-com-assistente (testes, revisão, limites, debug, refatoração, dependências).
- **Superfície real do renome** (grep `"Dev:"`/`contexto e decis` @ `a10158d4`):
  1. `curriculum/ai-literacy/catalog.yaml:71` — o title (1 linha);
  2. `curriculum/ai-literacy/catalog.yaml:205,255,305` — **comentários** de seção por onda (`:205` já está stale: "piloto de 3 lições" — hoje são 9);
  3. `learner/substrate/tests/mission_catalog_fixture.py:21` — fixture com title hardcoded;
  4. `curriculum/ai-literacy/README.md:12` — "Prévia Dev: 3 lições" (stale, mesmo problema);
  5. Render dinâmico via `findModule` (`engines/literacyDojo/src/screens/LessonScreen.tsx:75`) — título do módulo no header das lições dev; projeções derivadas (`.mavis/`, dashboard, dojoToday) são **regeneradas** pelo substrate, sem edição manual.
- **Exposição ao público primário: zero.** O título de mod-05 só renderiza nas telas de lição da trilha dev; learners `ia_pratica` (foco da janela/funil) nunca o veem.

**Análise (estabilidade vs clareza vs custo de QA):**

| Fator | Peso | Leitura |
|---|---|---|
| Clareza para o learner dev | baixo-médio | Título descreve o arco de entrada, não o acumulado; mas a exposição é só no header da lição dev, com título da lição dominante na hierarquia |
| Estabilidade de títulos | alto | Precedente registrado (ruling AID-640 §7, adotado no anti-escopo §8.6 da AID-644): manter títulos estáveis reduz superfície de QA; título de módulo é âncora de navegação |
| Custo de QA mecânico | baixo | ~4 arquivos + regen de projeções + fixture — pequeno |
| **Custo sistêmico (o real)** | **alto** | Land de catálogo ⇒ bump de `contentVersion` ⇒ **revisão forçada catalog-wide (E1)** + regeneração do corpus do verificador/fixturos pós-bump (aprendizado do fix `ab12db28` na C1) — tudo isso **no meio da janela 21d**, cujas métricas (conclusão/abandono de revisão do bump C1, AID-670) seriam confundidas por um segundo force-due |

**Recomendação (a):** **NÃO renomear na janela de consolidação.** RD6 fecha com decisão de timing: (i) agora — nada muda; (ii) se o board julgar o renome válido, ele **embarca no land da próxima onda de conteúdo** (ex.: O3-C2), compartilhando o bump/QA que aquele land já paga; (iii) o nome final é decisão de **autoria (advisory CD na spec da onda)** — candidatos do tipo "Dev: contexto, código e decisão" / "Dev: trabalhar com assistente" são plausíveis, mas não são escolhidos aqui; (iv) os stale comments (`catalog.yaml:205`, `README.md:12` — "3 lições" vs 9 reais) são correção de documentação e **podem esperar o mesmo land** (cosmético, zero conteúdo renderizado).

**Trade-offs:** adiar o renome mantém por mais um ciclo um título parcialmente impreciso para o público dev (custo de clareza baixo: exposição limitada); renomear agora compraria clareza marginal ao preço de poluir a evidência da janela que decide a própria O3-C2. A assimetria favorece esperar.

### 1.2 (b) Prioridade de l30+ — AID-610 §8.4

**A decisão reservada (verbatim, AID-610 §8.4):** "Eficácia pedagógica e prioridade de l30+ — UX Designer de Aprendizagem com evidência de coorte/funil (analytics ≠ evidência)". Nota de propriedade: a **eficácia pedagógica** permanece do UX; este re-levantamento entrega a **recomendação executiva de prioridade de janela** que a ORDEM pede, amarrada aos gates de evidência existentes.

**Estado dos gates de evidência (verificado 2026-09-03):**

| Gate | Estado | Fonte |
|---|---|---|
| Janela 21d C1 (AID-670) | correndo — d+0 = 2026-09-02T17:16Z; próximo checkpoint **d+1 = 2026-09-03T17:16Z**; d+7 = 2026-09-09; **d+21 = 2026-09-23** (saída com veredito de próxima janela para o board) | AID-670 `todo`, protocolo idempotente, watchdog `255989ed` |
| Funil OP-B | **instrumentação landed** (OP-B-F23, PR #250 + fix AID-685), **transporte OFF em produção** — ativação gated no founder, card `39741f6a` (AID-669, pending) — **não duplicar** | AID-669 interação `39741f6a` |
| Teste moderado O1 (l27–l29) | **pendente de recrutamento** (n=5–8 devs; interação founder `cf8b749c`) — informa a trilha dev/l30+, não gateia C2 | AID-641 `in_progress` |

**Recomendação (b):**

1. **O3-C2 (l08–l13, +12) permanece a única candidata da próxima janela de conteúdo**, exatamente como registrado (§8.7): liberada só com (1) **C1 sustentando d+21** (A1–A8 verdes, zero P1/P2 nas lições C1 — critérios de saída da AID-670 §6) **e** (2) **evidência OP-B** (transporte ativo + primeira leitura utilizável nos checkpoints).
2. **l30+ fica explicitamente adiada** até (i) OP-B ativo **e** (ii) primeira leitura utilizável do funil. Repete o racional AID-642/§0 da spec AID-644 rev 2: funil desligado ⇒ nenhum sinal de demanda por conteúdo novo. O3-C2 não sofre dessa objeção porque **retrofita lições existentes** da jornada core (consistência + granularidade diagnóstica de score), não cria superfície nova.
3. **Trilha dev (l30+ dev):** adicionalmente informada pelo teste moderado O1 (AID-641) — quando a síntese por cotas existir, ela entra como insumo UX; hoje não existe.
4. **Branch condicional (steer antecipado pedido no card):** se d+21 chegar verde e OP-B **ainda** inativo, a recomendação SD é **manter o gate** (esperar a evidência; §8.7 existe para não otimizar às cegas). O argumento contrário legítimo — C2 completaria a jornada `ia_pratica` inteira no padrão-3 (l01–l13 + l14/l18–l20/l24–l26 já no padrão) com custo conhecido (≈8–12h) — é registrável, mas não muda a recomendação. A decisão final desse branch é do board (card único, §3).

**Trade-offs:** manter O3-C2-gated preserva a disciplina de evidência e o foco da janela, ao custo de a jornada core l08–l13 seguir em 1 atividade (score de lição inteiro numa única nota — o problema que motivou C1) por mais um ciclo. Antecipar l30+ sem funil repetiria o padrão "duas ondas de conteúdo novo consecutivas às cegas" que a decisão AID-642 reprovou.

---

## 2. Pré-escopo O3-C2 (l08–l13, +12 atividades)

### 2.1 Inventário verificado (leitura direta @ main `a10158d4`, mesmo método da spec rev 2 §7 — parse scriptado dos YAMLs)

Catálogo `contentVersion "2026-09-02.3"`; l08–l13 = **6 atividades** (1 por lição); +2 por lição (a2/a3) = **+12** (6→18 no subescopo). Zona: mod-03 "Avaliar e verificar" (l08–l11, `ia_pratica`) + mod-04 "Segurança e aplicação" (l12–l13, `ia_pratica`).

| Lição | Título | Versão | Min | skillIds | Atividades (tipo) | Rubrica (critérios, todos weight 1) |
|---|---|---|---|---|---|---|
| l08 | "A primeira resposta não é necessariamente a melhor" | v1 | 3 | avaliar | l08-a1 `output_comparison` | **2**: `r-criterio-explicito`, `r-primeira-nao-melhor` |
| l09 | "Como reconhecer uma resposta inventada" | v1 | 4 | avaliar | l09-a1 `rubric_review` | **3**: `r-fontes-verificaveis`, `r-numeros-sem-origem`, `r-confianca-excessiva` |
| l10 | "Quando procurar fontes externas" | v1 | 3 | avaliar | l10-a1 `choice` | **2**: `r-fato-checavel`, `r-conselho-geral` |
| l11 | "Como comparar alternativas e explicitar critérios" | v1 | 4 | avaliar | l11-a1 `sort` | **2**: `r-criterios-primeiro`, `r-decisao-humana` |
| l12 | "Proteja suas informações" | **v2** | 4 | proteger | l12-a1 `safety_classification` | **3**: `r-dados-pessoais`, `r-credenciais-financeiro`, `r-conteudo-publico` |
| l13 | "Use IA para uma tarefa real de trabalho" | v1 | 5 | aplicar | l13-a1 `prompt_builder` | **3**: `r-tarefa-real`, `r-campos-completos`, `r-sem-dados-sensiveis` |

Comuns verificados: `completion.requiredActivityIds = [lNN-a1]`; `minimumScore 0.75`; `review.intervalsDays [1,7,21]`; `evidence` literacy-evidence v1 / `verifierRequired: true` herdada por atividade; prereqs encadeados l07→l08→…→l13→l14; minutos ∈ enum `[3,4,5]`. **Bindings** (`engines/codexdojo-os-prototype/config/mission-bindings.yaml`): missões l08–l13 contíguas `chapterOrder 8–13`, trackId `ai-pratica`, hospedadas literacyDojo, `runtime.contentVersion "2026-09-02.3"` uniforme, fallback dom 1 linha/lição (permanece válido — padrão E4/C1).

### 2.2 Aplicação das decisões Q1–Q5 do C1 (advisory AID-645 `2ed06cf2`) ao conjunto

- **Q2 (rubrica 3 × weight 1):** já têm 3 — **l09, l12, l13** (mantidas verbatim); saem de 2 — **l08, l10, l11** (+1 critério novo cada, existentes verbatim; texto do novo critério = advisory CD na spec da onda).
- **Q3 (minutos, enum [3,4,5]):** candidatos a bump 3→4 pelos tipos resultantes: **l08** (a1 `output_comparison` já é o tipo mais pesado +2) e **l10** (`choice` leve +2) — mesmo precedente de l01/l04 na C1. Demais mantidos (4/4/4/5). Confirmação é do advisory.
- **Q4 (append-only, zero exceções R1.3):** a2/a3 no próximo slot livre; a1 intacta; proibido renumerar/reordenar. Assimetrias estruturais a registrar na spec (equivalentes ao caso l05 da C1): **l09** e **l12** têm tipos pesados no slot 1 (`rubric_review`, `safety_classification`); **l13** tem `prompt_builder` no slot 1 (mesma forma do precedente l05 — espiral válida).
- **Q5 (skillId):** novas atividades dentro dos `skillIds` existentes da lição (`avaliar`×4, `proteger`, `aplicar`) ⇒ **zero drift de catálogo** (diff limitado a version/minutos).
- **Q1 (tipos):** só os 7 tipos determinísticos provados. Nota própria: os a1 do intervalo já cobrem 6 dos 7 (`missing_context` ausente — candidata natural em slots a2/a3 diagnósticos); precedente de omissão: C1 adding zero `safety_classification`/`rubric_review` — C2 pode seguir o mesmo (os dois tipos já estão presentes no intervalo via a1).
- **Notas de autoria C2 (para a spec da onda):** (1) **mod-03 é mono-skill** — 4 lições seguidas de `avaliar` ⇒ 8 atividades novas na mesma skill: o advisory deve exigir **props distintos entre lições vizinhas** (precedente C1 nota 4: l05-a2 × l06-a3); (2) **l13 é a lição aplicada pré-capítulo** (a "tarefa real" que desagua no desafio final l14): orçamento de simplicidade + fidelidade ao "real da rotina" (a2/a3 não podem torná-la exercício genérico — critério `r-tarefa-real` é o guard); (3) l08–a1 e l03–a3 (C1) são ambos `output_comparison` com critérios `c-*` — manter ids `c-*` e props distintos.

### 2.3 Riscos específicos do intervalo l08–l13

1. **Arestas de prereq para FORA do intervalo (novo relativo à C1):** `l20 ← l10` (mod-06), `l25 ← l12` (mod-07), `l14 ← l13` (capítulo final). Learners em revisão de l10/l12/l13 vindos dessas lições têm a superfície de revisão triplicada (análogo E1). Mitigação igual à C1 (copy S1/S2 já plural-safe desde o item D), monitorar na janela da própria C2.
2. **Mecânicas E1–E4 idênticas à C1:** force-due catalog-wide no bump; replay exige conjunto completo (`canFinish`); sessões em voo na promoção (mitigação: promoção única em horário de baixo tráfego); `runtime.contentVersion` das missões literacy sobe no land — **uniformemente em TODAS as missões literacyDojo hospedadas** (validador do substrate exige versão canônica — aprendizado do fix `3985a800` na C1).
3. **Corpus do verificador + fixturos pós-bump:** regeneração obrigatória no land (foi fix mid-wave na C1, `ab12db28`) — entrar como passo explícito do plano de produção da C2.
4. **Mono-skill mod-03:** risco de repetição de props/copy nas 8 novas atividades `avaliar` (§2.2 nota 1).
5. **Tipos pesados no slot 1 (l09/l12):** a2/a3 devem preservar o ritmo 3–5 min; escolha de tipos leves nos slots novos.
6. **Sem entry-lesson no intervalo** (entrada continua l02): menor risco de primeiro-contato que a C1; QA padrão aplica.

### 2.4 Esforço e lotes (estimativa, mesmo perfil C1)

≈0,5–0,75h/atividade + 15–25 min/lição ⇒ 12 atividades + 6 lições ≈ **8–12h**, em 2 lotes naturais: **T1 mod-03 (+8: l08–l11)** e **T2 mod-04 (+4: l12–l13)** — sujeito a ajuste na spec da onda. Portas: spec (advisory CD + sign-off UX de copy nova) → T1/T2 → promoção única (FPE) → QA wave-level (produtor ≠ verificador) → close-out + abertura de janela própria.

### 2.5 GO/NO-GO de evidência que libera a onda (§8.7 — intocado) e o que pode variar

**GO exige AMBOS:**
1. **C1 sustenta d+21** — checkpoint **2026-09-23T17:16Z** com A1–A8 verdes e **zero P1/P2 abertos** nas lições C1 (critérios de saída AID-670 §6);
2. **Evidência OP-B** — transporte ativo (card founder `39741f6a`, AID-669) + primeira leitura utilizável do funil (direcional basta; hipóteses, nunca claim de eficácia).

**NO-GO/hold:** qualquer P1/P2 sem dono, abandono E1 acima do observado sem mitigação, ou OP-B sem perspectiva de ativação ⇒ janela segue consolidação; veredito formal na saída da AID-670 (path registrado).

**Pode variar até a abertura da onda:** (i) timing de ativação OP-B (founder); (ii) resultados d+7/d+21 da AID-670; (iii) síntese do teste moderado O1 (AID-641 — informa l30+/dev, não C2); (iv) granularidade final por atividade (advisory CD na spec: tipos/minutos/textos dos 3 critérios novos); (v) número do `contentVersion` e formato do PR (FPE no land — reservado como na C1 §8.3); (vi) calendário QA; (vii) steer do board no branch condicional (§1.2.4) — o único que este pre-escopo submete a card.

---

## 3. Card founder único

Criado **uma única interação** `ask_user_questions` nesta issue (idempotencyKey `ask:aid699:pos-janela-o3c1:v1`, continuationPolicy `wake_assignee`) com 3 perguntas: (1) confirmar recomendação (a) renome mod-05 [recomendado: não renomear na janela; revisitar bundling no próximo land]; (2) confirmar recomendação (b) próxima janela [recomendado: O3-C2 gated §8.7, l30+ adiada até funil]; (3) steer condicional d+21-sem-OP-B [recomendado: manter o gate]. O card de ativação OP-B `39741f6a` (AID-669) permanece o caminho para a ativação em si.

## 4. Método de verificação deste documento

Leitura first-hand (nada aqui é second-hand além do que cites explicitamente): YAMLs de l08–l13 e `catalog.yaml` por parse scriptado @ `a10158d4` (commit da promoção C1, ancestral do HEAD do workspace `644a2bcc` — árvore contém a onda); `mission-bindings.yaml` (chapterOrder/prereqs/contentVersion/fallbacks); greps de superfície do renome (`"Dev:"`, `contexto e decis`); spec AID-610 rev 2 (doc `spec`, issues API) §5/§8 verbatim; advisory AID-645 comentário `2ed06cf2` (Q1–Q5); estado ao vivo de AID-670/AID-669/AID-641/AID-668 e interação `39741f6a` via API. Baseline de 1 atividade/lição e rubricas 2/3/2/2/3/3 conferem com o método da rev 2 §7 aplicado ao novo intervalo.

## 5. Anti-escopo

1. Nenhum landing de conteúdo/código; nenhum merge; nenhum PR; nenhum bump de `contentVersion`.
2. Nenhum toque em gates, verifier policy, mastery, learner state canônico; §8.7 permanece O gate de O3-C2.
3. Watchdog/janela AID-670 intocados (somente leitura).
4. Nenhum renome executado; nenhum nome final escolhido (autoria: advisory CD, na spec da onda que o hospedar).
5. O3-C2 NÃO é liberada por este documento; este pre-escopo não antecipa spec, T0/T1/T2 ou QA da onda.
6. Card de ativação OP-B não duplicado (pertence a AID-669 `39741f6a`).

---

## 6. Resolução das decisões (2026-09-04T00:00:40Z — card founder `26d4fc07` answered)

O founder respondeu o card único desta issue com as **3 opções recomendadas** (resultado verbatim: `rename-mod05 → defer-to-next-land` · `next-content-window → o3c2-gated` · `c2-without-opb → hold-gate`). Endorsement CEO prévio registrado no comentário `456f9d9d` (review AID-703, RELAY AID-705) — input de revisão, sem sobrescrever as decisões reservadas.

**Fecho das decisões reservadas da spec AID-610 §8:**

| Decisão reservada | Resolução | Efeito |
|---|---|---|
| §8.6 / RD6 — renome de mod-05 | **defer-to-next-land** | **FECHADA por timing**: nada muda na janela 21d (zero-churn preservado); a questão do renome **emigra para a spec da próxima onda de conteúdo** — se lá for aprovado, embarca no bump daquela onda, com nome final de autoria do advisory CD; comentários stale (`catalog.yaml:205`, `README.md:12`) corrigidos no mesmo land |
| §8.4 — prioridade de l30+ | **o3c2-gated** | **FECHADA**: O3-C2 (l08–l13, +12) é a única candidata da próxima janela de conteúdo, **gated §8.7** (C1 sustentar d+21 = 2026-09-23 com A1–A8 verdes + zero P1/P2 **e** evidência OP-B pós-ativação); l30+ (nova lição, qualquer trilha) fica adiada até (i) funil OP-B ativo + (ii) primeira leitura utilizável; teste moderado O1 (AID-641) segue como insumo UX para l30+/dev |
| Steer condicional (este pre-escopo §1.2.4) | **hold-gate** | **REGISTRADO para o veredito de saída da AID-670**: se d+21 chegar verde e o transporte OP-B seguir inativo, **o gate permanece** — O3-C2 não abre com sustentação C1 apenas; o veredito re-escala a ativação ao board (card `39741f6a`, AID-669, segue sendo o caminho da ativação) |

**Permanece intocado:** §8.7 como O gate de O3-C2; nenhum landing/merge/PR; nenhum gate/verifier/mastery/learner-state; watchdog/janela AID-670 no seu protocolo próprio (d+1 = 2026-09-03T17:16Z já coberto pelo watchdog; d+21 = 2026-09-23T17:16Z com veredito de próxima janela usando este steer).
