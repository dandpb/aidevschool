<!-- issue: AID-915 | key: spec | doc_id: 06995c97-5f48-495a-baa1-375d6c00223c | updated: 2026-09-06 13:18:35.521+00 -->

# AID-915 — Spec rev 1: ONDA C2 — corredor literacy mod-01→03 contínuo a customer-ready (arco + revisão espaçada [1,7,21] + critérios de evidência)

(AID-915)

# AID-915 — Spec rev 1: ONDA C2 — corredor literacy mod-01→03 contínuo a `customer-ready` (arco + revisão espaçada [1,7,21] + critérios de evidência)

**Status:** SPEC REV 1 — somente leitura do repo + este documento (nenhuma escrita canônica, nenhum commit/PR por esta spec; implementação é da ORDEM AID-910/E = AID-916/FPE).
**Owner:** Content Designer (f2b1e95d). Revisores de fato: FPE (consumidor, AID-916) e QA (critérios §5).
**Ordem:** CEO AID-910/C (2026-09-06), passo 2b do consenso AID-900 — "o ritmo Duolingo vive de arco+ritmo, não de lição isolada; 29 lições autoradas v2, mas só l01+missão no tier".
**Baseline lida e citada (first-hand, workspace intocado):** `main` @ `505e7a6c` (pós PR #274) — leitura direta de `curriculum/ai-literacy/catalog.yaml` (`contentVersion "2026-09-04.1"`, 29 lições `ready`, jornadas `ia_pratica`/`dev`), `docs/design/ai-literacy/content-contract.md` + `evidence-contract.md`, `docs/product-readiness/` (`policy.yaml`, `inventory.yaml`, `scenarios/literacy-*.yaml`, assessments v27–v29, `tools/cli.py render`, `evidence/results.ndjson`), `engines/literacyDojo/src/domain/` (`progress.ts`, `track.ts`, `trackQueries.ts`, `migration.ts`, `analytics.ts`, `evidence.ts`, `retrofitNotice.ts`), `src/application/useCases.ts` (:177 `submitActivityAttempt` com `context:"initial"|"review"`, :288 `startReview`, :309 `completeReview`), `src/screens/` (Home com card "Revisão pendente", LessonScreen com modo review, TrackMapScreen com zonas "BAIRRO"), `src/app/App.tsx` (:168 `handleOpenReview`), `learner/gate/analytics/aggregate_funnel.mjs` (H1 review-return), `curriculum/ai-literacy/modules/0{1,2,3}-*/*.yaml` (instruções e ids de atividade de l01–l11).

---

## 0. Sumário executivo

O tier `customer-ready` vigente do literacyDojo (`literacy-standalone-first-lesson`, regrant v27/v29 @ `0a2f94f8`) promete **uma lição**. O produto promete **um corredor** — 3–5 min/dia, módulos que se encadeiam, revisão que volta. Esta spec especifica a elevação do **corredor mod-01→03 (l01–l11, 11 lições)** a use case contínuo `customer-ready`, em 5 entregas:

1. **Arco (§3):** progressão contínua mod-01→03 com **Desafio de Módulo** (checkpoint `cp-01..cp-03`) nas fronteiras, composição **sem conteúdo novo** (seleção determinística de 1 atividade já existente por lição — tabela desta spec), gate **somente sobre lições ainda `locked`** (grandfathering integral, padrão retrofit O3-C1: nunca tira progresso).
2. **Revisão espaçada [1,7,21] (§4):** entra no corredor pelo mecanismo já existente (agenda por skill, estágio por passes) + 2 eventos de analytics (`review_started`/`review_completed`, vocabulário já proposto no evidence-contract) + protocolo de **verificação determinística das janelas** em E2E (manipulação de storage no canal de teste — sem esperar 21 dias).
3. **Critérios de evidência por cenário (§5):** entrada nova de use case + 5 cenários no formato do inventory (scenarioIds/recovery/nextAction), checklist de aceite QA e revalidação do grant vigente.
4. **Plano de contentVersion (§6):** bump único do catálogo, **zero** edição de arquivo de lição, zero entrada nova no mapa de retrofit; alavanca automática da migração (revisão devida no primeiro retorno pós-bump) documentada como comportamento desejado.
5. **Dependências de engenharia nomeadas (§7):** E1–E6 para o FPE executar na AID-916.

**Custo estimado:** FPE 1,5–2,5 dias (E1–E6) + countersign QA ~0,5 dia + 1 sessão de observação (UX O1 ou facilitador).

## 1. Problema observado, evidência e impacto no aprendiz

**Problema:** o tier concede "primeira lição"; quem gosta não tem promessa de continuidade sustentada — sem gate entre módulos (desbloqueio é linear por lição: `progress.ts:218 unlockNextReadyLesson` via `nextReadyLessonId`, ordem das `ready`), sem momento de fechamento por módulo, e a revisão espaçada — embora agendada e renderizada — **não é medida** (vocabulário de analytics fechado em 4 eventos: `entry_viewed`, `mapa_inicial_done`, `route_chosen`, `lesson_completed`; `startReview`/`completeReview` não emitem evento).

**Impacto no aprendiz (linha AID-900):** ritmo Duolingo = arco + retorno. Sem checkpoint, o mapa é um corredor sem portas; sem revisão medida, o [1,7,21] é uma promessa invisível para o produto. O corredor mod-01→03 é a menor profundidade vendável: fecha a skill `entender` (mod-01), entrega `pedir` completo (mod-02) e `avaliar` completo (mod-03) — o núcleo "usar IA com confiança".

**Recomendação:** elevar o corredor a use case próprio (`literacy-standalone-corridor-mod01-03`), **sem** alterar a entrada vigente (a promessa first-lesson continua verdadeira e é subconjunto; grant vigente não é invalidado pela adição — mas o PR do corredor toca persistência ⇒ revalidação dos 3 cenários vigentes, §5.3). Trade-offs principais em §8.

## 2. Escopo e anti-escopo

**Dentro:** literacyDojo standalone (superfície do corredor), lições l01–l11, checkpoints cp-01..cp-03, revisão espaçada medida, docs product-readiness, microcopy PT-BR (§3.5), bump único de contentVersion.
**Anti-escopo (hard):**
- **Nenhum id de lição/módulo novo** (contrato regra 7: próximo livre `l30`, só por emenda board). Checkpoints **não são lições**: são composição runtime de atividades já existentes (ids `lNN-aM` vigentes), sem entrada no catálogo, sem `LessonDefinition` própria. Se o board quiser checkpoint como cidadão canônico do catálogo (rubric/version próprias), é emenda T0 — fora daqui.
- **Nenhuma mudança no schema de evidência** (`LiteracyEvidenceRecord` intocado; enum `context:"initial"|"review"` preservado — tentativas de checkpoint emitem `context:"review"` da atividade original). Evidência-semantics inalterada no envelope.
- Nada em `learner/gate/`, estado canônico, `mastered`, missões OS hospedadas (corredor OS é onda futura), transporte de analytics (gate do board, ADR-0010), gates em mod-04..07 (ativação futura por decisão de conteúdo, §3.4).
- Zero edição de arquivo de lição ⇒ zero bump de `version` por lição (regra 3 do contrato aplica-se a alteração de conteúdo; não há).

## 3. O arco do aprendiz mod-01→03

### 3.1 Estado hoje (evidência)
Entrada: onboarding 5 passos → Mapa Inicial (l02) → rota `guided` (l01→l03) ou `intermediate` (pula l02→l03; `progress.ts:241 nextLessonIdFor`). Desbloqueio linear l01…l29 por ordem `ready`. TrackMap agrupa por módulo ("BAIRRO N") sem nó de fronteira. Retorno: `resumeSession` (onboarding pendente → lição em andamento → home). Conquista `first_module` existe (engajamento). **Não existe gate entre módulos nem momento de fechamento.**

### 3.2 O arco alvo
```
onboarding → Mapa Inicial (l02) ─-guided→ l01,l03 ─┐
                          └────intermediate→ l03 ──┤
                                                   ▼
mod-01 (IA sem mistério): …l03 ✔ → DESAFIO cp-01 ── gate → mod-02 (l04–l07) → cp-02 ── gate → mod-03 (l08–l11) → cp-03 = CORREDOR COMPLETO
                                                          ↕ revisões [1,7,21] por skill (Home: "Revisão pendente")
```
- **Estado de retorno:** checkpoint pendente vira a missão do Home ("Continuar: Desafio do Módulo N"); `resumeSession` inalterado para lições em andamento; cp disponível mas não iniciado não bloqueia retorno à home.
- **Fechamento do corredor (cp-03):** momento celebratório + próxima ação explícita (mod-04 "Segurança e aplicação" ou revisão agendada). Conquista nova opcional `corridor_complete` (engajamento; P2, FPE pode adiar).

### 3.3 Desafio de Módulo — composição e seleção (decisão de conteúdo, desta spec)
**Forma:** sessão de 3–4 atividades (≤ ~3 min), 1 por lição do módulo, executadas no modo review do LessonScreen (mesmo motor, mesmo feedback/hints, header próprio). **Score:** média das melhores notas ≥ **0.75** (alinha `minimumScore` do contrato). **XP:** só o das atividades (`XP_PER_ACTIVITY_PASS`); sem XP de lição. **Streak/meta diária:** tentativas alimentam normalmente (revisão mantém streak — o ritmo vivo). **Evidência:** cada tentativa passa por `submitActivityAttempt` com `lessonId` = lição **original** da atividade e `context:"review"` (schema intacto, §2). **Estado:** `moduleCheckpoints[moduleId] = {status:"available"|"completed", bestScore, attempts, completedAt}`.

**Tabela de seleção (1 atividade por lição — âncora do objetivo; type variado de propósito):**

| Checkpoint | Atividades (ordem fixa) | Ritmo |
| --- | --- | --- |
| `cp-01` IA sem mistério | `l01-a2` (sort — ciclo da primeira conversa) · `l02-a1` (output_comparison — resposta confiável) · `l03-a2` (choice — onde a IA costuma falhar) | 3 at. |
| `cp-02` Aprender a pedir | `l04-a2` (prompt_builder — objetivo concreto) · `l05-a3` (output_comparison — efeito do contexto) · `l06-a2` (prompt_builder — público/tom/formato) · `l07-a1` (sort — iterar em etapas) | 4 at. |
| `cp-03` Avaliar e verificar | `l08-a1` (output_comparison) · `l09-a1` (rubric_review) · `l10-a1` (choice) · `l11-a1` (sort) — módulo inteiro, 1 at./lição | 4 at. |

A tabela vive no código como constante **content-owned** (mudança futura = decisão de conteúdo na mesma onda que tocar a lição; se uma atividade for aposentada por emenda, a seleção é re-especificada).

### 3.4 Regra de gate (grandfathering, padrão retrofit O3-C1)
- **Disponibilidade:** `cp-N` fica `available` quando a **última lição** do módulo N é `completed` (l03/l07/l11). Regra proposital — a rota `intermediate` pula l01 para sempre; predicado "todas as lições" travaria cp-01 nessa rota. O desbloqueio linear já garante as lições anteriores (exceto l01 sob `intermediate`, isento por design).
- **Gate:** lição `locked` que é **primeira de um módulo ativado** só desbloqueia com o checkpoint do módulo anterior `completed`. **Mapa de ativação (dados):** `{mod-02: cp-01, mod-03: cp-02, mod-04: cp-03}` — mecanismo uniforme, ativação escopada ao corredor; mod-06/07 seguem linear como hoje.
- **Grandfathering (inviolável):** o gate só age sobre status `locked`. Nada que já está `available`/`in_progress`/`completed` é re-bloqueado; `completed` nunca é revertido; nenhum score é zerado. Learner retornado com l04+ desbloqueada vê `cp-01` como desafio **opcional** (revisão), nunca como barreira.
- **Falha no desafio:** feedback `onFailure` + hints da própria atividade + retry ilimitado; nada muda de status; módulo seguinte permanece `locked`. Sem punição além disso.

### 3.5 Microcopy PT-BR (learner-facing, voz Vila Lume — entregar verbatim)
- Intro do desafio: **"Desafio do Módulo {N}: revise o que você aprendeu em {título do módulo}. É rápido — menos de 3 minutos."**
- Gate no mapa: **"Complete o Desafio do Módulo {N} para entrar no próximo bairro."**
- Falha/retry: **"Não foi dessa vez. Você pode tentar de novo — o que você já concluiu continua valendo."**
- Conclusão cp-01/cp-02: **"Bairro {N} completo! Sua próxima revisão já está agendada."**
- Conclusão cp-03 (corredor): **"Você completou os três primeiros bairros da Vila Lume! Continue para Segurança e aplicação — ou volte amanhã para sua revisão."**
- Card de missão (Home): **"Continuar: Desafio do Módulo {N}"**.

## 4. Revisão espaçada [1,7,21] no corredor — e como será medida

### 4.1 Estado hoje (evidência)
Agenda por **skill** (`SkillPractice.nextReviewAt`, estágio = passes com clamp; `progress.ts:304 applyAttemptToSkills`, `:335 reviewsDue`, `:343 upcomingReviews`); conclusão de lição agenda estágio 0 (`:582`); Home mostra card "Revisão pendente" + próximas revisões; LessonScreen tem modo review completo; tentativas de revisão **já emitem** `LiteracyEvidenceRecord` com `context:"review"` (`useCases.ts:182,207`). **Não medido:** nenhum evento de analytics de revisão; `startReview`/`completeReview` são mudos.

### 4.2 O que entra no corredor
Nada muda no motor de agenda ([1,7,21] declarado por lição — verificado em l01/l02/l11/l14). O corredor adiciona: (a) checkpoint conta como prática — tentativas de cp avançam estágio das skills do módulo (caminho já existente); (b) eventos de medição (4.3); (c) contraste de janela verificável em E2E (4.4).

### 4.3 Medição — 3 camadas (progresso ≠ engajamento ≠ competência; nada aqui promove domínio)
| Camada | Instrumento | O que prova |
| --- | --- | --- |
| Local (progresso) | `progress.skills[*].{nextReviewAt,passes}`, `moduleCheckpoints` — assertável em E2E via storage | agenda correta por janela/estágio |
| Evidência bruta | `LiteracyEvidenceRecord` NDJSON do canal de teste, tentativas `context:"review"` (envelope vigente, validado contra schema — evidence-contract regra 5) | a revisão aconteceu, com score |
| Analytics (engajamento) | **eventos novos** `review_started` (props: `lessonId`, `intervalDays`, `stage`) e `review_completed` (props: `lessonId`, `score`) — nomes/props travados na tabela proposta do evidence-contract (§ Eventos de analytics), fronteira de privacidade ADR-0009 intacta (sem texto livre) | funil de revisão do corredor |

**Métricas derivadas (funil anônimo):** `start_rate = review_started/devidas`, `completion_rate = review_completed/review_started`, distribuição de estágio (D+1→D+7→D+21), conclusão do corredor (cp-03). Nota de alinhamento: o agregador OS (`aggregate_funnel.mjs`) já conhece review-return H1 (`review.started {reason:"due"|"overdue"}`) — os nomes aqui são do **standalone** e convergem para o vocabulário unificado se/quando o board ativar transporte (ADR-0010). **Nenhuma métrica de revisão vira afirmação de eficácia de aprendizagem** (evidence-contract: competência é só com verificador independente).

### 4.4 Verificação determinística das janelas (E2E sem esperar 21 dias)
1. Concluir lição (D+0) → assertar `nextReviewAt ≈ agora+1d` no storage (canal de teste).
2. **Tamper de storage controlado**: reescrever `nextReviewAt` para o passado → reload → card "Revisão pendente" visível → concluir revisão → assertar avanço para `+7d`; repetir hop para `+21d` (e clamp no último estágio). Manipulação só no harness de teste (Playwright), nunca em código de produção.
3. Estágios intermediários e clamp também verificados em teste de domínio com clock falso (vitest — padrão já usado pelo motor).
O QA accepta o resultado por run id nos `results.ndjson` (formato vigente).

## 5. Critérios de evidência por cenário (formato inventory — para o QA conceder o tier)

### 5.1 Entrada de use case (yaml pronto; FPE cola no `inventory.yaml`)
```yaml
- id: literacy-standalone-corridor-mod01-03
  surface: literacyDojo
  audience: nontechnical-learner
  intendedTier: customer-ready
  promise: Progress continuously through modules 1–3 (11 lessons), pass each module challenge,
    return for spaced reviews on the [1,7,21] schedule, and understand the local result and next action.
  entry:
    route: https://aidevschool-literacydojo.netlify.app/
    prerequisites: [supported-modern-browser, browser-storage-enabled]
  progressSemantics: local-completion
  recovery: Use corrective feedback, hints, and unlimited retries on lessons and module challenges
    without losing prior completion; grandfathered lessons are never re-locked.
  nextAction: Continue the next module lesson or challenge, or complete the due review shown on Home,
    on the same device; ask a facilitator for help otherwise.
  scenarioIds: [literacy-corridor-happy-path, literacy-corridor-gate-retry,
                literacy-corridor-review-window, literacy-corridor-grandfathered-return,
                literacy-corridor-resume-mid-module]
  manualRefs:
    student: student-guide.md#standalone-literacydojo-corridor
    facilitator: facilitator-guide.md#standalone-literacydojo-corridor
  sourcePaths: [engines/literacyDojo/src/, engines/literacyDojo/playwright/,
                curriculum/ai-literacy/modules/01-ai-sem-misterio/,
                curriculum/ai-literacy/modules/02-pedir-bem/,
                curriculum/ai-literacy/modules/03-avaliar-e-verificar/]
  owner: literacyDojo
```

### 5.2 Cenários (kinds cobrem policy customer-ready: happy-path, recovery, continuity)
| id | kind | startState | passos essenciais | assertions-chave (severity/evidence) |
| --- | --- | --- | --- | --- |
| `literacy-corridor-happy-path` | happy-path | fresh | onboarding → l01–l03 → cp-01 → l04–l07 → cp-02 → l08–l11 → cp-03 | corredor completo sem travar; gate libera só após cp ✔ (high/playwright); aprendiz nomeia a próxima ação após cp-03 (high/observation); resultado é local-completion, nunca mastery (high/playwright) |
| `literacy-corridor-gate-retry` | recovery | fresh | até cp-01 → falha em atividade do desafio → lê feedback → pede dica → recupera → cp ✔ → l04 desbloqueia | falha oferece feedback+dica+retry sem perder conclusões (high/playwright); módulo seguinte permanece locked até cp ✔ (high/playwright); aprendiz entende o retry sem linguagem interna (high/observation) |
| `literacy-corridor-review-window` | continuity | returning (D+1 simulado por tamper §4.4) | card "Revisão pendente" → revisão ✔ → agenda D+7 → hop → D+21 + clamp | janelas [1,7,21] e estágio observáveis no storage (high/playwright); evidência `context:"review"` emitida e válida (high/playwright); aprendiz distingue revisão de conteúdo novo (high/observation) |
| `literacy-corridor-grandfathered-return` | continuity | returning com progresso pré-bump (ex.: l01–l05 concluídas) | reload pós-bump | nenhum status re-bloqueado/resetado (high/playwright); cps de módulos passados aparecem como opcionais (high/playwright); revisões ficam devidas no 1º retorno (regra da migração) sem exigir reconclusão (high/playwright) |
| `literacy-corridor-resume-mid-module` | continuity | returning mid l06 | reload | retoma lição em andamento; resumo de módulo preservado; checkpoint pendente vira missão do Home (high/playwright) |

Automation: `engines/literacyDojo` → `npm run test:e2e` (higiene de porta PR #274 mantida).

### 5.3 Checklist de aceite QA (re-grant)
1. 5 cenários com result runs promovidos em `evidence/results.ndjson` (fingerprint+SHA, padrão v27–v29).
2. **Revalidação do grant vigente:** o PR toca persistência ⇒ re-executar `literacy-happy-path`, `literacy-retry`, `literacy-resume` e registrar (freshness: `persistence`).
3. Auditoria de vocabulário: eventos emitidos ∈ enum fechado (+2 novos de revisão); zero texto livre; zero `mastered` em qualquer superfície.
4. Rota `intermediate` testada explicitamente (risco R1 §8).
5. Regenerar matriz: `python3 docs/product-readiness/tools/cli.py render`.
6. **Observação:** janela O1 (UX, AID-641, ~09-23) se o merge terminar a tempo; senão sessão observada por facilitador via facilitator-guide (âncora manual) — gap a nomear se nenhuma das duas for possível.

### 5.4 Manuais (seções novas — esqueleto)
- `student-guide.md#standalone-literacydojo-corridor`: o que é o Desafio de Módulo; por que revisões voltam (retenção, não punição); limite do dispositivo; próxima ação.
- `facilitator-guide.md#standalone-literacydojo-corridor`: preparar (browser+storage), observar (gate, retry, revisão), recuperação segura (retry/relódio; nunca reverter progresso), escalonamento.

## 6. Plano de contentVersion — bump único, sem reset
1. **Um bump só:** `"2026-09-04.1"` → `"2026-09-{DD}.1"` (data do merge; FPE define no PR). Nenhum outro.
2. **Zero edição de lição** ⇒ zero bump de `version` por lição; `RETROFITTED_LESSONS_BY_CONTENT_VERSION` **não** ganha chave nova (nenhuma lição ganhou atividade — diferente de O3-C1).
3. **Estado local:** `PROGRESS_SCHEMA_VERSION` 3→4 (`moduleCheckpoints`), forward-only (regra 4 do contrato): `completed` mantido; derivção v4 = checkpoint `available` (opcional) para módulos fechados pré-bump — **nunca** `completed` derivado sem tentativa. Ids estáveis; nenhuma migração de id.
4. **Alavanca automática (desejada):** divergência de contentVersion já põe revisão devida imediatamente para skills com `passes>0` (`migration.ts:87-98` — "versão nova pede revisão, não reconclusão"): o corredor reengaja quem voltou. Trade-off: pico de revisões devidas no 1º retorno — mitigado pelo picker vigente (Home serve 1 lição de revisão por vez); monitorar via `start_rate` (§4.3).

## 7. Dependências de engenharia (AID-916/FPE — implementação)
- **E1 Domínio/estado:** `moduleCheckpoints` + migração v4 (derivção §6.3) + gate locked-only (§3.4) + constantes `CHECKPOINT_ACTIVATION` e `CHECKPOINT_SELECTION` (tabela §3.3, content-owned) + predicado disponibilidade (última lição do módulo).
- **E2 UI:** nó de Desafio no TrackMap entre bairros; sessão de desafio (reuso LessonScreen modo review, header/microcopy §3.5); card de missão Home; momento cp-03 (+achievement opcional `corridor_complete`); estado do gate no mapa.
- **E3 Analytics:** `review_started`/`review_completed` (§4.3) — 1 extensão de vocabulário ADR-0009, **alinhada com AID-913** (nomes travados aqui; se AID-913 já estiver mergeada, o corredor só adiciona os 2 eventos; nunca renomear os da AID-913).
- **E4 E2E:** 5 specs por cenário + harness de tamper de storage p/ janelas (§4.4) + re-execução dos 3 cenários vigentes (§5.3.2) + port hygiene PR #274.
- **E5 Readiness/docs:** inventory + scenarios (§5.1/5.2) + `cli.py render` + seções de manuais (§5.4) + README do engine (checkpoint + regra de revisão pós-bump).
- **E6 Catálogo:** bump contentVersion (§6) + `validate.py` + `gen:content`.
- **Ordem:** AID-913 (telemetria) primeiro — decisão CEO explícita; corredor depois. Os E3 não conflitam (§7 E3).

## 8. Trade-offs e riscos (nomeados)
- **R1 — rota intermediate pula l01:** se o gate usasse "todas as lições do módulo", cp-01 nunca abria. Mitigado pelo predicado "última lição" (§3.4) + teste obrigatório (§5.3.4).
- **R2 — rollback forward-only (schema 4):** build antigo lê schema 4 → `UnmigratableProgressError` → boot descarta estado (comportamento documentado). Aceito: semântica local-completion, single-writer, sem perda canônica; documentar no PR. Alternativa (side-car em chave própria, sem bump) rejeitada por fragmentar a fonte única de progresso; reavaliar só se o QA sinalizar risco real.
- **R3 — pico de revisões pós-bump:** inerente à alavanca §6.4; mitigado e monitorado (start_rate).
- **R4 — peso no ritmo diário:** desafio ≤4 atividades (~3 min); meta diária 10 XP continua alcançável com 1 lição; sem XP duplo.
- **R5 — uso case novo vs. estender o vigente:** entrada nova preserva o grant first-lesson (não invalida promessa) a custo de sobreposição temporária; consolidar (deprecar a entrada first-lesson em favor da corredor) é limpeza futura pós-grant, decisão de board.
- **R6 — observação fora da janela O1:** gap nomeado com fallback facilitador (§5.3.6); sem inflar tier sem evidência.

## 9. Esforço
FPE: E1 0,5–1d · E2 0,5–0,75d · E3 0,25d · E4 0,25–0,5d · E5+E6 0,25d ⇒ **1,5–2,5d**. QA countersign+re-grant: ~0,5d. Content (esta spec + revisão de microcopy no PR): incluído. Observação: 1 sessão (UX O1 ou facilitador).

## 10. Referências
Ordem AID-910/C; consenso AID-900; AID-916 (implementação/E); AID-913 (telemetria/D); AID-912 (padrão QA re-grant); contracts `docs/design/ai-literacy/{content,evidence}-contract.md`; `docs/product-readiness/{policy,inventory}.yaml` + assessments v27–v29; engine `engines/literacyDojo/` (fontes citadas no cabeçalho); retrofit O3-C1 (`retrofitNotice.ts`, PR #248).
