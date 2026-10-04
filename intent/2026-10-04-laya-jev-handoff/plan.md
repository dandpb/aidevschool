# Plan — versionar e disponibilizar a retomada

**Status:** accepted under the user's explicit request to commit the existing work.

1. Copiar os artefatos existentes para `docs/research/laya-jev/`, sem arquivos secretos, caches ou venv.
2. Adaptar caminhos dos runners e documentar bootstrap e retomada; preservar corpus e logs históricos.
3. Gerar manifesto SHA-256. Verificar corpus (62 casos/220 perguntas/142 labels), execução offline sem pesos, análise das falhas e ausência de credenciais.
4. Fazer passes de REVIEW.md e simplificação, incluindo revisão independente exigida pela skill local.
5. Commitar numa branch dedicada e disponibilizá-la no origin quando houver acesso; não fazer merge.

## Provas

- Compilar os scripts Python e validar sintaxe shell.
- Executar `analyze.py` sobre as duas tentativas históricas: zero respostas reais, zero pares comparáveis.
- Validar manifesto, integridade do corpus e referências de caminho em outro checkout.
- Runner local sem pesos deve terminar com erro explícito, sem fabricar inferência.
- Revisão independente registra findings e resultado em `verification.md`.

## Risco

Não rerodar API ou download apenas para validar este handoff. Instalação/pesos dependem do acesso do próximo executor. O commit preserva evidência e código de retomada, sem modificar aplicações em produção.
