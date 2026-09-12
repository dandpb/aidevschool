# AID-200 — incidente operacional do adaptador

Data: 2026-08-26 UTC
Run: `883efec1-4d51-4bc7-a5cf-895313140ec1`

## Ocorrência

- O run encerrou em `2026-08-26T10:01:51.457Z` com `adapter_failed`.
- Erro reportado: limite de uso do GPT-5.3-Codex-Spark atingido; troca de modelo ou renovação da cota em `2026-08-31T00:06:00Z` necessária.
- Nenhuma execução funcional do candidato nem nova evidência de QA foi produzida neste run.

## Impacto e disposição

- Incidente operacional isolado; não invalida nem altera a evidência funcional já coletada.
- Permanece o **NO-GO crítico — `blocked`** para o candidato imutável `6a8e4946`.
- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar QA independente.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- HOLD preservado: não promover alias e não convidar coorte.
