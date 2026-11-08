<!-- issue: AID-640 | key: ruling | doc_id: 2b3c5a66-0287-4fdc-ad35-1953e3691fad | updated: 2026-09-02 13:21:50.684+00 -->

# AID-640 — RULING de migração O3-C1: retrofit l01–l07 × lições concluídas (progress.ts:364) — enabler da janela de consolidação

(AID-640)

# AID-640 — RULING de migração O3-C1: retrofit l01–l07 × lições concluídas (`progress.ts:364`)

**Status:** RULING spec-grade **FECHADO** nesta issue (doc apenas; zero escrita canônica — nenhum commit/branch/PR; catálogo, contrato, bindings e produção intocados; single-writer `main` preservado). Cobre os 4 itens exigidos pela porta O3 (proposta AID-558 rev 2 `21c56622` §2.O3: "ruling explícito de migração/comunicação antes de qualquer T1"): **R1** posicionamento/ordem das atividades novas; **R2** comunicação ao learner afetado; **R3** janela de revisão e critérios de aceitação; **R4** opções técnicas com trade-offs e **recomendação**. Não abre spec de onda, não produz conteúdo, não cria ids. A escolha da janela de consolidação permanece com CEO/board (proposta §3.6: pré-condições = funil OP-B existir **+** ruling resolvido — este doc resolve a segunda pré-condição; a primeira segue com o UX via AID-635).

**Owner:** Content Designer (f2b1e95d). Emitida da AID-635 (desbloqueio). Origem do problema: flag (i) do achado CD AID-559 (comentário `338809a4`), incorporada na proposta AID-558 rev 2 §2.O3 e na AID-640.

**Baseline verificada first-hand (workspace compartido @ `44b45d45`, árvore limpa; leitura por arquivo:linha, sem checkout):** `curriculum/ai-literacy/catalog.yaml` (`contentVersion "2026-09-02.2"`; onda O1 em pouso, 9 lições dev no header); lições C1 = **8 atividades** (l01=1, l02=1, l03=2, l04=1, l05=1, l06=1, l07=1 — tabela §6); rubrica de l01 com **2 critérios** vs. padrão 3; `estimatedMinutes` 3/4/4/3/5/4/4 ∈ enum `[3,4,5]`; mecânica de progresso/revisão/migração citada por arquivo:linha ao longo do §1.

---

## 0. Sumário executivo

- **Correção material de precisão à flag original (muda a recomendação):** o status persistido `completed` **não é rebaixado** pelo retrofit. A regra 4 do contrato é implementada como grandfathering de status: `migrateProgress` mantém `completed` em divergência de `contentVersion` e marca revisão devida (`engines/literacyDojo/src/domain/migration.ts:87–98`; pinado por `tests/domain/migration.test.ts:12–18`); `startLesson` nunca rebaixa "completed" (`progress.ts:177–187`); nada recalcula status no boot. O que "des-completa" é o **predicado de conclusão de novas avaliações** — `evaluateLessonCompletion` contra as `requiredActivityIds` correntes (`progress.ts:360–375`, o filtro da linha 365) com `bestScores` de escopo de sessão (`lessonSession.ts:189–218`) — e a **superfície da revisão espaçada**, que passa a apresentar 3 atividades onde antes havia 1–2, sem aviso. Ou seja: o problema é de **UX/comunicação + pinagem de comportamento**, não de perda de estado. Não é preciso mecanismo novo de migração de estado.
- **Recomendação (R4): Opção A** — codificar a semântica vigente como ruling (conclusão é grandfathered; o contato com conteúdo novo acontece pela revisão espaçada, não por re-conclusão), somada ao aviso de learner do R2 e aos critérios de aceitação A1–A8 do R3. Snapshots/versionamento de `required` (B/C) ficam registrados como fallback condicionado a evidência de funil pós-OP-B; re-onboarding dirigido (D) é rejeitado.
- **Como consumir:** a spec da onda O3 (quando o board abrir a janela) incorpora R1–R4 por referência; R2 traz copy de serviço (SL) que precisa de sign-off do UX Designer na abertura da spec; FPE recebe a nota de superfície mínima (S1/S2); QA recebe a superfície ampliada (7 lições modificadas — flag (ii) do AID-559).

## 1. Mecânica verificada (evidência first-hand, arquivo:linha)

1. **Predicado de conclusão:** `evaluateLessonCompletion(lesson, bestScores)` declara a lição completa quando TODAS as `requiredActivityIds` correntes têm nota em `bestScores` e a média ≥ `completion.minimumScore` (0.75) — `missingActivityIds = required.filter(id => bestScores[id] === undefined)` (`progress.ts:364–371`). O predicado é **cego a versão**: avalia contra a definição vigente no read model.
2. **bestScores são de sessão:** `finishLesson` deriva `bestScores` de `session.best` (`lessonSession.ts:199–201`); `canFinish` exige toda atividade required passada **na própria sessão** (`lessonSession.ts:100–105, 197`). Não existe bestScore por atividade persistido em `LearnerProgress`.
3. **Status persistido é sticky:** `completeLesson` só **escreve** `"completed"` (`progress.ts:559–573`); `startLesson` preserva "completed" em replay (`progress.ts:177–187`); nenhum caminho de boot recalcula `lessonStatus`. Respostas são transitórias por privacidade (`useCases.ts:230–234`).
4. **Migração (regra 4 implementada):** em divergência de `contentVersion`, `completed` é mantido e toda skill com `passes > 0` fica com `nextReviewAt = now` ("versão nova de conteúdo pede revisão, não reconclusão" — `migration.ts:10–13, 87–98`; teste `migration.test.ts:12–18`). Forward-only, `schemaVersion` 3 (`progress.ts:4`).
5. **Revisão espaçada:** `startReview` exige status persistido "completed" (`useCases.ts:270–285`); o modo review **re-executa as atividades da lição** (a definição corrente — `LessonScreen.tsx:46`, rota `App.tsx:143`); `completeReview` avalia o outcome, **não** concede XP e não escreve status (`useCases.ts:287–299`); se `outcome.completed === false`, o fluxo retorna em silêncio (`LessonScreen.tsx:169–172`).
6. **XP:** conclusão em modo inicial concede +25 incondicionalmente (`progress.ts:127, 581`) — replays inclusos. Economia pré-existente, fora do escopo deste ruling (nota de observação, não de ação).
7. **Evidência:** cada tentativa avaliada emite `LiteracyEvidenceRecord` (`schemaVersion: 1`, `verifierRequired: true` — AGENTS.md regra 3); atividades novas ampliam a superfície evidenciável sem mudança de schema.

### 1.1 Consequências concretas do retrofit C1 sem nenhuma mudança de código (E1–E4)

- **E1 — Revisão devida imediata e mais longa:** o bump de `contentVersion` (inerente ao land) marca revisão devida para toda skill praticada (§1.4). No card "Revisão pendente" (`HomeScreen.tsx:138–152`), a lição retrofitada abre com **3** atividades onde o learner viu 1–2 — sessão de ~1 min vira ~3–5 min, **sem explicação**; abandono no meio deixa a revisão pendente (pressão de streak/meta diária). O force-due catálogo-wide já ocorre a cada onda (todo land é bump); o que muda em O3-C1 é a **superfície** da revisão nas 7 lições do subescopo.
- **E2 — Replay/re-conclusão exige as novas atividades:** quem reabrir l01–l07 precisa jogar e passar a2/a3 para ver o resumo de conclusão (`canFinish`, §1.2); enquanto isso o outcome é `completed: false` com `missingActivityIds = [a2, a3]`. O status persistido permanece "completed" (§1.3) — não há rebaixamento, mas a experiência de "refazer" fica mais longa e o `completionClaim` novo só emite com o conjunto completo.
- **E3 — Sessão em voo na promoção (raro, transitório):** sessão iniciada sob `required` antigo e finalizada após o land não passa em `canFinish`; o finish não produz payload. Recarregar retoma do início (respostas transitórias) e a nova sessão já cobre as 3 atividades. Mitigação: disciplina de promoção única em horário de baixo tráfego (padrão já praticado nas ondas).
- **E4 — OS hospedado e evidência:** missões OS de l01–l07 mantêm estado próprio (não afetado pelo retrofit); fallback DOM por lição permanece válido (uma linha por lição); o comprimento da revisão hospedada cresce como em E1; `tracks[ai-pratica].contentVersion` e `contentVersion` dos bindings 7× sobem no land (cargo da tarefa de produção, padrão AID-610 §3.D).

### 1.2 Enquadramento preciso da flag original

AID-559 flag (i) e a descrição desta issue dizem "a lição volta a `completed: false` até o learner jogar as atividades novas". Verificação first-hand de hoje **corrige o enquadramento**: volta a `false` o `LessonOutcome` de **novas avaliações** (replay/revisão) — o `lessonStatus` persistido permanece `"completed"` (§1.3–1.4, teste pinado). A correção é material: o problema não exige mecanismo de migração de estado; exige **comunicação** (R2) + **pinagem de comportamento por testes de aceitação** (R3/A1–A3) + opcionalmente a superfície mínima de aviso (R2/S1–S2). Se algum caminho de rebaixamento existir além dos lidos, o critério A1 o detecta em QA.

## 2. R1 — Posicionamento e ordem das atividades novas

- **R1.1 (decisão): append-only no final do array `activities`.** As atividades existentes mantêm id e posição (l01-a1 … l07-a1; l03-a1/l03-a2); as novas recebem o próximo slot livre por lição: `lNN-a2`/`lNN-a3` (l03 recebe **apenas** `l03-a3`). **Proibido renumerar ou reordenar existentes.**
- **R1.2 (justificativa):** ids de atividade são âncora de evidência v1 e analytics por `activityId`; o returning learner reconhece a1 como "a lição"; o diff de produção/QA fica puramente aditivo (checklist A4/A8) — mesmo padrão de estabilidade que a regra 2 do contrato garante para ids de lição.
- **R1.3 (exceção por pedagogia):** mecanicamente qualquer posição é válida (`nextActivity` avança sequencialmente — `lessonSession.ts:176–187`). Se o design de alguma lição pedir ordem diferente (ex.: reconhecimento antes da aplicação), a spec da onda deve justificar caso a caso; o default permanece append.
- **R1.4 (minutos):** bump permitido dentro do enum `[3,4,5]` (prováveis: l01 3→4 e l04 3→4 ao ganharem 2 atividades); decisão de autoria na spec, checada pelo validador.
- **R1.5 (rubrica e required):** rubrica realinhada 1:1 ao novo conjunto (**l01 hoje tem 2 critérios → 3 × weight 1** — verificado); `requiredActivityIds` = conjunto completo das 3 atividades (padrão das ondas C4+; é o que dá granularidade diagnóstica ao `lessonScore` e material à janela `[1,7,21]` — ganho pedagógico registrado no AID-559 §2).

## 3. R2 — Comunicação ao learner afetado (copy SL; sign-off UX pendente)

- **Gatilho:** bump de `contentVersion` cujo diff inclua novas atividades em lição com status persistido "completed" para aquele learner.
- **Superfícies mínimas (2):**
  - **S1 — card "Revisão pendente" do Home**, quando a revisão devida for de lição retrofitada: linha adicional, texto literal: *"Esta lição ganhou atividades novas — sua conclusão continua valendo."*
  - **S2 — intro da lição retrofitada**, primeira execução pós-bump por learner: *"Esta lição agora tem atividades novas. O que você já concluiu continua valendo."*
- **Idempotência:** exatamente 1× por learner/lição/bump de `contentVersion` (chave local estruturada; nada de texto livre persistido — respeita `storage.policy`).
- **Dono de produção:** FPE, como tarefa de superfície mínima dentro da spec O3-C1 (zero mudança de domínio; UI + flag idempotente). Custo estimado: pequeno (≈0,5–1 dia incl. testes).
- **Sign-off:** UX Designer (copy learner-facing, disciplina do case UX AID-524) **na abertura da spec**. Os textos acima são o serviço-level (SL) — a spec os adota salvo ajuste do UX.
- **Constraints:** ≤2 frases; sem "você precisa refazer"; sem culpa; pt-BR simples; vendor-neutral. Alternativa "zero código, apenas nota de release" foi considerada e **rejeitada**: público não-técnico + confiança no progresso salvo (missão) exigem aviso in-app.

## 4. R3 — Janela de consolidação e critérios de aceitação

- **Definição operacional da janela de consolidação O3-C1:** começa na **promoção única** do retrofit (single-writer FPE; precheck estendido padrão AID-601) e dura **21 dias** (alinhada ao maior intervalo `[1,7,21]`), com checkpoints **d+1 / d+7 / d+21**.
- **Métricas por checkpoint** (só superfícies existentes; sem novo telemetria): evidência local `literacy-evidence v1` (tentativas/pass por atividade nova a2/a3; conclusão de revisões nas 7 lições; abandono de revisão E1) e funil OP-B quando existir (direcional; coorte pequena — **hipóteses, nunca claim de eficácia** sem gate evidence).
- **Critérios de aceitação (testáveis; QA wave-level independente — produtor ≠ verificador):**
  - **A1 Nenhum rebaixamento de status:** progresso com `lessonStatus[l0X]="completed"` + `contentVersion` antigo, após `migrateProgress` para o novo `contentVersion`, permanece "completed" (estender `migration.test.ts` com caso retrofit: l01 concluída só com a1).
  - **A2 Revisão devida preservada:** migração marca `nextReviewAt=now` para skills praticadas (re-pin sob o catálogo novo).
  - **A3 Predicado version-blind pinado:** `evaluateLessonCompletion` com bestScores só-a1 ⇒ `completed:false`, `missingActivityIds=[a2,a3]`; com as 3 ≥0.75 ⇒ `completed:true` (estender `progress.test.ts`).
  - **A4 Conteúdo:** `validate.py` passa; 7 lições com 3 atividades; `requiredActivityIds` = conjunto completo; rubricas 3 critérios weight 1; `version` bump em cada lição alterada; `estimatedMinutes` ∈ enum.
  - **A5 Aviso:** S1/S2 renderizam 1× por learner/lição/bump (teste de idempotência); zero mudança em gates/evidence schema.
  - **A6 Regressão de jornada:** learner `in_progress` em l0X completa normalmente; novo learner vê minutos coerentes; **l02 (Mapa Inicial, `MAP_INITIAL_LESSON_ID` — `progress.ts:5`)** intacto no fluxo de onboarding (`completeOnboarding` `progress.ts:189–216`; rota `migrateV2toV3` `migration.ts:48–61` que referencia l01/l02 literalmente).
  - **E3 documentado e aceito:** sessão em voo não crasha; finish sem payload trata como "ainda falta".
  - **A8 QA wave-level sobre 7 lições modificadas** (superfície maior que onda padrão de 3 — flag (ii) AID-559): checklist de leitura + diff puramente aditivo (R1) + suíte literacyDojo (`gen:content`, lint, test, build, e2e).
- **Saída da janela:** d+21 com A1–A8 verdes e sem defeito P1/P2 aberto nas lições C1; senão, follow-up issue com dono nomeado.

## 5. R4 — Opções técnicas, trade-offs e recomendação

| Opção | O que é | Prós | Contras / riscos | Custo | Veredito |
| --- | --- | --- | --- | --- | --- |
| **A — Codificar a semântica vigente** (grandfathering de status pela regra 4 + R2 aviso + A1–A8) | Aceitar que `completed` é do domínio do status persistido e que o contato com conteúdo novo acontece pela **revisão espaçada** (já force-agendada pela migração) | Zero mudança de domínio; comportamento já documentado e pinado (`migration.ts:10–13`); consistente com a regra 4; esforço só no aviso (S1/S2) | Replay exige novas atividades para "re-concluir" (aceitável — a jornada canônica de recontato é a revisão); revisão mais longa (comunicada por R2) | Pequeno (FPE ≈0,5–1 dia) | **RECOMENDADA** |
| **B — Snapshot de `required` na conclusão** (persistir o conjunto vigente à conclusão; completude de lições concluídas avalia contra o snapshot) | Grandfathering explícito por lição no predicado | Predicado estável para replays de concluídos | `schemaVersion` 3→4 + migração; bifurca a definição de "completo" por coorte; merge esquisito com bestScores de sessão nas revisões; **contraria o documento da regra 4** ("a próxima revisão usa a versão nova") | Médio-alto | Fallback condicionado a evidência de funil pós-OP-B |
| **C — `required` versionado no conteúdo** (`requiredSince` por atividade/versão de lição) | Declarativo no YAML | Decisão fica no conteúdo | Emenda de schema (board-gated); avaliação bifurcada para sempre; QA ×2 caminhos; complexidade permanente por ganho marginal | Alto | Rejeitada |
| **D — Re-onboarding dirigido** (des-completar deliberadamente + campanha) | Forçar re-feitura | Máxima exposição ao conteúdo novo | Viola a regra 4 documentada; destrói confiança do público não-técnico; maior superfície código+QA; sem evidência de benefício | Alto | Rejeitada |

**Recomendação: Opção A.** O sistema já implementa o grandfathering certo no lugar certo (status); o buraco real é a comunicação (E1) e a falta de pinagem dos comportamentos que o retrofit toca (A1–A3, A6). B fica registrada como fallback **somente** se o funil OP-B mostrar demanda real de re-conclusão por parte de learners concluídos — hoje não há nem funil nem indício.

## 6. Tabela per-lesson do subescopo C1 (fatos atuais verificados + delta do retrofit)

| Lição | Versão hoje | Atividades hoje | Delta retrofit | Minutos (hoje → esperado) | Rubrica (hoje → alvo) | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| l01 "Sua primeira conversa com uma IA" | v1 | 1 (a1) | +a2, +a3 | 3 → 4 (provável) | **2 → 3 critérios** | Entrada da trilha; prereq nenhum |
| l02 "IA não é fonte de verdade" | v3 | 1 (a1) | +a2, +a3 | 4 → 4 | 3 | **Mapa Inicial** (`MAP_INITIAL_LESSON_ID`) — atenção redobrada A6; já tem histórico de edição in-place (v3) |
| l03 "O que a IA faz bem e onde costuma falhar" | v1 | 2 (a1, a2) | **+a3 (apenas 1 nova)** | 4 → 4 | 3 | Vende capacidades executadas em l24–l26 (multimodal) — nova atividade pode reforçar ponte |
| l04 "Dê um objetivo claro" | v1 | 1 (a1) | +a2, +a3 | 3 → 4 (provável) | 3 | Núcleo de `pedir` |
| l05 "Dê contexto para obter resposta útil" | v2 | 1 (a1) | +a2, +a3 | 5 → 5 | 3 | Já tem histórico de edição in-place (v2) |
| l06 "Defina público, tom e formato" | v1 | 1 (a1) | +a2, +a3 | 4 → 4 | 3 | — |
| l07 "Melhore a resposta em etapas" | v1 | 1 (a1) | +a2, +a3 | 4 → 4 | 3 | Ancora l19 (iteração) — atividade nova pode plantar o eco |

**Totais C1:** 8 → 21 atividades (**+13 novas**); version bump em 7 lições; QA sobre 7 lições modificadas. Custo CD de autoria estimado em ≈8–12 h (AID-559 §2, decomposição por atividade 0,5–0,75 h + integração por lição) — **fora deste ruling**, a orçar na spec da onda.

## 7. Anti-escopo e decisões reservadas

- **Nada é produzido por este documento:** nenhum YAML, nenhum id criado (próximo livre continua `l30`, regra 7), nenhuma emenda (retrofit in-place é **edição de lição com version bump**, sem T0 — precedente l02 v3 / l05 v2 / l12 v2, flag AID-559 (ii)), nenhum binding tocado, nenhum gate/learner state/missão promovida modificada, nenhum claim de eficácia (sem gate evidence).
- **Decisões reservadas (não-decididas aqui):** renomear títulos/objetivos durante o retrofit (permitido pela regra 2 — id não deriva do título; cada mudança = bump; recomendado **manter títulos estáveis** para reduzir superfície de QA); aplicação deste ruling ao C2 (l08–l13) — reusável como precedente **com re-baseline** na spec da onda; escolha da janela (CEO/board).
- **Dependência externa viva:** plano OP-B (funil) delegado ao UX via AID-635 — pré-condição restante para a janela O3-C1, não bloqueante para este ruling.

## 8. Encaminhamentos (consumo do ruling)

1. **System Designer** — porta de entrada: a spec da onda O3 (quando aberta) incorpora R1–R4 por referência, com re-baseline do `contentVersion` e a tabela §6 como ponto de partida.
2. **UX Designer** — sign-off da copy R2 (S1/S2) na abertura da spec; dono do OP-B (pré-condição da janela).
3. **FPE** — nota de superfície mínima (S1/S2 + flag idempotente) no orçamento da onda; nenhum trabalho liberado por este doc.
4. **QA Lead** — superfície A8 (7 lições modificadas) + critérios A1–A8 como checklist de verificação wave-level.

**Nenhum follow-up bloqueante para esta issue.**
