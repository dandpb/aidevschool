# Plan — AID-3515: evidências de aprendizagem observáveis

Change-id: `2026-09-30-observable-learning-evidence` (intent.md ao lado).
Fatia única, autocontida, offline (nenhuma mudança de runtime).

## Passos

1. **Dicionário v1** (`learner/analytics_metrics/dictionary.yaml`):
   taxonomia de 8 observáveis (visita, tentativa, erro, feedback, retry,
   conclusão, retomada, retenção, transferência) com mapeamento evento→campo
   por envelope real (literacy v2: `engines/literacyDojo/src/domain/analytics.ts`;
   OS v1: `engines/codexdojo-os-prototype/src/analytics/events.ts`) e canal de
   evidência (rubricas tp-c01/tp-d01 do PR #619 @ `7259dbc5`). Status por
   métrica: `measurable_now` / `not_measured` (com motivo).
2. **Fixtures sintéticas rotuladas** (`fixtures/synthetic/*.ndjson` + README):
   jornada feliz, drop-off, erro+retry, reload (2ª sessão), retomada,
   evento duplicado (dedup), revisão espaçada, desfechos de rubrica
   (suficiente/insuficiente, 2ª tentativa). Cabeçalho
   `"synthetic": true` / README declina autoria.
3. **Cálculo reproduzível** (`compute.py`): regras do dicionário aplicadas
   aos fixtures → `report.json` + `report.md` (exemplo de relatório sem
   métrica inventada; células n<k = `suppressed`; ausência = `not_measured`;
   nenhum `mastered` em nenhuma saída — assert mecânico).
4. **Controles negativos** (`tests/test_metrics.py`): 8 testes (dupla
   contagem, reload, retry, erro, k-supressão, não-mastered,
   transferência≠conclusão, ausência≠zero).
5. **Doc de métricas** (`docs/metrics/AID-3515-evidencias-observaveis.md`):
   mapa, lacunas (herda G1–G8 da auditoria AID-1583 + novas T-gap da
   transferência), limites de inferência por público, baseline real
   (09-06, zeros explícitos), próxima instrumentação mínima com donos.
6. **Verificação**: pytest da fatia + regeneração do relatório (diff vazio).
   Sem `make test` completo (fatia não toca substrate/tutor).
7. **Review formal**: PR draft → Learner App Engineer confere relação
   ação-da-interface ↔ evento (campo `ui_action` do dicionário).

## Riscos

- Confundir exemplo sintético com dado real → mitigado por rótulo em toda
  camada (fixture, report, doc) e assert `synthetic:true` no cabeçalho.
- Inventar métrica sem fonte → toda métrica cita evento+prop ou artefato
   de evidência; `compute.py` só emite o que o dicionário declara.
