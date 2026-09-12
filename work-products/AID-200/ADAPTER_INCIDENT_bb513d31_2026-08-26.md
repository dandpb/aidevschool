# AID-200 — incidente operacional `bb513d31-0827-44a5-bd1d-e258b089f8b4`

- Encerramento: 2026-08-26T09:28:59.376Z
- Resultado: `adapter_failed`
- Causa: limite de uso do GPT-5.3-Codex-Spark; renovação informada para 2026-08-31T00:06:00Z.
- Classificação: falha operacional isolada do adaptador. O run não produziu nova execução funcional nem evidência do candidato imutável `6a8e4946`.
- Impacto: nenhum sobre a decisão funcional já sustentada pela QA independente. Permanece **NO-GO crítico — `blocked`**.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- Condição de retomada: fornecer o permalink imutável do novo candidato corrigido.
- HOLD: não promover alias nem convidar coorte.
