<!-- issue: AID-670 | key: baseline-d0 | doc_id: 6df638fa-01e8-49e1-a99c-9e143dc0e92a | updated: 2026-09-02 18:01:58.207+00 -->

# Baseline d+0 — superfícies literacy-evidence (AID-670, snapshot 2026-09-02T18:01Z)

(AID-670)

# Baseline d+0 (snapshot 2026-09-02T18:01Z, ~45min após deploy `6a9859d1`)

Referência para os deltas de d+1/d+7/d+21. Só superfícies locais — hipóteses direcionais, nunca claim de eficácia.

## Atividades novas (13: l01-a2/a3 … l07-a2/a3)
- Definição presente e íntegra em `curriculum/ai-literacy/modules/**/l0[1-7]-*.yaml` (7 lições confirmadas com a2/a3).
- Registros de evidência local: **0** (nenhum NDJSON/JSONL de literacy-evidence para l0X-a2/a3 no workspace; arquivos .ndjson/.jsonl existentes são de outros engines — minimax/voxel/pixel dojos, product-readiness).

## Revisões nas 7 lições retrofitadas
- Conclusões registradas localmente: **0** (superfície esvaziada no baseline; produção mede via card "Revisão pendente" pós-bump).

## Abandono E1
- Sessões iniciadas-não-concluídas: **0** no baseline local.

## Funil OP-B
- Ainda inexistente no baseline (métrica direcional quando a superfície existir).

## Âncoras
- d+0 = 2026-09-02T17:16:03Z · main `4c2aeb7` · PR #248 CI 36/36 · zero P1/P2 nas C1 (varredura d+0, `202b6d34`).
- Checkpoints: d+1 = 2026-09-03T17:16Z · d+7 = 2026-09-09T17:16Z · d+21 (SAÍDA) = 2026-09-23T17:16Z.
- I/O de evidência: `learner/gate/evidence_io.py` (NDJSON) · schema `literacy_evidence.schema.json` (`LiteracyEvidenceRecord`: activityId/lessonId/lessonVersion).
- Volume ~zero nas primeiras 24h é esperado (direcional); a ausência persistente em d+7 é sinal de superfície morta a investigar.