# AID-200 — incidente operacional do adaptador

- Run: `b30e2173-d412-4f98-a902-4c68758abdc7`
- Encerramento: `2026-08-26T10:47:44.612Z`
- Resultado: `adapter_failed`
- Erro: limite de uso do GPT-5.3-Codex-Spark; trocar o modelo ou aguardar a renovação em `2026-08-31T00:06:00Z`.

## Classificação e impacto

Falha operacional isolada do adaptador. O run não executou nova validação funcional e não produziu evidência capaz de alterar a decisão da QA independente.

Permanece o **NO-GO crítico — `blocked`** para o candidato imutável `6a8e4946`.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- **HOLD:** não promover alias e não convidar coorte.

