# AID-200 — incidente operacional do adaptador

Data: 2026-08-26 UTC
Run: `5fbd2281-67be-433a-8ad7-da9b28d354f1`

## Registro

- Encerrado em `2026-08-26T10:05:43.596Z` com `adapter_failed`.
- Causa informada: limite de uso do GPT-5.3-Codex-Spark; troca de modelo ou renovação da cota em `2026-08-31T00:06:00Z` é necessária.
- Nenhuma execução funcional, inspeção do candidato ou nova evidência foi produzida neste run.
- O incidente não altera a decisão funcional já sustentada pela QA independente: **NO-GO crítico — `blocked`**.

## Owners e ações de desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- **QA:** retestar somente após receber um novo permalink imutável.

HOLD preservado: não promover alias e não convidar coorte.
