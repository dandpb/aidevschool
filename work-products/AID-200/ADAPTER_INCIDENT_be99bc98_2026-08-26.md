# AID-200 — incidente operacional do adaptador

- Run: `be99bc98-e393-4213-a1aa-69364e8edb7a`
- Encerramento: `2026-08-26T10:16:04.303Z`
- Resultado: `adapter_failed`
- Causa: limite de uso do GPT-5.3-Codex-Spark; renovação indicada para `2026-08-31T00:06:00Z`.

Nenhuma validação funcional foi executada e nenhuma evidência nova do candidato imutável `6a8e4946` foi produzida. O incidente não altera o **NO-GO crítico** sustentado pela QA independente.

Disposição: `blocked`.

- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- Não há continuação viva para o candidato atual; o reteste depende de novo permalink imutável.
- HOLD: não promover alias nem convidar coorte.
