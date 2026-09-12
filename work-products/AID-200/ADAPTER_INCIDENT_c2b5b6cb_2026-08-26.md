# AID-200 — incidente operacional do adaptador

- Run: `c2b5b6cb-85be-4875-a727-b50a59478a10`
- Encerramento: 2026-08-26T10:00:38.752Z
- Resultado: `adapter_failed`
- Causa informada: limite de uso do GPT-5.3-Codex-Spark; renovação prevista para 2026-08-31T00:06:00Z.

## Classificação e impacto

Falha operacional isolada do adaptador. O run não produziu nova execução funcional nem evidência do candidato imutável `6a8e4946`; portanto, não altera a QA independente existente nem a decisão de release.

## Disposição

- **NO-GO crítico — `blocked`.**
- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- **HOLD:** não promover alias e não convidar coorte.

Não há continuação viva para o candidato atual; o desbloqueio funcional depende de um novo permalink imutável.
