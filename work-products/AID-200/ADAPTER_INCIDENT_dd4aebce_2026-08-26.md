# AID-200 — incidente operacional do adaptador

- Run: `dd4aebce-4e7f-42e3-93da-f7a1071620ab`
- Encerramento: `2026-08-26T10:28:20.826Z`
- Resultado: `adapter_failed`
- Causa informada: limite de uso do GPT-5.3-Codex-Spark; renovação prevista para `2026-08-31T00:06:00Z`.

## Classificação e impacto

Falha operacional isolada do adaptador. O run não produziu nova execução funcional nem nova evidência sobre o candidato imutável `6a8e4946`. Portanto, não altera o **NO-GO crítico** emitido pela QA independente.

## Disposição

- Estado terminal da AID-200: `blocked`.
- Owner funcional: **Engenharia/Release** — corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- HOLD: não promover alias e não convidar coorte.
