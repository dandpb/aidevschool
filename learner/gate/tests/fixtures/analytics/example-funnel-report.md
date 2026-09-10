# OS analytics — retention funnel (aggregated, k-anonymized)

Generated 2026-09-18T00:00:00.000Z · 212 accepted events (2 duplicate eventId line(s) removed) · 25 file(s) · 0 rejected, 0 unparsable line(s) excluded

Windows: D+1/D+7/D+21 · grace 2d · k≥5 · identifiers never published · analytics ≠ evidence

## Retention — narrow cohort (first mission.completed)

| cohort week | n | windows |
| --- | --- | --- |
| 2026-W29 | 5 | R1 40.0% (strict 40.0%, review 0) · R7 80.0% (strict 40.0%, review 1) · R21 80.0% (strict 40.0%, review 1) |
| 2026-W33 | — | suppressed (n=3 < k) |
| 2026-W35 | 5 | R1 40.0% (strict 40.0%, review 1) · R7 60.0% (strict 20.0%, review 1) · R21 80.0% (strict 20.0%, review 1) |
| 2026-W37 | 17 | R1 5.9% (strict 5.9%, review 0) · R7 5.9% (strict 0.0%, review 0) · R21 5.9% (strict 0.0%, review 0) |
| overall | 30 | R1 20.0% (strict 20.0%, review 1) · R7 33.3% (strict 13.3%, review 2) · R21 36.7% (strict 10.0%, review 2) |

## Retention — wide cohort (first onboarding.completed, context)

| cohort week | n | windows |
| --- | --- | --- |
| 2026-W29 | 6 | R1 33.3% (strict 33.3%, review 0) · R7 66.7% (strict 33.3%, review 1) · R21 66.7% (strict 33.3%, review 1) |
| 2026-W33 | — | suppressed (n=3 < k) |
| 2026-W35 | 6 | R1 33.3% (strict 33.3%, review 1) · R7 50.0% (strict 16.7%, review 1) · R21 66.7% (strict 16.7%, review 1) |
| 2026-W37 | 17 | R1 5.9% (strict 5.9%, review 0) · R7 5.9% (strict 0.0%, review 0) · R21 5.9% (strict 0.0%, review 0) |
| overall | 32 | R1 18.8% (strict 18.8%, review 1) · R7 31.3% (strict 12.5%, review 2) · R21 34.4% (strict 9.4%, review 2) |

## Activation funnel (per week of first event)

| cohort week | n | onboarding.started → onboarding.completed → mission.started → mission.completed |
| --- | --- | --- |
| 2026-W29 | 6 | 6 → 6 → 5 → 5 |
| 2026-W33 | — | suppressed (n=3 < k) |
| 2026-W35 | 6 | 6 → 6 → 5 → 5 |
| 2026-W37 | 17 | 17 → 17 → 17 → 17 |
| overall | 32 | 32 → 32 → 30 → 30 |

## Track entry split (first mission.started{mode:initial} per installation)

| cohort week | n | track split |
| --- | --- | --- |
| 2026-W29 | 5 | ai-pratica 3 (60.0%) · dev 2 (40.0%) |
| 2026-W33 | — | suppressed (n=3 < k) |
| 2026-W35 | 5 | ai-pratica 3 (60.0%) · dev 2 (40.0%) |
| 2026-W37 | 17 | ai-pratica 11 (64.7%) · dev 6 (35.3%) |

## Mission completion (per missionId context)

| mission | started (n) | completed | completion rate |
| --- | --- | --- | --- |
| game-02-warehouse | 6 | 6 | 100.0% |
| l01 | 6 | 6 | 100.0% |
| l04 | 8 | 5 | 62.5% |
| os-l04-1 | 1 | — | suppressed (n=1 < k) |
| unattributed | 13 | 13 | 100.0% |

## Activity friction (structured attempts per activityType × missionId)

| activityType | mission | submitted | passed | pass rate |
| --- | --- | --- | --- | --- |
| choice | unattributed | 1 | — | suppressed (n=1 < k) |
| prompt_builder | l01 | 6 | 4 | 66.7% |
| prompt_builder | unattributed | 1 | — | suppressed (n=1 < k) |
| rubric_review | l04 | 2 | — | suppressed (n=2 < k) |
| safety_classification | unattributed | 1 | — | suppressed (n=1 < k) |
| sort | unattributed | 1 | — | suppressed (n=1 < k) |

| mission | hint.requested | retry.requested |
| --- | --- | --- |
| l01 | 5 | suppressed (n=2 < k) |
| unattributed | suppressed (n=1 < k) | suppressed (n=1 < k) |

## Verification health (state_changed by state)

| state | events | installations | share |
| --- | --- | --- | --- |
| gateway-unavailable | 6 | 6 | 30.0% |
| pending | 2 | — | suppressed (n=2 < k) |
| rejected | 6 | 6 | 30.0% |
| verified | 6 | 6 | 30.0% |

## Renderer degradation (by fallback)

| fallback | events | reasons | engines |
| --- | --- | --- | --- |
| canvas2d | 1 | — | — |
| dom | 6 | creation-failed 6 | literacyDojo 6 |
| none | 2 | — | — |

## Module completion median — D2 (catalog: curriculum/ai-literacy/catalog.yaml)

| module | started (n) | completed | completion rate |
| --- | --- | --- | --- |
| mod-01 | 6 | 6 | 100.0% |
| mod-02 | 8 | 5 | 62.5% |

Median completion rate across published modules: 81.3% (2 published, 0 suppressed, 2 mission id(s) without catalog mapping)

## Literacy funnel (envelope literacydojo v2, sessions anônimas efêmeras)

Overall: suppressed (n=0 < k) — sessões insuficientes para publicar o funil.

| semana ISO | n | sessões por estágio |
| --- | --- | --- |

| lesson | started (n) | completed | completion rate |
| --- | --- | --- | --- |

Attempts: suppressed (n=0 < k) (sessões com tentativa).


## Glossário v4 (binding — spec AID-1218 R1/R3/R4)

- **entry.lesson-resume**: retomada pós-reload de lição em andamento (chamado de 'deep-link' no relatório da janela 2026-09-06→10; o termo 'deep-link' está aposentado no vocabulário novo)
- **entry.absent-pre-v4**: não instrumentado (pré-v4) — nunca 'unknown'
- **briefExposure.exitedBrief**: viu o brief e não chegou à 1ª atividade — comportamento observado (exposição), nunca leitura ou compreensão
- **briefExposure.exitedFirstActivity**: viu a 1ª atividade e não submeteu — não glosado como 'não entendeu o que fazer' (essa é a hipótese F1, testada com as sessões O1)
- **briefExposure.residualNoBrief**: started sem brief_viewed — canário de qualidade de dados (defeito de emissão se crescer), não segmento de aprendiz
- **briefExposure.startedToBrief**: ~100% <15s por construção (a intro renderiza junto com o started) — nota de uso
- **o1.artifactMapping**: artefatos de pesquisa O1 referem a tela pelo nome visível ao aprendiz ('Pedido da Vila Lume'); mapeamento analítico: brief/lesson_brief_viewed ↔ intro/'Pedido da Vila Lume' ('brief' é vocabulário de analista — o aprendiz nunca vê essa palavra)

## Activation detail v4 (entrada first-visit × returning; OS por sessão)

| corte | n | first-visit (onb.compl→mission.started→completed) | returning (started→completed) | unclassified |
| --- | --- | --- | --- | --- |
| overall | 46 | 32 (32→30→30) | 14 (5→5) | 0 |
| 2026-W29 | 8 | 6 (6→5→5) | 2 (1→1) | 0 |
| 2026-W30 | 3 | suppressed (n=3 < k) | — | — |
| 2026-W32 | 2 | suppressed (n=2 < k) | — | — |
| 2026-W33 | 4 | suppressed (n=4 < k) | — | — |
| 2026-W34 | 1 | suppressed (n=1 < k) | — | — |
| 2026-W35 | 7 | 6 (6→5→5) | 1 (1→1) | 0 |
| 2026-W36 | 2 | suppressed (n=2 < k) | — | — |
| 2026-W37 | 18 | 17 (17→17→17) | 1 (0→0) | 0 |
| 2026-W38 | 1 | suppressed (n=1 < k) | — | — |

### Literacy — split da prop `entry` (R1)

| corte | n | por entrada |
| --- | --- | --- |
| overall | 0 | suppressed (n=0 < k) |

## Brief exposure v4 (segmentos R3 — exposição observada, nunca leitura)

### literacySessions

Segmentos (sessões com started: 0): saiu no brief 0 · saiu na 1ª atividade 0 · submeteu 0 · resíduo sem brief 0 (canário).
- dwell startedToBrief (observados 0): —
- dwell briefToFirstPresentation (observados 0): —
- dwell presentationToFirstSubmission (observados 0): —
- medianas contínuas (s): brief→1ª apresentação — · apresentação→1ª submissão —

### hostedMissions

Cobertura: engineId=literacyDojo somente — voxelDojo não emite os eventos de exposição nesta onda (adoção voxel = follow-up data-gated)

Segmentos (sessões com started: 12): saiu no brief 0 · saiu na 1ª atividade 0 · submeteu 0 · resíduo sem brief 12 (canário).
- dwell startedToBrief (observados 0): —
- dwell briefToFirstPresentation (observados 0): —
- dwell presentationToFirstSubmission (observados 0): —
- medianas contínuas (s): brief→1ª apresentação — · apresentação→1ª submissão —

## Probe classification v4 (diagnóstico determinístico — não altera as seções acima)

Marcadores: probe. · aid###- · qa- · sequential-uuid — eventos OS 0, literacy 0, instalações OS 0, sessões literacy 0.

as seções v3/v4 de aprendiz continuam computadas sobre TODOS os eventos aceitos (semântica inalterada); excluir sondas da leitura é decisão do operador com esta seção em mãos


Baseline cycle: the first report establishes the baseline; no external numeric target is claimed.
