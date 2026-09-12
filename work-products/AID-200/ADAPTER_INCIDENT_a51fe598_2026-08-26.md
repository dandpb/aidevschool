# AID-200 — incidente operacional `a51fe598`

Data: 2026-08-26 UTC

- Run: `a51fe598-4e67-4cef-b19e-136e2c5ddc3b`
- Encerramento: `2026-08-26T09:44:27.481Z`
- Resultado: `adapter_failed`
- Causa informada: limite de uso do GPT-5.3-Codex-Spark; troca de modelo ou renovação da cota em `2026-08-31T00:06:00Z`.
- Classificação: falha operacional isolada do adaptador. Nenhuma execução funcional nem nova evidência do candidato foi produzida.
- Impacto: nenhum sobre a decisão de QA já sustentada. Permanece **NO-GO crítico — `blocked`**.
- Owner funcional: **Engenharia/Release** deve corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Owner operacional: **Administração do adaptador Paperclip** deve trocar o modelo ou aguardar a renovação da cota.
- Liveness: não há continuação viva para o candidato `6a8e4946`; o reteste depende de novo permalink imutável.
- HOLD: não promover alias e não convidar coorte.
