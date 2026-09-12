# AID-200 — incidente operacional do adaptador

- Run: `accf87c0-9a4a-4dd7-b2ca-be81b41358d6`
- Encerramento: `2026-08-26T10:12:06.987Z`
- Resultado: `adapter_failed`
- Causa: limite de uso do GPT-5.3-Codex-Spark; renovação informada para `2026-08-31T00:06:00Z`.
- Escopo: nenhuma validação funcional do candidato foi executada e nenhuma evidência nova foi produzida.
- Impacto: nenhum sobre o NO-GO crítico já sustentado pela QA independente.

## Disposição

`blocked`

- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- HOLD: não promover alias nem convidar coorte.

