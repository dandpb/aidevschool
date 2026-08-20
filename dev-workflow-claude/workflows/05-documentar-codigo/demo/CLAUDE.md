# tempo-doc-demo — CLI de time tracking (projeto exemplo do /documentar)

## Comandos
- Testes: `npm test` (node:test embutido + doc-test de `API.md` — zero dependências)
- Doc-test isolado: `node tools/doctest.mjs API.md`
- Rodar: `node src/cli.js <durações...>` — ex.: `node src/cli.js 1h30m 45m`

## Regras do projeto
1. Toda função pública documentada em `API.md` com exemplos executáveis (`// =>`).
2. Documentação que mente quebra o build: o doc-test roda dentro do `npm test`.
3. Zero dependências externas; apenas stdlib do Node.
