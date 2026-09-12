# AID-200 — incidente operacional do adaptador `0a882e25`

Data: 2026-08-26 UTC

- Run: `0a882e25-1f96-4fc6-97e2-9dd68b7e360b`
- Encerramento: `2026-08-26T09:16:03.639Z`
- Resultado: `adapter_failed`
- Causa informada: limite de uso do GPT-5.3-Codex-Spark; renovação indicada para `2026-08-31T00:06:00Z`.
- Classificação: falha operacional isolada; nenhuma nova execução funcional ou evidência do candidato foi produzida.
- Impacto: nenhum sobre a QA independente já concluída. Permanece o **NO-GO crítico — `blocked`**.
- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- HOLD: não promover alias nem convidar coorte.

