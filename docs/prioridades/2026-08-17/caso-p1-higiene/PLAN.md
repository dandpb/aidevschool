# PLAN — Higiene de artefatos locais

## Plan Mode — sem editar

### Diagnóstico

Há artefatos locais não rastreados e sem regra de ignore. O menor conserto é uma regra explícita
na raiz e um teste de contrato do repositório. `.env.production` também deve ser ignorado; o build
versionável deve obter suas URLs do `netlify.toml`, não do arquivo local.

### Etapas

1. Escrever `verify_hygiene.py` e executar antes da correção.
2. Registrar a falha real da verificação.
3. Adicionar regras mínimas ao `.gitignore`.
4. Executar novamente o verificador.
5. Rodar `git diff --check` e confirmar que os arquivos continuam não rastreados, porém ignorados.

### Não-metas

Não deletar, commitar, rotacionar segredo ou reorganizar o working tree inteiro.
