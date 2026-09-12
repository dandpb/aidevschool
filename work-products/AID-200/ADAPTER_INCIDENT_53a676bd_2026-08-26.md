# AID-200 — incidente operacional do adaptador

- Run: `53a676bd-14a2-4945-95c6-0135badd5ec3`
- Encerramento: `2026-08-26T10:14:49.778Z`
- Resultado: `adapter_failed`
- Causa: limite de uso do GPT-5.3-Codex-Spark; renovação indicada para `2026-08-31T00:06:00Z`.

Nenhuma validação funcional foi executada e nenhuma evidência nova do candidato imutável `6a8e4946` foi produzida. O incidente não altera o **NO-GO crítico** já sustentado pela QA independente.

Disposição: `blocked`.

- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- Não há continuação viva para o candidato atual; o reteste depende de novo permalink imutável.
- HOLD: não promover alias nem convidar coorte.
