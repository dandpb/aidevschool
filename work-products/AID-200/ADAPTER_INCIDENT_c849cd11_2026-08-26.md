# AID-200 — incidente operacional do adaptador

- Run: `c849cd11-21bc-4b8e-8d47-38c741b2ef44`
- Encerramento: `2026-08-26T09:47:10.594Z`
- Estado: `failed`
- Erro: `adapter_failed` por limite de uso do GPT-5.3-Codex-Spark; renovação informada para `2026-08-31T00:06:00Z`.

## Classificação e impacto

Falha operacional isolada do adaptador. O run não produziu nova execução funcional nem nova evidência sobre o candidato imutável `6a8e4946`. Portanto, não altera a QA independente já concluída nem sua decisão: **NO-GO crítico — `blocked`**.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- **HOLD:** não promover alias e não convidar coorte.

