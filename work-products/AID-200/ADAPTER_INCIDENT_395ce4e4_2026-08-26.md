# AID-200 — incidente operacional do adaptador

- Run: `395ce4e4-21ee-4bba-9c5e-fa7c92e02f6b`
- Encerramento: `2026-08-26T10:42:25.916Z`
- Resultado: `adapter_failed`
- Causa informada: limite de uso do GPT-5.3-Codex-Spark; troca de modelo ou renovação da cota em `2026-08-31T00:06:00Z` necessária.

## Impacto

Falha operacional isolada. O run não produziu nova execução funcional nem evidência sobre o candidato imutável `6a8e4946`; portanto não altera o **NO-GO crítico** já sustentado pela QA independente.

## Disposição

- AID-200: `blocked`.
- Owner funcional: **Engenharia/Release** — corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- HOLD: não promover alias e não convidar coorte.

