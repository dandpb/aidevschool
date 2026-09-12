# AID-200 — incidente operacional do adaptador

Run: `55cb9a6c-a486-49a3-af27-364fa79aa345`  
Encerramento: 2026-08-26T09:22:47.010Z  
Resultado: `adapter_failed`

O adaptador `codex_local` não iniciou trabalho funcional porque a cota do GPT-5.3-Codex-Spark foi atingida. A renovação informada é 2026-08-31T00:06:00Z.

Classificação: incidente operacional isolado. Nenhuma evidência nova do candidato imutável `6a8e4946` foi produzida e a decisão funcional não mudou.

Disposição preservada: **NO-GO crítico — `blocked`**.

- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- HOLD: não promover alias nem convidar coorte.

