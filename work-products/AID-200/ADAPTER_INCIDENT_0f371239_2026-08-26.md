# AID-200 — incidente operacional do adaptador

Run: `0f371239-b03f-4521-8a34-6d39fb76aacf`  
Encerramento: `2026-08-26T10:32:00.342Z`  
Resultado: `adapter_failed`

O adaptador `codex_local` não iniciou nova validação funcional porque a cota do modelo GPT-5.3-Codex-Spark foi excedida. A renovação informada é `2026-08-31T00:06:00Z`.

Este incidente não produz evidência nova e não altera a decisão funcional já sustentada pela QA independente: **NO-GO crítico, disposição `blocked`**.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- **HOLD:** não promover alias e não convidar coorte.

