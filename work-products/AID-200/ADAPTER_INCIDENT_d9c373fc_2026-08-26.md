# AID-200 — incidente operacional do adaptador

- Run: `d9c373fc-ddf9-4a7f-b221-e2a5d6ba800b`
- Encerramento: `2026-08-26T10:09:31.186Z`
- Erro: `adapter_failed` por limite de uso do GPT-5.3-Codex-Spark; renovação informada para `2026-08-31T00:06:00Z`.
- Classificação: falha operacional isolada. Nenhuma execução funcional ou nova evidência do candidato foi produzida.
- Impacto: nenhum sobre a QA já concluída. Permanece **NO-GO crítico — `blocked`**.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar QA independente.
- HOLD: não promover alias e não convidar coorte.

