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

Baseline cycle: the first report establishes the baseline; no external numeric target is claimed.
