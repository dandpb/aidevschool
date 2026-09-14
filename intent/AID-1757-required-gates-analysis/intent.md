# Intent: análise de elevação de gates a required — §5.3 (AID-1757)

Author: Paperclip AID-1757 (assigned to Engine Systems Engineer) ·
Change-id: AID-1757-required-gates-analysis ·
Status: accepted (ORDEM carrier AID-1714/r7-C; onda 2)

> One source of truth: o corpo da issue AID-1757. Trecho decisivo (escopo):
> "Doc de análise: avaliar elevar smoke/e2e de pixelDojo, miniTown, dojoToday (e
> matriz voxelDojo agregada) a required — ou um meta-check de agregação barato —
> com custo/benefício por contexto (tempo de CI, sinal vs. ruído, risco de
> falso-verde). Entregue como PR docs com recomendação acionável. PROIBIDO:
> qualquer mudança em branch protection/settings nesta onda."

## Problem

Os jobs de browser (`pixelDojo (TS)`, `miniTown (TS)`, `dojoToday (TS + substrate)`,
`voxelDojo (TS)` e a matriz `voxelDojo games/<id>`) rodam em todo PR mas nenhum é
required; o único required que os agrega (`product readiness (claims)`) só falha
explicitamente com zero reports de produtor — regressões de browser podem ser
mergeadas com CI vermelho (falso-verde estrutural). A elevação a required é
propriedade do kit R1 (AID-1555, emenda B1/payload D); faltavam os dados de
custo/benefício por contexto e a sequência recomendada do ratchet.

## Outcome

- Doc `docs/product-readiness/REQUIRED-GATES-ELEVATION-ANALYSIS-2026-09-13.md`:
  estado atual da protection (GET first-hand), dados quantitativos (82 runs com
  atribuição por job, 2026-09-13T03:52–16:22Z: durações med/p90/max, zero falhas nos
  candidatos, caminho crítico `codexdojo-os` 4,7 min), análise do buraco de
  falso-verde, custo/benefício por contexto e recomendação acionável (onda 1 = os 4
  contexts raiz estáveis; matriz nunca required crua; meta-check agregado como onda 2
  opcional com critérios de disparo).
- Cross-link no anexo §5.3 de `REGRANT-FACTORY-NOISE-TRIAGE-2026-09-13.md`.

## Constraints

- ANÁLISE SOMENTE: zero mudança em branch protection/settings/workflows (doc-only;
  GETs de leitura apenas — boundary verificável no diff e no §9 do doc).
- Evidência first-hand citável: dados de API coletados em 2026-09-13, endpoints no
  §10 do doc.
- Execução de qualquer elevação: via kit R1 (dono do caminho), nunca ad-hoc.
