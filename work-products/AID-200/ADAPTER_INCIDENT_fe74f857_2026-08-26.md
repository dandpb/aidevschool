# Incidente operacional — run `fe74f857-5125-4961-b070-bd4ed955029a`

- Horário: `2026-08-26T10:10:48.572Z`.
- Resultado: `adapter_failed` antes de qualquer nova validação funcional.
- Causa: limite de uso do modelo GPT-5.3-Codex-Spark; renovação informada para `2026-08-31T00:06:00Z`.
- Impacto: nenhum sobre a evidência funcional reproduzível já coletada para o candidato `6a8e4946`; o **NO-GO crítico** permanece válido.
- Owner operacional: **Administração do adaptador Paperclip** — trocar o modelo do `codex_local` ou aguardar a renovação da cota.
- Owner funcional: **Engenharia/Release** — corrigir persistência/correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- HOLD: não promover alias e não convidar coorte.

Disposição final da AID-200: `blocked`.
