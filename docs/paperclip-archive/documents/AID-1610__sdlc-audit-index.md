<!-- issue: AID-1610 | key: sdlc-audit-index | doc_id: 592f8efe-ff10-41df-8b4b-afe4c57af45c | updated: 2026-09-28 12:53:21.545+00 -->

# sdlc-audit-index

(AID-1610)

# DEPRECATED — `sdlc-audit-index` (alias do índice de auditorias SDLC)

> **Não usar. Este doc não recebe mais rows, em nenhuma circunstância.**
> A superfície canônica do índice cumulativo de auditorias é a key
> `592f8efe-ff10-41df-8b4b-afe4c57af45c` (id `ed6206dd-8fa6-4c1c-b4e3-12c4c349a26b`,
> carrier AID-1610) — ler e appendar **apenas** lá, sob a SM-RA-1
> (verify-after-append, ratificada AID-3230, comentário 2026-09-28T12:48:28Z;
> incorporada ao header do doc canônico pela AID-3233).

- **Deprecado em** 2026-09-28 (AID-3233) — OBS INFO #219 da auditoria AID-3228
  (instância #220) → ORDEM CEO AID-3230.
- **Motivo:** superfícies duplicadas com colisão key/id — o **id** deste doc é o
  uuid que é a **key** do doc canônico. As instâncias #216–#219
  (AID-3203/3207/3210/3217) appendaram neste doc (revs 191–194; updatedAt
  11:36:54Z, verificado first-hand na AID-3233) enquanto a trilha viva seguia no
  doc canônico — split-brain classe F1 de integridade de evidência. A
  normalização fecha a classe: uma key, um doc.
- **Histórico preservado:** o corpo pré-tombstone (rows #1–#219, tal como
  appendadas originalmente) permanece recuperável no histórico de revisões
  deste doc (`GET /api/issues/AID-1610/documents/sdlc-audit-index/revisions`,
  rev ≤ 194). A trilha viva e completa (rows #1–#220 e futuras) vive no doc
  canônico.
