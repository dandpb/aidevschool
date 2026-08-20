# tempo-relatorios — CLI de time tracking com relatórios (projeto demo)

## Comandos
- Testes de regressão: `npm test` (node:test embutido — zero dependências)
- Somar durações: `node src/cli.js 1h30m 45m`
- Painel (simula refresh de dashboard): `node src/painel.js cliente-a 3`
- Reprodução mínima do bug investigado: `node --test test/reproducao-bug.test.js` (FALHA de propósito — ver `DIAGNOSTICO.md`)

## Regras do projeto
1. Zero dependências externas; apenas stdlib do Node.
2. Erro confuso → rode `/investigar` antes de mexer no código; o diagnóstico (`DIAGNOSTICO.md`) é o entregável, a correção é outro fluxo.
3. Todo bug diagnosticado deixa uma reprodução mínima como teste em `test/`.
