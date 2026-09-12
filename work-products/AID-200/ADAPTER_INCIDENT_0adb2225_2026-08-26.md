# AID-200 — incidente operacional do adaptador

- Run: `0adb2225-f7a2-470a-a532-7c31f0cd4323`
- Encerramento: `2026-08-26T10:49:06.313Z`
- Resultado: `adapter_failed`
- Erro: limite de uso do GPT-5.3-Codex-Spark; trocar o modelo ou aguardar a renovação em `2026-08-31T00:06:00Z`.

## Classificação e impacto

Falha operacional isolada do adaptador. O run não executou nova validação funcional e não produziu evidência capaz de alterar a decisão da QA independente.

Permanece o **NO-GO crítico — `blocked`** para o candidato imutável `6a8e4946`.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- **HOLD:** não promover alias e não convidar coorte.

