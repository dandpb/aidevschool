# tempo — CLI de time tracking (projeto exemplo)

## Comandos
- Testes: `npm test` (node:test embutido — zero dependências)
- Rodar: `node src/cli.js <durações...>` — ex.: `node src/cli.js 1h30m 45m 1d`; ajuda: `node src/cli.js --help`

## Regras do projeto
1. Toda feature nasce de uma spec em `docs/specs/`.
2. Testes primeiro: nenhuma implementação sem ver os testes falharem antes (vermelho → verde).
3. Zero dependências externas; apenas stdlib do Node.
4. Produtor ≠ verificador: peça auditoria independente antes de dar por pronto.
5. Mensagens de commit em inglês, referenciando a spec — ex.: `feat: duration parser (spec parse-duracao)`.
