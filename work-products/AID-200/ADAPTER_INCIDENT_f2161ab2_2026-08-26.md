# AID-200 — incidente operacional do adaptador

Data: 2026-08-26 UTC

- Run: `f2161ab2-13a9-4e40-9126-b0f4dcb2075e`
- Encerramento: `2026-08-26T09:10:51.195Z`
- Resultado: `adapter_failed`
- Causa informada: limite de uso do GPT-5.3-Codex-Spark; disponibilidade indicada para `2026-08-31T00:06:00Z`.
- Classificação: falha operacional isolada; nenhuma execução funcional ou nova evidência do candidato foi produzida.
- Impacto: nenhum sobre a QA independente já concluída. Permanece **NO-GO crítico — `blocked`**.
- Owner funcional: **Engenharia/Release** deve corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do Paperclip** deve trocar o modelo ou aguardar a renovação da cota.
- HOLD: não promover alias nem convidar coorte.

