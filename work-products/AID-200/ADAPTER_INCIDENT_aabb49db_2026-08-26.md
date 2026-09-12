# AID-200 — incidente operacional do adaptador

- Run: `aabb49db-098b-4d3e-a787-229ebb38fe17`
- Encerramento: `2026-08-26T10:33:14.613Z`
- Resultado: `adapter_failed`
- Erro: limite de uso do GPT-5.3-Codex-Spark; renovação indicada para `2026-08-31T00:06:00Z`.

## Classificação e impacto

Falha operacional isolada do adaptador. O run não executou nova validação funcional e não produziu evidência capaz de alterar a decisão da QA independente.

Permanece o **NO-GO crítico**, com disposição `blocked`, para o candidato imutável `6a8e4946`.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.

HOLD preservado: não promover alias e não convidar coorte.
