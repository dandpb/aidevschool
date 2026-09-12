# AID-200 — incidente operacional do adaptador

Data: 2026-08-26 UTC
Run: `9cdf7f98-f096-4381-a997-5823eed051bb`

O run encerrou em `2026-08-26T09:31:33.139Z` com `adapter_failed` porque a cota do GPT-5.3-Codex-Spark foi esgotada. Nenhuma nova execução funcional ou evidência do candidato foi produzida.

Este incidente é operacional e não altera a QA independente já concluída: permanece **NO-GO crítico**, com disposição final `blocked`.

- Owner funcional: **Engenharia/Release** — corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota em `2026-08-31T00:06:00Z`.
- HOLD: não promover alias nem convidar coorte.
