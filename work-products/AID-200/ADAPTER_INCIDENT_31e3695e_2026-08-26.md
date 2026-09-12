# AID-200 — incidente operacional `31e3695e`

Data: 2026-08-26 UTC

- Run: `31e3695e-36ce-4336-b0e0-913cc80962bc`
- Encerramento: `2026-08-26T09:43:18.136Z`
- Resultado: `adapter_failed`
- Causa informada: limite de uso do GPT-5.3-Codex-Spark; troca de modelo ou renovação da cota em `2026-08-31T00:06:00Z`.
- Classificação: falha operacional isolada do adaptador. Nenhuma execução funcional nem nova evidência do candidato foi produzida.
- Impacto: nenhum sobre a decisão de QA já sustentada. Permanece **NO-GO crítico — `blocked`**.
- Owner funcional: **Engenharia/Release** deve corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** deve trocar o modelo ou aguardar a renovação da cota.
- Liveness: não há continuação viva para o candidato `6a8e4946`; o reteste depende de novo permalink imutável.
- HOLD: não promover alias e não convidar coorte.
