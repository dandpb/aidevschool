# Intent — AID-5012 CURRÍCULO REAL (Onda 2)

| Campo | Valor |
| --- | --- |
| Change-ID | `2026-10-17-aid-5012-curriculo-real-onda-2` |
| Issue | AID-5012 (board), prioridade high |
| Autor | Full-Stack Feature Engineer (plano AID-1521) |
| Data | 2026-10-17 |
| Tipo | feat(curriculum) — código executável + testes + contrato de verificação |

## Problema

`curriculum/06_file_upload_pipeline` e `curriculum/07_rest_api_auth` estão
`scaffolded` no catálogo ("catalog verification is pending", ver
`curriculum/BACKLOG_STATUS.md`). Os node-impl existem, mas sem bateria de
testes de borda/segurança condizente com os respectivos `docs/spec.md`, sem
verificador executável reprodutível, e com três lacunas de conformidade de
spec no 06 (arquivo vazio, validação de paginação/filtro) e uma no 07
(algoritmo JWT não fixado na verificação).

## Objetivo

Elevar 06 e 07 ao mesmo padrão de evidência da Onda 1 (05/12/18, commit
`90f89498`): implementação Node verificada verde (install/lint/build/test),
testes de borda/segurança especificados contra o spec, verificador
executável reutilizável e reconciliação de `catalog.md` + `docs/status.md`
+ projeções do substrate.

## Fora de escopo

- Benchmarks RNF (06: memória/throughput; 07: latência de middleware) — ficam
  como próximo ciclo declarado nos status.md.
- Rotação de refresh atômica sob concorrência real e revisão de KDF (07) —
  hardening declarado, não alterado neste slice.
- Persistência durável do registry (06, RNF-008) e thumbnails reais (RF-007).
- Go/Rust: removidos em `1b0a309`; não são regenerados aqui.
