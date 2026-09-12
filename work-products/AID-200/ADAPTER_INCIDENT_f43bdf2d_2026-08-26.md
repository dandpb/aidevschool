# AID-200 — incidente operacional do adaptador

- Run: `f43bdf2d-60eb-4961-b884-af799c81b88a`
- Encerramento: 2026-08-26T09:32:55.190Z
- Resultado: `adapter_failed`
- Causa: limite de uso do GPT-5.3-Codex-Spark; renovação informada para 2026-08-31T00:06:00Z.

## Avaliação

Falha operacional isolada. O run não produziu nova execução funcional nem evidência do candidato imutável `6a8e4946`; portanto, não altera o resultado da QA independente.

## Disposição

- Permanece **NO-GO crítico — `blocked`**.
- Owner funcional: **Engenharia/Release** deve corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** deve trocar o modelo ou aguardar a renovação da cota.
- Não existe continuação viva para o candidato atual; o reteste depende de novo permalink imutável.
- HOLD preservado: não promover alias e não convidar coorte.
