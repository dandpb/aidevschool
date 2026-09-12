# AID-200 — incidente operacional do adaptador

- Run: `dec700b9-bd6e-4f7e-b269-9b7e307b148b`
- Encerramento: 2026-08-26T09:34:11.111Z
- Resultado: `adapter_failed`
- Causa: limite de uso do GPT-5.3-Codex-Spark; troca de modelo ou renovação da cota em 2026-08-31T00:06:00Z.

## Impacto

Falha operacional isolada. Nenhuma execução funcional nem nova evidência do candidato foi produzida. A decisão de QA permanece **NO-GO crítico — `blocked`**.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.

Não existe continuação viva para o candidato `6a8e4946`. HOLD preservado: não promover alias e não convidar coorte.
