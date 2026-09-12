# AID-200 — incidente operacional do adaptador

- Run: `20246a78-ef93-4c37-8887-3575a24173a3`
- Horário: 2026-08-26T09:05:47.445Z
- Classificação: `adapter_failed`
- Causa informada: limite de uso do GPT-5.3-Codex-Spark atingido; renovação indicada para 2026-08-31 00:06 UTC.
- Impacto funcional: nenhum. O run não produziu nova evidência e não altera o NO-GO do candidato imutável `6a8e4946`.

## Disposição

`blocked`

- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar um novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do Paperclip** — trocar o modelo do adaptador ou aguardar a renovação da cota.
- HOLD permanece: não promover alias e não convidar coorte.

Este incidente complementa `FINAL_DISPOSITION_2026-08-26.md`; não substitui a evidência funcional já registrada.
