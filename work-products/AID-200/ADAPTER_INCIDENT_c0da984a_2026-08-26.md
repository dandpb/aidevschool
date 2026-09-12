# AID-200 — incidente operacional do adaptador

- Run: `c0da984a-c353-4b5f-b029-fc147947432c`
- Encerramento: 2026-08-26T09:39:28.638Z
- Erro: `adapter_failed` por limite de uso do GPT-5.3-Codex-Spark; renovação indicada para 2026-08-31T00:06:00Z.
- Classificação: falha operacional isolada; nenhuma nova execução funcional nem evidência do candidato foi produzida.
- Impacto: nenhum sobre a QA independente já concluída. Permanece **NO-GO crítico — `blocked`**.
- Desbloqueio funcional: **Engenharia/Release** deve corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Desbloqueio operacional: **Administração do adaptador Paperclip** deve trocar o modelo ou aguardar a renovação da cota.
- Continuação: não existe caminho vivo para o candidato `6a8e4946`; o reteste depende de novo permalink imutável.
- HOLD: não promover alias e não convidar coorte.
