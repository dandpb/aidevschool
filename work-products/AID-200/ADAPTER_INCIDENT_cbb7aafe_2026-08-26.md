# AID-200 — incidente operacional do adaptador

- Run: `cbb7aafe-a3c2-4e69-b7cf-0f90cc28a5fa`
- Encerramento: `2026-08-26T10:58:57.274Z`
- Resultado: `adapter_failed`
- Causa: limite de uso do `GPT-5.3-Codex-Spark`; troca de modelo ou renovação da cota em `2026-08-31T00:06:00Z`.

## Impacto

Falha operacional isolada. O run não executou nova validação funcional e não produziu evidência capaz de alterar a decisão de QA existente.

Permanece o **NO-GO crítico — `blocked`** para o candidato imutável `6a8e4946`.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- **HOLD:** não promover alias e não convidar coorte.
