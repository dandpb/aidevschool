# AID-200 — incidente operacional do adaptador

Data: 2026-08-26 UTC
Run: `6467a5a0-c69d-4edf-b8b8-11e539391779`

## Ocorrência

O run terminou em `2026-08-26T10:24:20.744Z` com `adapter_failed`: limite de uso do GPT-5.3-Codex-Spark atingido, com renovação informada para `2026-08-31T00:06:00Z`.

## Classificação e impacto

- Falha operacional isolada do adaptador; nenhuma nova execução funcional ou evidência do candidato foi produzida.
- A evidência independente existente permanece válida e a decisão não muda: **NO-GO crítico — `blocked`**.
- Não há continuação viva para o candidato imutável `6a8e4946`; o reteste depende de novo permalink imutável.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- **HOLD:** não promover alias e não convidar coorte.
