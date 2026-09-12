# AID-200 — incidente operacional do adaptador

Data: 2026-08-26 UTC  
Run: `69b38c18-a712-4a95-84a7-47677a0926c2`

## Ocorrência

O run terminou em `2026-08-26T09:54:04.155Z` com `adapter_failed`: limite de uso do modelo GPT-5.3-Codex-Spark atingido; renovação informada para `2026-08-31T00:06:00Z`.

## Classificação e impacto

- Falha operacional isolada do adaptador.
- Nenhuma nova execução funcional ou evidência do candidato `6a8e4946` foi produzida.
- A decisão funcional permanece **NO-GO crítico — `blocked`**.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.

## Controle de release

HOLD preservado: não promover alias e não convidar coorte. Não existe continuação viva para o candidato atual; o reteste depende de um novo permalink imutável.
