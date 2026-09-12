# AID-200 — incidente operacional do adaptador

Run: `7f1c1611-ea2d-42eb-a257-a2a2eb14d24f`  
Encerramento: 2026-08-26T09:24:00.783Z  
Resultado: `adapter_failed`

O adaptador `codex_local` não iniciou uma nova execução funcional porque a cota do GPT-5.3-Codex-Spark estava esgotada. Nenhuma evidência nova do candidato imutável `6a8e4946` foi produzida; portanto, o incidente não altera a decisão de QA existente.

Disposição funcional: **NO-GO crítico — `blocked`**.

- Owner funcional: **Engenharia/Release** deve corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** deve trocar o modelo ou aguardar a renovação da cota em 2026-08-31T00:06:00Z.
- HOLD preservado: não promover alias e não convidar coorte.
- Não há continuação viva para o candidato reprovado; o reteste depende de novo permalink imutável.
