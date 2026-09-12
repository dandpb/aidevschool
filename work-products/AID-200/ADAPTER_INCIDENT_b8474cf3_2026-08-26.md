# AID-200 — incidente operacional do adaptador

- Run: `b8474cf3-1ff4-4b29-85bb-5373962ef093`
- Encerramento: 2026-08-26T09:56:38.859Z
- Resultado: `adapter_failed`
- Erro: limite de uso do GPT-5.3-Codex-Spark atingido; troca de modelo necessária ou renovação prevista para 2026-08-31T00:06:00Z.

## Classificação e impacto

Falha operacional isolada do adaptador. O run não produziu nova execução funcional nem evidência do candidato imutável `6a8e4946`; portanto, não altera a QA independente já concluída nem seu **NO-GO crítico**.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- **HOLD:** não promover alias e não convidar coorte.

Disposição de AID-200: **`blocked`**. Não há continuação viva para o candidato atual; o reteste depende de novo permalink imutável.
