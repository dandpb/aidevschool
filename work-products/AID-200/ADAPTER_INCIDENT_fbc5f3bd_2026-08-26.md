# AID-200 — incidente operacional do adaptador

Data: 2026-08-26 UTC
Run: `fbc5f3bd-c44d-4f7b-9f0b-b5ee51faff83`

## Ocorrência

O run encerrou em 2026-08-26T09:45:44.907Z com `adapter_failed`: limite de uso do GPT-5.3-Codex-Spark atingido; renovação informada para 2026-08-31T00:06:00Z.

## Classificação e impacto

- Falha operacional isolada do adaptador; nenhuma nova execução funcional ou evidência do candidato foi produzida.
- A evidência independente já coletada permanece válida.
- A decisão continua **NO-GO crítico — `blocked`**.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- Não há continuação viva para o candidato `6a8e4946`; o reteste depende de um novo permalink imutável.

## Contenção

HOLD mantido: não promover alias e não convidar coorte.
