# AID-200 — incidente operacional do adaptador

Data: 2026-08-26 UTC
Run: `f11a8e34-16ec-4dbb-9784-552a0b9e2e51`
Encerramento: `2026-08-26T09:09:41.451Z`

## Classificação

O run encerrou com `adapter_failed` porque a cota do GPT-5.3-Codex-Spark foi esgotada. Nenhuma nova validação funcional foi executada e nenhuma evidência anterior foi invalidada.

## Disposição preservada

- **NO-GO crítico — `blocked`.**
- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação informada para `2026-08-31T00:06:00Z`.
- HOLD: não promover alias nem convidar coorte.

Não há continuação viva para o candidato imutável `6a8e4946`; um reteste só é válido após a publicação de um novo permalink imutável.
