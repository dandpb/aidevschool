# AID-200 — incidente operacional do adaptador

- Run: `0f17138f-d90f-4be6-83be-6f59cc8b2ba2`
- Encerramento: `2026-08-26T10:13:29.117Z`
- Resultado: `adapter_failed`
- Causa: limite de uso do GPT-5.3-Codex-Spark; renovação indicada para `2026-08-31T00:06:00Z`.

Nenhuma validação funcional foi executada e nenhuma evidência nova do candidato imutável `6a8e4946` foi produzida. O incidente não altera o **NO-GO crítico** já sustentado pela QA independente.

Disposição: `blocked`.

- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- HOLD: não promover alias nem convidar coorte.
