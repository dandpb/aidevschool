<!-- issue: AID-1213 | key: intent-drafts | doc_id: f7d06003-e439-4ec2-af00-3b77fda64e4d | updated: 2026-09-10 06:21:42.39+00 -->

# Intent drafts SDLC — 3 maiores problemas do piloto (LEARN AID-1213)

(AID-1213)

# Intent drafts — onda LEARN do piloto (AID-1213)

**Formato:** `docs/sdlc/templates/intent.md` (verificado first-hand). **Status de todos: `draft`** — aceite é gate do product owner (founder/CEO); triagem é do SDLC SM (AID-1215). **Nada commitado no repo.**
**Evidência base:** doc `measurement` (AID-1212) + doc `sintese` (AID-1213). Citações abaixo referenciam seções do relatório da QA — fonte única de verdade.

---

## Draft 1 — Ativação: da missão à 1ª atividade

# Intent: Aprendiz começa a 1ª atividade na 1ª sessão — reduzir o abandono pré-1ª-atividade

Author: UX Designer (AID-1213, estágio LEARN do piloto) · Change-id: `2026-09-10-activation-first-activity` · Status: draft

> Origem: AID-1213 (LEARN). Evidência: AID-1212 doc `measurement` §5/§9.1 — "4/6 starts OS sem nenhuma submissão (2 abandonaram `l02` <1min após mission.started; 1 abandonou `game-02-warehouse` sem qualquer evento seguinte)"; literacy `75d40e87` idem; §7: zero eventos de erro em 57 envelopes.

## Problem

Aprendizes iniciam missão/lição e abandonam antes de submeter a 1ª atividade (padrão dominante: OS 4/6 starts, literacy 1/3). Não é falha técnica (0 erros). Quem não passa da 1ª atividade nunca alcança o loop de aprendizagem que comprovadamente funciona (2/2 completam com PASS após a 1ª submissão).

## Proposed outcome

Observável, não implementação: na próxima janela de medição (pós-intros O1), a taxa de starts que alcançam ≥1 submissão de atividade sobe da linha de base (OS 33%, literacy 67%) para ≥70% em ambas as superfícies, SEM degradar a taxa de conclusão pós-1ª-atividade (hoje 100%, 2/2) nem o tempo-médio por atividade. Medição via eventos existentes (`activity_attempted`/submissão), sem novos PII.

## Affected users and systems

Aprendizes de 1ª sessão (não-programadores na trilha ai-prática e devs na dev). Engines `codexDojo` (OS) e `literacyDojo`; shared substrate `curriculum/` (ordem/tipo da 1ª atividade é conteúdo — escalar ao curriculum ownership); coletor de telemetria somente leitura.

## Constraints

- Preservar intacto o ciclo tentativa→feedback→progresso verificado (sinal positivo F4 da síntese).
- Learning-gate golden rules: nada aqui marca mastery nem altera gates.
- Zero novas PII (ADR-0009/0010); envelopes OS v1 / literacy v2 compatíveis.
- Uma aprendiz, um currículo compartilhado, múltiplos engines: a melhoria vale para as 2 superfícies, respeitando contexto limitado de cada engine.
- Não otimizar engajamento acima de resultado de aprendizagem.

## Open questions

- O abandono é fricção do brief da missão (clareza do "o que fazer") ou da 1ª atividade (carga do `output_comparison` como primeiro tipo)? — Design precisa de sessões O1 (AID-641) + os eventos do Draft 2.
- `game-02-warehouse` (dev) teve 100% drop com n=1: problema de conteúdo, de dificuldade de entrada, ou ruído?
- F5 (pulo de trilha l02→game-02 na mesma sessão): track selection comunica "comece aqui"? (primeiro mandato UX).

---

## Draft 2 — Medição: visibilidade da entrada e do entre-missões

# Intent: O funil de ativação deixa de ser cego — instrumentar entrada, brief e exposição à 1ª atividade

Author: UX Designer (AID-1213, estágio LEARN do piloto) · Change-id: `2026-09-10-entry-brief-instrumentation` · Status: draft

> Origem: AID-1213 (LEARN). Evidência: AID-1212 doc `measurement` §4 — "2/3 sessões literacy começam em `lesson_started` sem `entry_viewed` (deep-link não emite)"; §8.4 — funil OS só visível na 1ª visita da instalação (`journey.returned` achata); §9.4 — "o entre-missões é invisível".

## Problem

O pipeline de medição funciona E2E, mas o vocabulário de eventos não cobre a etapa exatamente onde está o gargalo (F1): não sabemos distinguir "leu o brief e saiu" de "não entendeu o que fazer" de "nunca viu a 1ª atividade". Entradas por deep-link não emitem evento de entrada; não há evento de exposição ao brief nem à 1ª atividade sem submissão. Cada rodada MEASURE futura reporta o abandono sem poder explicá-lo.

## Proposed outcome

Observável: no próximo relatório QA (janela futura acordada), (a) 100% das sessões interativas têm um evento de entrada (qualquer superfície, incluindo deep-link); (b) existe medida de dwell/exposição entre `mission.started`/`lesson_started` e a 1ª submissão, permitindo segmentar o abandono de F1 em "saiu no brief" vs "saiu na 1ª atividade"; (c) zero PII adicionado (mesmos campos dimension/enum, auditável por inspeção como no 1º relatório).

## Affected users and systems

Engines `codexDojo` (OS, envelope v1) e `literacyDojo` (v2) — emissão de eventos; coletor `/__dojo/bridge/v1/analytics` (sem mudança de contrato além de vocabulário aditivo); QA (consumidor do export); UX e product owner (consumidores do funil).

## Constraints

- Vocabulário aditivo e retro-compatível (envelopes antigos continuam válidos; dedup e retention 90d intactos).
- Zero PII: só enums/contagens/UUIDs pseudônimos — sem texto livre, sem timing de tecla, sem IP/UA (ADR-0009/0010).
- Não usar analytics como evidência de funil O1 (regra do tracker AID-909) — estes eventos explicam comportamento, não contam participantes.
- Mudanças de schema seguem o processo dos contratos de telemetria existentes (producer≠verifier na verificação).

## Open questions

- Quais eventos mínimos cobrem o gap sem inflar o envelope: `mission_brief_viewed`? `activity_presented`? (Design define o conjunto mínimo.)
- Como tratar `journey.returned` no funil OS sem quebrar a série histórica do 1º relatório (linha de base precisa ser comparável)?
- O eventId não-UUID do OS (§8.5) precisa de convenção de prefixo de sonda formalizada junto?

---

## Draft 3 — Retenção: superfície mínima de retorno/hábito

# Intent: Aprendiz tem um motivo e um caminho para voltar amanhã — loop de retorno ancorado no ADR de streak

Author: UX Designer (AID-1213, estágio LEARN do piloto) · Change-id: `2026-09-10-return-habit-loop` · Status: draft

> Origem: AID-1213 (LEARN). Evidência: AID-1212 doc `measurement` §0.2/§8.2 — "zero envelopes 09-08→09-10; nenhuma sessão em dias consecutivos; streak/retorno não existe no piloto". Estado de design verificado first-hand: ADR `docs/design/spaced-repetition-streak/` status **Proposed** (não implementado nas superfícies promovidas).

## Problem

O ritmo Duolingo-like (missão da escola) depende de retorno diário/recorrente, e o produto live não oferece gatilho de retorno: sem streak visível, sem "próxima revisão", sem próxima missão sinalizada na saída. A ausência de recursão observada (0 dias consecutivos) está CONFUNDA com o funil O1 ainda zerado (tracker AID-909: 0/0/0/0/0 à espera de intros) — por isso este draft é condicional: quando os aprendizes O1 chegarem, a ausência da superfície limitará a formação de hábito desde a 1ª sessão, e não teremos métrica de retenção para julgar.

## Proposed outcome

Observável: (a) ao fim de uma missão/lição concluída, o aprendiz vê um próximo passo claro e um estado de retorno (streak/próxima revisão) derivado do substrate; (b) a partir da semana 1 pós-intros, o relatório QA passa a reportar retenção do tipo CURR-análoga (retorno em janelas d+1/d+7 por instalação, agregado e zero-PII); (c) nenhuma mecânica refutada pela pesquisa (hearts/vidas, leagues) é introduzida; streak reseta somente em gate de evidência executável perdido, nunca em lapso de calendário (ADR).

## Affected users and systems

Aprendizes recorrentes (o alvo do piloto O1). Shared substrate `learner/` (agendamento/estado vive no substrate — engines só renderizam views derivadas, por regra do ADR e da separação producer≠verifier); engines `codexDojo` (OS) e `literacyDojo` (render); QA (métrica de retenção no export).

## Constraints

- Ancorar no ADR existente `spaced-repetition-streak` (formaliza o stub `_next_reviews()`; FSRS no substrate Python; `ts-fsrs` só como projeção read-only) — **não criar sistema visual/paralelo novo**.
- Escopo mínimo viável primeiro (surface de retorno), não a camada FSRS completa — o ADR pode ser faseado; decisão de faseamento é do Design/owner.
- Learning-gate golden rules: streak NÃO marca mastery nem altera gates; reset só por gate de evidência executável perdido (nunca calendário).
- Uma aprendiz, um currículo, múltiplos engines: mesmo estado de retorno consumido pelas 2 superfícies.
- Zero PII; sem notificação externa/e-mail neste escopo (sem novo canal de contato sem aprovação do founder).

## Open questions

- Faseamento: surface de retorno (streak + próxima missão) antes da camada FSRS completa, ou juntos? (esforço × janela do piloto até ~09-23)
- A métrica CURR-análoga por instalação é aceitável como KPI sem vazar para "métrica de vaidade"? (alinhar com regras de honestidade do tracker AID-909)
- LiteracyDojo (standalone) consome o mesmo estado de retorno do OS, ou precisa de projeção própria do substrate?

---

**Nota final:** estes drafts NÃO estão commitados em `intent/<change-id>/` — aceite pelo product owner (founder/CEO) + triagem do SM (AID-1215) precede qualquer commit, conforme o gate do charter e do SDLC (`docs/sdlc/README.md`).
