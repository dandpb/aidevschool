# AID-200 — incidente operacional do adaptador

- Run: `6392badb-5b8c-404f-b5ce-df09e64b0bea`
- Encerramento: `2026-08-26T10:51:52.383Z`
- Resultado: `adapter_failed`
- Causa: limite de uso do `GPT-5.3-Codex-Spark`; troca de modelo ou renovação da cota em `2026-08-31T00:06:00Z`.

## Impacto

Falha operacional isolada. O run não executou nova validação funcional e não produziu evidência capaz de alterar a decisão de QA existente.

Permanece o **NO-GO crítico — `blocked`** para o candidato imutável `6a8e4946`.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- **HOLD:** não promover alias e não convidar coorte.
