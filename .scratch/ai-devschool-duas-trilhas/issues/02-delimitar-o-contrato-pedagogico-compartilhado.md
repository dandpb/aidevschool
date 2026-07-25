# Delimitar o contrato pedagógico compartilhado

Type: research
Status: resolved

## Question

Quais etapas, invariantes e fronteiras do ciclo de microaprendizagem já são compartilháveis entre
AI Literacy, Learner Journey e Teaching Games, e quais diferenças entre as duas trilhas precisam
permanecer explícitas?

## Answer

Resumo de uma linha: **o ciclo pedagógico já está escrito como contrato cross-surface em
`docs/design/micro-lesson-contract.md` e é honrado pelas duas trilhas até a etapa "evidência
bruta + verificador independente"; a partir daí só a Trilha Dev tem caminho executável até
`mastered` no estado canônico — a trilha não-técnica tem verificador implementado e testado, mas
nenhum consumidor do veredito.**

---

### (a) O ciclo real, etapa a etapa (reconstruído do código)

Existem **dois pipelines implementados** que compartilham a forma do ciclo, e uma **terceira
trilha só especificada** (`curriculum/00_ai_in_practice/`) sem nenhuma unidade.

#### Pipeline A — Trilha Dev (currículo 01–18 + teaching games) — ligado ao estado canônico

| # | Etapa | Onde vive | Quem produz / quem decide |
| --- | --- | --- | --- |
| A1 | Unidade ativa e seu estado | `learner/learning_state.yaml:37-57` (`active_unit`), enum em `learner/substrate/schema.yaml:9` (`presenting\|practicing\|evaluating\|mastered`) | substrato |
| A2 | Agendamento (substrato → jogo, mão única) | `learner/substrate/scheduling.py`, slice em `learner/substrate/dashboard_snapshot.py:171` (`build_pixel_review_slice`); regra em `docs/design/teaching-game-contract.md:44-48` | substrato produz; jogo só lê |
| A3 | Tentativa **antes** da solução | `learner/attempts/U2-key-value-store-attempt-1.md`, apontada por `active_unit.attempt_file` | aprendiz |
| A4 | Jogo emite evidência bruta (canal duplo) | `engines/shared/teaching-evidence/emit.ts` (`emitEvidence`, `dualEmit`): console `EVIDENCE <json>` + `window.__pixelQuestEvidence` / `__voxelDojoEvidence`; NDJSON append-only em `engines/voxelDojo/game-02-warehouse/.logs/evidence.ndjson` e `engines/pixelDojo/pixel-quest/.logs/evidence.ndjson` | jogo (produtor) |
| A5 | Elegibilidade (não é pass/fail) | `learner/gate/__init__.py:67-143` (`_check_evidence`) + `:146-203` (`_check_evidence_semantics`). Campos obrigatórios: `("unit_id","project","game","ts","pass")` (`:40`). Exige `state == "evaluating"` (`:107`), `attempt_file` não vazio (`:87-104`), anti-replay por `ts` estritamente novo (`:116-135`) e por digest (`replay_violations`), e **rejeita bloco `verifier` embutido na evidência** (`:180-184`) | verificador |
| A6 | Rejulgamento independente | `curriculum/_shared/evidence.py:545` (`independently_verified_pass`): ou uma **rubrica empírica reconhecida** por `metrics.kind` (`pixelquest-token-bucket`, `-route-health`, `-policy-gate`, `-sequence-flow`, `-task-queue`, `:590-630`), ou um **recibo separado** em `learner/verifier_receipts/` (`learner/gate/verifier_receipt.py`), cujo `evidence_digest` precisa bater com o registro (digest exclui `ts` e bloco `verifier` — `learner/gate/README.md:59-63`) | verificador isolado |
| A7 | Transição de estado (único caminho de escrita) | `learner/substrate/gate.py:30-109` (`transition_gate`) / `:112-134` (`commit_gate_transition`): grava review no `units_log` com `rating`, `gate_outcome`, `evidence_ts`, `evidence_digest`, `evidence_attempt_digest`; `mastered: bool`; atualiza `streak`. Rating derivado **só** de `RATING_FROM_GATE` (`learner/substrate/scheduling.py:36-41`) | substrato |
| A8 | Views derivadas regeneradas | `python3 -m learner.substrate` → adapters em `learner/substrate/schema.yaml:50-73` (`.mavis/`, whiteboard do minimaxDojo) + `engines/dojoToday/tools/gen-today.py:32` (lê `learning_state.yaml`) | substrato |

CLI de entrada: `learner/gate/__main__.py` (`python3 -m learner.gate [--evidence …] [--verifier-receipt …] [--dry-run]`).

#### Pipeline B — IA na Prática (AI Literacy / LiteracyDojo) — mesmo ciclo, **não** ligado ao estado canônico

| # | Etapa | Onde vive |
| --- | --- | --- |
| B1 | Acolhimento + Mapa Inicial + rota adaptativa | `engines/literacyDojo/src/application/useCases.ts:121-149` (`completeOnboarding`), `mapInitialRoute` em `src/domain/progress.ts` |
| B2 | Lição iniciada; conteúdo canônico compilado | `useCases.ts:151-170` (`startLesson`); fonte `curriculum/ai-literacy/catalog.yaml` (contentVersion `2026-07-25.1`) → read model tipado `src/data/generated/lessons.ts` (ADR-0005 §4) |
| B3 | Tentativa avaliada deterministicamente | `useCases.ts:172-250` (`submitActivityAttempt`) → `src/domain/evaluation.ts:257-279` (`evaluateActivity`, 7 tipos); limiar `ACTIVITY_PASS_THRESHOLD = 0.75` (`evaluation.ts:80`) |
| B4 | Feedback imediato + dica progressiva + nova tentativa | `src/adapters/deterministicFeedbackProvider.ts`; `useCases.ts:252-282` (`requestHint`), `:289-309` (`retryActivity`) |
| B5 | Evidência bruta por tentativa avaliada | `src/domain/evidence.ts:35-60` (`buildEvidenceRecord`) → `LiteracyEvidenceRecord` com `verifierRequired: true` literal (`:57`) |
| B6 | Canal de saída da evidência | `src/adapters/evidenceSinks.ts`: console, memória, e `window.__literacydojo.evidence` + `sessionStorage` (dev-only). **Nenhum canal escreve arquivo no filesystem.** |
| B7 | Progresso local (máximo `completed`) | `src/adapters/indexedDbProgressRepository.ts`; `LessonStatus = "locked"\|"available"\|"in_progress"\|"completed"` — sem `mastered`, com guard estrutural independente em `learner/gate/tests/test_literacy_verifier.py:248-268` |
| B8 | Engajamento e revisão local | `useCases.ts:437-459` (`applyReviewSchedule` sobre `lesson.review.intervalsDays`), `:472-475` (`pendingReviews`); XP/streak/achievements em `src/domain/progress.ts` |
| B9 | Verificação independente | `python3 -m learner.gate.literacy --evidence PATH.json [--write-receipt …]` (`learner/gate/literacy.py`) → `learner/gate/literacy_verifier.py:324-430` (`verify_literacy_evidence`). Recibo: `verdict`, `independent_pass`, `mastery_eligible`, `evidence_digest`, `producer_writes_mastered: false`, `max_producer_claim: "completed"` (`:99-105`). Falha fechada para evidência ausente/inválida/tipo desconhecido (`:270-275`). 27 testes em `learner/gate/tests/test_literacy_verifier.py` |
| B10 | Promoção a `mastered` no estado canônico | **não existe.** Nenhum código consome `mastery_eligible` (grep no repo: só o próprio módulo, seus testes e docs). `learner/gate/literacy.py:12-13` afirma explicitamente que o caminho nunca escreve `learning_state.yaml` |

---

### (b) Invariantes já compartilháveis pelas duas trilhas

1. **A sequência do ciclo mínimo já é contrato canônico cross-surface**, não precisa ser
   reinventada pelo mapa: `docs/design/micro-lesson-contract.md:16-38` — objetivo observável →
   tentativa antes da solução → feedback imediato determinístico → dica progressiva + nova
   tentativa → evidência bruta estruturada → progresso de experiência → revisão → verificação
   independente. Escopo declarado: "LiteracyDojo, jogos de ensino e experiências futuras"
   (`:6`).
2. **Attempt-before-solution.** Invariante do substrato
   (`learner/substrate/schema.yaml:36`: `empirical_gates.learning.requires_attempt_before_solution is true`),
   imposto no gate de código (`learner/gate/__init__.py:87-104`) e exigido pelo gate no-code
   (ADR-0004 §1, `docs/design/adr/0004-no-code-empirical-gate.md:21`).
3. **Produtor ≠ verificador em processo separado.** Ambos os verificadores rejeitam
   auto-atestação com a *mesma* regra: `learner/gate/__init__.py:180-184` e
   `learner/gate/literacy_verifier.py:171-174` ("embedded verifier is producer-controlled and
   cannot authorize mastery").
4. **Fail-closed.** Evidência ausente, ilegível ou de tipo desconhecido nunca vira aprovação:
   `learner/gate/literacy_verifier.py:331-346` e `:270-275`; `learner/gate/__main__.py:53-57`.
5. **Flag literal "ainda não verificada" carimbada pelo produtor.** Games:
   `review_context.verifier_required: true` (`engines/shared/teaching-evidence/emit.ts`,
   validado em `readReviewContext`). Literacy: `verifierRequired: true`
   (`src/domain/evidence.ts:57`, exigido em `literacy_verifier.py:169-170`). Mesma semântica,
   duas grafias.
6. **Sem texto livre na evidência.** Literacy: `deterministicChecks` só aceita
   `bool|number|string` e string > 200 chars falha fechado (`literacy_verifier.py:211-216`).
   Games: `metrics` só números/bool/string (`emit.ts`, `EvidenceRecord.metrics`).
7. **Digest estável que exclui o timestamp** — impede renovar evidência velha mudando `ts`:
   `literacy_evidence_digest` (`literacy_verifier.py:126-149`) e
   `canonical_evidence_digest` (`learner/gate/security.py`, documentado em
   `learner/gate/README.md:59-63`).
8. **Vocabulário de resultado em três camadas separadas.** Progresso ≠ engajamento ≠ competência
   (`docs/design/ai-literacy/evidence-contract.md:10-20`); `mastered` só existe atrás de uma
   review de gate no `units_log` (`learner/substrate/schema.yaml:42`: "a unit with mastered =
   true must have >= 1 gate review event").
9. **Rating de repetição espaçada nunca é autorrelato** — deriva só do `gate_outcome`
   (`schema.yaml:38-40`, `scheduling.py:36-41`).
10. **Gamificação é motivação, não prova.** `micro-lesson-contract.md:57`; `docs/VISION.md:90-92`
    (hearts e leaderboards excluídos por evidência). Nos dois lados, XP/streak/freeze convivem
    com o gate sem alimentá-lo.
11. **Substrato compartilhado mora só na raiz**, referenciado por caminho relativo, nunca
    duplicado: `docs/design/teaching-game-contract.md:57`; ADR-0005 §2
    (`docs/design/adr/0005-ai-literacy-bounded-context.md:38-45`).
12. **Agenda flui numa direção só, do substrato para a superfície** (para as superfícies ligadas
    ao substrato): `teaching-game-contract.md:44-48`.

---

### (c) Diferenças que precisam permanecer explícitas por trilha

> Atenção de nomenclatura, obrigatória para o mapa: **"IA na Prática" hoje nomeia duas coisas
> diferentes no repo.** ADR-0005 (`0005-ai-literacy-bounded-context.md:46-51`) diz literalmente
> que `curriculum/ai-literacy/` **não** é a materialização de `curriculum/00_ai_in_practice/`:
> a trilha 00 é escolarização do aprendiz único, gateada pelo Prometor; `ai-literacy/` é
> conteúdo de produto para o público do LiteracyDojo, com gate próprio e sem promover nada no
> substrato. `docs/VISION.md:21` e `:166-167` tratam as duas como uma coisa só. **São três
> gates, não dois.**

| Dimensão | IA na Prática (AI Literacy / LiteracyDojo) | Trilha Dev (01–18 + teaching games) |
| --- | --- | --- |
| O que conta como evidência | `LiteracyEvidenceRecord`: checks determinísticos por atividade tipada (7 tipos, `evaluation.ts:257`), score 0..1, sem texto livre | Execução real: `metrics` do jogo com rubrica empírica reconhecida (`curriculum/_shared/evidence.py:590-630`) ou coverage ≥ 0.80 + mutation ≥ 0.65 + `context_isolated` (`evidence.py:37-38`) |
| Onde vive o estado do aprendiz | IndexedDB **no navegador da pessoa** (`indexedDbProgressRepository.ts`). ADR-0005 §5 é explícito: "`learner/learning_state.yaml` **não** é banco de dados do produto" (`:79`) | `learner/learning_state.yaml` na raiz, filesystem como fonte da verdade |
| Autoridade de promoção | **Nenhuma implementada.** O recibo existe, o consumidor não (`docs/VISION.md:175-178` lista isso como decisão pendente) | `learner/substrate/gate.py:transition_gate` — único escritor de `mastered` |
| Agenda de revisão | Local por lição: `lesson.review.intervalsDays` (`useCases.ts:437-459`) | FSRS no substrato (`learner/substrate/scheduling.py`), propagado por slice read-only |
| Força declarada da evidência | Mais fraca **por decisão registrada**. ADR-0004 §Limites (`:34-38`): "evidência no-code é declaradamente mais fraca"; **nunca** promove unidades 1–6 (e a recíproca vale: unidades 00 não exigem coverage/mutation) | Régua empírica completa |
| Papel do verificador | Determinístico puro, sem LLM, num processo Python isolado (`literacy_verifier.py`); rejulga o envelope, não a resposta | Prometor em contexto isolado + rubrica; pode exigir recibo humano/agente separado em `learner/verifier_receipts/` |
| Granularidade / vocabulário | módulo → lição (3–5 min) → atividade → skill (`curriculum/ai-literacy/catalog.yaml`: 5 módulos, 14 lições, 8 skills) | nível → projeto → unidade (conceito) → jogo/mecânica (`curriculum/catalog.md`, 19 projetos 00–18) |
| Limite de conclusão declarado à pessoa | máximo `completed`; aplicação aberta vira `application_reported`, nunca `mastered` (`evidence-contract.md:17-20`; `literacy_verifier.py:44-46, 260-268`) | `mastered` exige recibo/rubrica independente |
| Multiusuário | produto local-first, futuro multiusuário (ADR-0005 §5) | "one learner per ecosystem instance" (`learner/CONTEXT.md:8-10`) |

---

### (d) Fronteiras: compartilhado na raiz vs. local a cada engine/trilha

**Compartilhado (raiz — nunca duplicar):**
- `curriculum/` — inclusive as trilhas separadas `curriculum/ai-literacy/` e
  `curriculum/00_ai_in_practice/`; `curriculum/catalog.md` é a autoridade do índice
  (`catalog.md:3-9`).
- `curriculum/_shared/evidence.py` — o *seam* de contrato de evidência, deliberadamente
  independente de `learner.gate` e `learner.substrate` para que gate e validador de estado
  apliquem a mesma regra sem ciclo de import (`evidence.py:548-553`).
- `learner/` inteiro: `learning_state.yaml`, `attempts/`, `evidence/`, `verifier_receipts/`,
  `substrate/`, `gate/` — **incluindo `learner/gate/literacy_verifier.py`**, que é o único
  ponto do caminho não-técnico que já vive na raiz.
- Contratos: `docs/design/micro-lesson-contract.md` (ciclo), `docs/design/teaching-game-contract.md`
  (jogos), `docs/design/ai-literacy/evidence-contract.md` (literacy), `learner/CONTEXT.md`
  (vocabulário canônico: Attempt, Eligibility, Run Judgment, Gate Outcome, Rating, Mastered).
- `engines/shared/teaching-evidence/emit.ts` — envelope + canal duplo compartilhado por
  pixelDojo e voxelDojo.

**Local a cada engine/trilha (não subir para a raiz):**
- Progresso, XP, streak, achievements e agenda de revisão do LiteracyDojo (IndexedDB).
- Read model compilado `src/data/generated/lessons.ts` (derivado, `DO NOT EDIT BY HAND`).
- Mecânicas, cenários, arte voxel e `.logs/` de cada jogo.
- Slices de revisão gerados por engine (`.../src/content/reviewSlice.ts`) — derivados,
  read-only.
- Snapshot do dojoToday (`engines/dojoToday/src/data/today.ts`, gerado de `learning_state.yaml`).

**Fronteira de escrita (a regra que o mapa não pode enfraquecer):** nenhuma superfície de
produtor escreve sob `learner/`. Games: `teaching-game-contract.md:14-17`. LiteracyDojo:
`learner/gate/literacy.py:12-13`. O único escritor de `mastered` é
`learner.substrate.gate.commit_gate_transition`.

---

### (e) Divergências doc ↔ código encontradas

1. **`gate_kind: no_code` não existe no código.** Especificado em ADR-0004 §4
   (`0004-no-code-empirical-gate.md:29`), em `curriculum/00_ai_in_practice/docs/spec.md:29` e no
   prompt do verificador (`engines/minimaxDojo/prompts/per_agent/prometor.md:231`). Não aparece
   em `learner/substrate/schema.yaml` nem em `learner/substrate/gate.py:70`, que grava
   `"kind": "concept"` fixo. O próprio handbook admite:
   `docs/handbook/08_learner_substrate.md:58` — "It does not yet have a `gate_kind` or
   `evidence_type` field for Level 0" e "the substrate cannot persist or validate that evidence
   type yet". → **O gate no-code do ADR-0004 é 100% doc, 0% implementação.**
2. **A trilha 00 não tem uma única unidade.** `curriculum/00_ai_in_practice/` contém apenas
   `docs/spec.md`. O próprio catálogo declara: "Verificação executável do no-code gate
   (Prometor) pendente" (`curriculum/catalog.md`, bloco do projeto 00, status `scaffolded`).
3. **A evidência do LiteracyDojo nunca chega ao filesystem.** O verificador
   (`learner/gate/literacy.py`) exige `--evidence PATH.json`, mas os três `EvidenceSink`
   existentes escrevem em console, memória e `window`/`sessionStorage`
   (`src/adapters/evidenceSinks.ts`). Não há exportador, nem script, nem passo documentado que
   materialize o `LiteracyEvidenceRecord` em arquivo. → **O elo produtor→verificador da trilha
   não-técnica é manual e não documentado; sem evidência de que já tenha sido percorrido de
   ponta a ponta.**
4. **`mastery_eligible` não tem consumidor.** Grep em todo o repo: aparece só em
   `literacy_verifier.py`, seus testes, e docs. `docs/VISION.md:126-138` é honesto sobre isso
   ("Residual: promoção automática a `mastered` … ainda não é o fluxo diário").
5. **`learner/verifier_receipts/` está vazio e a unidade ativa está travada.** `active_unit`
   `U2-key-value-store` está em `evaluating` (`learning_state.yaml:41`) com evidência real em
   disco (`engines/voxelDojo/game-02-warehouse/.logs/evidence.ndjson`), mas o `metrics.kind`
   emitido é `"voxeldoj-kv-warehouse"`, que **não** está entre as rubricas reconhecidas por
   `independently_verified_pass` (`curriculum/_shared/evidence.py:590-630`, todas
   `pixelquest-*`). Sem rubrica e sem recibo, o gate rejeita. → o caminho verificado de ponta a
   ponta só existe hoje para pixelDojo; **voxelDojo depende de um recibo humano que ainda não
   foi escrito.**
6. **Doc exige campo que o verificador não exige.** `teaching-game-contract.md:38` lista
   `review_context` (com `verifier_required: true`) como campo obrigatório da evidência; o
   `REQUIRED_EVIDENCE_FIELDS` do gate é só `("unit_id","project","game","ts","pass")`
   (`learner/gate/__init__.py:40`) e nada valida `review_context` no lado Python. O produtor
   sempre emite (`emit.ts`), então a divergência é latente, não ativa.
7. **Limiar 0.75 duplicado sem trava.** `PASS_SCORE_MIN = 0.75` no verificador
   (`literacy_verifier.py:22`, comentado como "Matches LiteracyDojo domain evaluation default")
   e `ACTIVITY_PASS_THRESHOLD = 0.75` no produtor (`evaluation.ts:80`). Nada testa que os dois
   coincidem — em contraste com os **tipos de atividade**, que *são* fixados por um teste que lê
   o `evaluation.ts` e o `lesson.schema.json` reais
   (`test_literacy_verifier.py:295-308`). Divergir os limiares silenciosamente é possível hoje.
8. **Heurística de "trap" do verificador literacy é código morto na prática.**
   `literacy_verifier.py:291-301` procura chaves contendo `trap`/`armadilha` nos
   `deterministicChecks`. Os ids de check gerados por `evaluation.ts:123` vêm dos ids de opção /
   critério do conteúdo; nenhum id no `curriculum/ai-literacy/` usa esses nomes — **sem
   evidência** de que a regra dispare alguma vez.
9. **A validação de envelope no E2E é feita pelo validador do próprio produtor.**
   `evidence-contract.md:70-71` pede captura e validação da evidência em Playwright — cumprido
   (`playwright/vertical-slice.spec.ts:52`, `playwright/gamification.spec.ts:56`), mas via
   `isValidEvidenceRecord` importado de `src/domain/evidence.ts` — ou seja, o produtor validando
   o próprio envelope. O rejulgamento independente é o do Python, que roda em outro caminho.
10. **ADR-0006 introduz um quarto modelo de gate, fora do substrato e não ratificado.**
    `docs/design/adr/0006-g4-verifier-bridge-contract.md` está `Proposed` (`:3`, pendência em
    `:101-108`) e descreve um gate G4 de *rubric-anchored LLM scoring* com adapter record/replay,
    para a skill `engines/aiDevschoolMvp/` — que não usa `learner/gate` nem
    `learner/substrate`. Se a "Trilha Dev" do mapa compuser essa skill, o mapa herda um modelo
    de gate com julgamento de LLM (mitigado por replay determinístico), diferente da régua
    empírica dos itens (b)/(c) acima.
