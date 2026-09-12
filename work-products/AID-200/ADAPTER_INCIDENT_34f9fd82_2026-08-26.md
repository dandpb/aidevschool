# AID-200 — incidente operacional do adaptador

- Run: `34f9fd82-e79b-46d6-9e98-328277e15685`
- Horário: 2026-08-26T09:04:21.155Z
- Classificação: `adapter_failed`
- Causa informada: limite de uso do GPT-5.3-Codex-Spark atingido; renovação indicada para 2026-08-31 00:06 UTC.
- Impacto funcional: nenhum. O run não produziu nova evidência e não altera o NO-GO do candidato imutável `6a8e4946`.

## Disposição

`blocked`

- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar um novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do Paperclip** — trocar o modelo do adaptador ou aguardar a renovação da cota.
- HOLD permanece: não promover alias e não convidar coorte.

Este incidente complementa `FINAL_DISPOSITION_2026-08-26.md`; não substitui a evidência funcional já registrada.
