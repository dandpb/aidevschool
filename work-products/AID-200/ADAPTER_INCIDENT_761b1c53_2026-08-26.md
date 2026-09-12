# AID-200 — incidente operacional do adaptador

Data: 2026-08-26 UTC  
Run: `761b1c53-0110-4cb9-b3d4-cc1abaa44779`

## Resultado

O run encerrou em 2026-08-26T10:45:08.598Z com `adapter_failed`: limite de uso do GPT-5.3-Codex-Spark atingido, com renovação indicada para 2026-08-31T00:06:00Z.

Nenhuma nova execução funcional, inspeção do candidato ou evidência de QA foi produzida. O incidente é operacional e não altera o NO-GO crítico já sustentado pela QA independente.

## Disposição

- Estado de AID-200: `blocked`.
- Owner funcional: Engenharia/Release — corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: Administração do adaptador Paperclip — trocar o modelo ou aguardar a renovação da cota.
- Não existe continuação viva para o candidato `6a8e4946`; o reteste depende de novo permalink imutável.
- HOLD: não promover alias e não convidar coorte.
