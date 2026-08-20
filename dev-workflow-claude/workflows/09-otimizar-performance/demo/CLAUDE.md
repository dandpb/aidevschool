# tempo-otimizar-demo — CLI de time tracking (demo do workflow /otimizar)

## Comandos
- Testes: `npm test` (node:test embutido — zero dependências)
- Benchmark: `node bench/duplicadas.bench.js` (node:perf_hooks, N fixo, 5 rodadas, mediana)
- Rodar: `node src/cli.js <durações...>` — ex.: `node src/cli.js 1h30m 45m`

## Regras do projeto
1. Nenhuma otimização sem medição — use o comando `/otimizar` (benchmark antes → mudança → benchmark depois → suíte verde).
2. Zero dependências externas; apenas stdlib do Node.
3. Comportamento é protegido por testes: otimização não pode mudar saída observável.
