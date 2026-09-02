# Plan — AID-675 F2b (build)

1. `learner/gate/analytics/aggregate_funnel.mjs` — delta aditivo:
   - dedup por `eventId` após validação+sort; `source.duplicateEvents`;
     `source.totalEvents` passa a contar eventos efetivamente agregados
     (pós-dedup), documentado no README.
   - seções novas (todas k≥5/célula, chaves determinísticas ordenadas):
     `trackEntrySplit` (coorte ISO-week do primeiro `mission.started{mode:
     initial"}`; `trackId` ausente ⇒ bucket `unknown`),
     `missionCompletion` (por `missionId`; sem contexto ⇒ `unattributed`),
     `activityFriction` (células `activityType`×`missionId` para
     passed/submitted + `missionFriction` por missão para hint/retry),
     `verificationHealth` (por `state`, sem missionId no corte; eventos +
     instalações + share), `rendererDegraded` (por `fallback` com
     `reasons`/`engineIds`), `moduleCompletionMedian` (mapa lido do
     `curriculum/ai-literacy/catalog.yaml` em runtime — parser YAML mínimo
     focado nas seções `modules:`/`lessons:`; ausente/ilegível/vazio ⇒
     `{unavailable: true, reason}`; mediana só entre módulos publicados).
   - `renderMarkdownReport` ganha as seções (mesmo estilo; células suprimidas
     como hoje).
   - `REPORT_VERSION` 1→2. CLI e fail-closed (AID-492) intocados.
2. Fixtures sintéticas estendidas (novo grupo W37 2026-09-08..11; instalações
   a1..a6/b1..b5/c1..c6): dedup ×2 (linhas duplicadas exatas), trackEntrySplit
   com dev/ai-pratica, missões l01/l04/game-02-warehouse/os-l04-1 (mapeadas,
   não-mapeadas, unattributed), friction publicado+suprimido, verificação por
   estado, renderer dom/canvas2d/none, módulos mod-01/mod-02 publicados. As 12
   linhas `mission.started{initial}` existentes ganham `trackId` (contexto
   válido; não altera matemática de retenção).
3. Regenerar `example-funnel-report.json|.md` byte-idênticos (`--now
   2026-09-18T00:00:00.000Z`).
4. Testes: estender `dojo_analytics_funnel_aggregation.test.mjs` (dedup; cada
   seção; supressão; `unavailable` via `catalogPath` apontando para caminho
   inexistente); atualizar contagens mecânicas (totalEvents/overall/cohort
   W37) e as contagens de linhas no drift-monitor test e no OS
   `fixtureSchemaDrift.test.ts` (`reportVersion` 2).
5. Docs: `learner/gate/analytics/README.md` (reportVersion 2, dedup, seções,
   leitura runtime do catálogo) + linha no `learner/gate/AGENTS.md`.
6. Verificação: `node --test` nas duas suítes; drift monitor CLI exit 0 no
   synthetic; `cd engines/codexdojo-os-prototype && npm run test`; recompute
   independente (python) dos números de fixture.
7. PR + SDLC loop; QA wave-level é AID-677 (blockedBy T1+T2).
