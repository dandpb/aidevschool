# AID-200 — incidente operacional do adaptador

- Run: `d94bc0e3-1798-43be-ae92-158f28606d4e`
- Encerramento: `2026-08-26T09:14:41.449Z`
- Estado: `failed` (`adapter_failed`)
- Causa: limite de uso do GPT-5.3-Codex-Spark; renovação informada para `2026-08-31T00:06:00Z`.

Nenhuma execução funcional ou nova evidência do candidato foi produzida. O incidente é operacional e não altera a decisão da QA independente: **NO-GO crítico**, disposição `blocked`.

Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.

Owner operacional: **Administração do Paperclip** — trocar o modelo do adaptador ou aguardar a renovação da cota.

Não há continuação viva para o candidato `6a8e4946`; o reteste depende de um novo permalink imutável.

HOLD preservado: não promover alias e não convidar coorte.
