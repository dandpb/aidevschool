# AID-200 — incidente operacional do adaptador

- Run: `5497b1b4-2ce6-4075-8e85-2f91e4639455`
- Encerramento: 2026-08-26T09:36:37.100Z
- Resultado: `adapter_failed`
- Causa: limite de uso do GPT-5.3-Codex-Spark; troca de modelo ou renovação da cota em 2026-08-31T00:06:00Z.

Nenhuma execução funcional nem nova evidência do candidato foi produzida. O incidente não altera o **NO-GO crítico** da QA independente.

## Disposição

- Estado: `blocked`.
- Owner funcional: Engenharia/Release — corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: Administração do adaptador Paperclip — trocar o modelo ou aguardar a renovação da cota.
- HOLD: não promover alias e não convidar coorte.
- O candidato `6a8e4946` não possui continuação viva; o reteste depende de um novo permalink imutável.
