# AID-200 — incidente operacional do adaptador

Data: 2026-08-26 UTC
Run: `cc3aaf72-7368-4adf-8601-f949e5937e12`

## Ocorrência

O run encerrou em `2026-08-26T10:20:11.538Z` com `adapter_failed`: o GPT-5.3-Codex-Spark atingiu o limite de uso, com renovação indicada para `2026-08-31T00:06:00Z`.

## Classificação e impacto

- Falha operacional isolada do adaptador; nenhuma nova execução funcional ou evidência do candidato foi produzida.
- A evidência independente existente permanece válida e a decisão não muda: **NO-GO crítico — `blocked`**.
- Não há continuação viva para o candidato imutável `6a8e4946`; o reteste depende de novo permalink após correção.

## Owners e desbloqueio

- **Engenharia/Release:** corrigir persistência e correlação por tentativa, publicar novo candidato imutável e solicitar QA independente.
- **Administração do adaptador Paperclip:** trocar o modelo ou aguardar a renovação da cota.
- **HOLD:** não promover alias nem convidar coorte.
