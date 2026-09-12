# AID-200 — incidente operacional do adaptador

- Run: `94283b6a-0a04-4301-9f95-f2e384d28e05`
- Encerramento: `2026-08-26T09:12:08.148Z`
- Estado: `failed` (`adapter_failed`)
- Causa: limite de uso do GPT-5.3-Codex-Spark; renovação informada para `2026-08-31T00:06:00Z`.

Nenhuma execução funcional ou nova evidência do candidato foi produzida. O incidente é operacional e não altera a decisão da QA independente: **NO-GO crítico**, disposição `blocked`.

Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.

Owner operacional: **Administração do Paperclip** — trocar o modelo do adaptador ou aguardar a renovação da cota.

HOLD preservado: não promover alias e não convidar coorte.
