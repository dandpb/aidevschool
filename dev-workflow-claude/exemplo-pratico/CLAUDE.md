# tempo — CLI de time tracking (projeto exemplo)

## Comandos
- Testes: `npm test` (node:test embutido — zero dependências)
- Rodar: `node src/cli.js <durações...>` — ex.: `node src/cli.js 1h30m 45m`

## Regras do projeto
1. Toda feature nasce de uma spec em `docs/specs/` — use o comando `/nova-feature`.
2. Testes primeiro: nenhuma implementação sem ver os testes falharem antes (vermelho → verde).
3. Zero dependências externas; apenas stdlib do Node.
4. Produtor ≠ verificador: antes de dar por pronto, delegue a auditoria ao subagente `verificador`.
5. Mensagens de commit em inglês, referenciando a spec — ex.: `feat: duration parser (spec parse-duracao)`.
