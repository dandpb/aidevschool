# AID-200 — incidente operacional do adaptador

- Run: `e5ca11f3-38ca-4089-94ed-4f2d3f114d15`
- Encerramento: `2026-08-26T09:07:07.997Z`
- Resultado: `adapter_failed`
- Causa informada: limite de uso do GPT-5.3-Codex-Spark; troca de modelo ou renovação em `2026-08-31T00:06:00Z`.

## Classificação e impacto

Falha operacional isolada do adaptador. O run não produziu nova execução funcional nem nova evidência do candidato `6a8e4946`; portanto, não altera a QA independente já concluída.

Permanece **NO-GO crítico**, com disposição final `blocked`.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- Não existe continuação viva de QA para o candidato atual; o reteste depende de novo permalink imutável.
- HOLD preservado: não promover alias e não convidar coorte.
