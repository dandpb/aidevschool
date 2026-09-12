# AID-200 — incidente operacional do adaptador `8d6622f7`

Data: 2026-08-26 UTC

- Run: `8d6622f7-aaa2-4de2-a64e-9a952660a5ea`
- Encerramento: `2026-08-26T09:19:59.408Z`
- Resultado: `adapter_failed`
- Causa informada: limite de uso do GPT-5.3-Codex-Spark; renovação indicada para `2026-08-31T00:06:00Z`.
- Classificação: falha operacional isolada; nenhuma nova execução funcional ou evidência do candidato foi produzida.
- Impacto: nenhum sobre a QA independente já concluída. Permanece o **NO-GO crítico — `blocked`**.
- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- HOLD: não promover alias nem convidar coorte.
