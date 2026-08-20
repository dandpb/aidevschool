# tempo — CLI de time tracking (projeto exemplo)

## Comandos
- Testes: `npm test` (node:test embutido — zero dependências)
- Rodar: `node src/cli.js <durações...>` — ex.: `node src/cli.js 1h30m 45m`

## Regras do projeto
1. Toda feature nasce de uma spec em `docs/specs/`.
2. Testes primeiro: nenhuma implementação sem ver os testes falharem antes (vermelho → verde).
3. Zero dependências externas; apenas stdlib do Node.
4. Produtor ≠ verificador: peça auditoria independente antes de dar por pronto.
5. Mensagens de commit em inglês, referenciando a spec — ex.: `feat: duration parser (spec parse-duracao)`.

## Regras aprendidas (retro de 2026-08-19 — /aprender)
6. Nunca instale pacotes npm: `package.json` não pode ter `dependencies` nem `devDependencies` (checado por `tools/checar-regras.sh`).
7. Rode `npm test` e cole a saída antes de declarar qualquer tarefa como pronta (o script `test` deve existir e executar `node --test`; checado por `tools/checar-regras.sh`).
