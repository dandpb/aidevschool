# AID-200 — incidente operacional do adaptador

Data: 2026-08-26 UTC

- Run: `c95ac79a-1655-486a-b205-f6a676a4151d`
- Encerramento: 2026-08-26T11:06:46.195Z
- Status: `failed` / `adapter_failed`
- Causa informada: limite de uso do GPT-5.3-Codex-Spark; troca de modelo ou renovação em 2026-08-31T00:06:00Z necessária.
- Evidência funcional produzida: nenhuma.
- Impacto na QA: nenhum; permanece o NO-GO crítico do candidato imutável `6a8e4946`.

## Disposição

- Owner operacional: Administração do adaptador Paperclip — trocar o modelo ou aguardar a renovação da cota.
- Owner funcional: Engenharia/Release — corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- HOLD: não promover alias nem convidar coorte.
