# AID-200 — incidente operacional `93d284ea`

- Run: `93d284ea-52e1-4a16-82b7-0bb92be44ac1`
- Encerramento: `2026-08-26T09:08:28.727Z`
- Resultado: `adapter_failed`
- Causa: limite de uso do GPT-5.3-Codex-Spark; renovação informada para `2026-08-31T00:06:00Z`.
- Classificação: falha operacional isolada. Nenhuma nova validação funcional ou evidência do candidato foi produzida.
- Impacto: nenhum sobre a decisão de QA já sustentada. Permanece **NO-GO crítico — `blocked`**.
- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do Paperclip** — trocar o modelo do adaptador ou aguardar a renovação da cota.
- HOLD: não promover alias nem convidar coorte.

