# CONTEXTO — Higiene de artefatos locais

## Incluído

- `.gitignore` da raiz;
- saída de `git status --short --untracked-files=all`;
- saída de `git check-ignore`;
- o script `verify_hygiene.py`;
- os nomes das quatro categorias de caminhos locais observados;
- o contrato do build piloto do OS, que explica por que os valores de build precisam ser declarados
  no `netlify.toml`, sem depender de um `.env` local.

## Excluído

- conteúdo de `.env.production`;
- `.mcp.json` e qualquer token de configuração;
- `node_modules/`, `dist/`, caches e logs;
- qualquer tentativa de limpar mudanças de outro trabalho;
- credenciais e valores de ambiente.

## Decisão de contexto

O problema desta fatia é versionamento acidental, não auditoria de segurança completa. Por isso,
o teste opera sobre caminhos e estado do Git, sem carregar valores sensíveis para o relatório.
