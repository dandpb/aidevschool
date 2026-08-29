# VALIDAÇÃO — P1: higiene de artefatos locais

## Diagnóstico observado

A primeira execução do verificador, antes da correção do `.gitignore`, terminou com exit 1.
A saída completa daquele call não foi preservada; por isso não invento uma lista de caminhos.
O baseline reproduzível é que os quatro caminhos abaixo não eram reconhecidos no `.gitignore` do
`HEAD`:

```text
engines/codexdojo-os-prototype/.env.production
engines/codexdojo-os-prototype/.env.production.local
kimi-debug-session_-20260817-104125.zip
engines/codexdojo-os-prototype/test-results-pilot/
```

Os nomes foram usados somente como caminhos. Nenhum valor de ambiente foi aberto ou impresso no
relatório.

## Correção aplicada

O `.gitignore` da raiz agora cobre:

- `.env` e variantes `.env.*`, preservando `.env.example`;
- `kimi-debug-session_*.zip`;
- `**/test-results-pilot/`.

A regra impede versionamento acidental, mas não apaga os arquivos locais. O `.env.production`
do piloto continua existindo localmente, agora também fica ignorado, e exige revisão própria antes
de qualquer `git add`. As URLs versionáveis do build estão declaradas no `netlify.toml`; esta
mudança não aprova o conteúdo do arquivo local.

## GREEN — verificação final

Comando executado:

```bash
python3 docs/prioridades/2026-08-17/caso-p1-higiene/verify_hygiene.py
```

Saída real:

```text
hygiene verification: PASS
ignored paths: 4
tracked sensitive candidates: 0
values inspected: no
```

Também executei:

```bash
git check-ignore -v --no-index -- \
  engines/codexdojo-os-prototype/.env.production \
  engines/codexdojo-os-prototype/.env.production.local \
  kimi-debug-session_-20260817-104125.zip \
  engines/codexdojo-os-prototype/test-results-pilot/
git diff --check
```

Os quatro caminhos foram reconhecidos pelo Git e o `diff --check` terminou sem saída.

## Entregue de verdade

- Regra de ignore versionável na raiz.
- Verificador reproduzível que não lê valores sensíveis.
- Evidência de que candidatos não estão rastreados.

## Não entregue / limites

- Não fiz auditoria de conteúdo de `.env.production`.
- Não rotacionei credenciais.
- Não removi o zip nem os diretórios locais.
- Não provei que novos nomes de artefato serão cobertos automaticamente.
- `git status` continua contendo mudanças pré-existentes não relacionadas; a higiene deste caso
  não equivale a uma limpeza ou commit do working tree inteiro.

## Aprendizado promovido

Caminho local e conteúdo sensível são problemas diferentes. O primeiro pode ser protegido por
`.gitignore`; o segundo exige revisão de conteúdo e, se necessário, rotação de segredo.
