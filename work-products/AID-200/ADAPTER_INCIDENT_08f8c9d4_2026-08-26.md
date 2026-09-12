# AID-200 — incidente operacional do adaptador

Data: 2026-08-26 UTC  
Run: `08f8c9d4-4f19-4555-93b8-2c0a339ae88a`

## Ocorrência

O run encerrou em `2026-08-26T10:29:32.876Z` com `adapter_failed`: limite de uso do GPT-5.3-Codex-Spark atingido, com renovação informada para `2026-08-31T00:06:00Z`.

## Classificação e impacto

- Falha operacional isolada do adaptador; nenhuma nova execução funcional ou evidência do candidato foi produzida.
- A evidência independente já consolidada permanece válida.
- Decisão funcional inalterada: **NO-GO crítico — `blocked`**.

## Desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- Não há continuação viva para `6a8e4946`; o reteste depende de novo permalink imutável.
- **HOLD:** não promover alias nem convidar coorte.
