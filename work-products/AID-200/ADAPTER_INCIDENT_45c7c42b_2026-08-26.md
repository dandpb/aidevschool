# AID-200 — incidente operacional do adaptador

- Run: `45c7c42b-f7fc-4ffd-8a16-95880a382990`
- Encerramento: `2026-08-26T11:00:15.938Z`
- Resultado: `adapter_failed`
- Causa: limite de uso do `GPT-5.3-Codex-Spark`; renovação informada para `2026-08-31T00:06:00Z`.
- Evidência funcional nova: nenhuma.
- Impacto na decisão de QA: nenhum; permanece **NO-GO crítico — `blocked`**.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo ou aguardar a renovação da cota.
- Owner funcional: **Engenharia/Release** — corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- HOLD: não promover alias e não convidar coorte.

