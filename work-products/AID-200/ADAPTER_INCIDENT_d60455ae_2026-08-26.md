# AID-200 — incidente operacional do adaptador

- Run: `d60455ae-fe23-4f25-8321-5d82af8ddef1`
- Encerramento: 2026-08-26T11:08:06.361Z
- Resultado: `adapter_failed`
- Causa: limite de uso do GPT-5.3-Codex-Spark; troca de modelo ou renovação da cota em 2026-08-31T00:06:00Z necessária.

## Classificação e impacto

Falha operacional isolada. O run não executou nova validação funcional e não produziu evidência adicional sobre o candidato imutável `6a8e4946`. Portanto, não altera o **NO-GO crítico** já emitido pela QA independente.

## Disposição

- Estado de AID-200: `blocked`.
- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- HOLD: não promover alias e não convidar coorte.

