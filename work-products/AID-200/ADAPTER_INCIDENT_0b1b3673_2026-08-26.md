# AID-200 — incidente operacional do adaptador

Data: 2026-08-26 UTC
Run: `0b1b3673-7844-4312-8068-4de3f552f412`

## Ocorrência

O run encerrou em 2026-08-26T10:46:29.324Z com `adapter_failed`: limite de uso do GPT-5.3-Codex-Spark atingido; renovação informada para 2026-08-31T00:06:00Z.

## Classificação e impacto

- Falha operacional isolada do adaptador, posterior à QA funcional já concluída.
- Nenhuma nova execução em Chromium, evidência funcional ou alteração do candidato foi produzida.
- A decisão permanece **NO-GO crítico — `blocked`**.

## Desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar nova QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- **HOLD:** não promover alias nem convidar coorte.

