# exemplo-pratico — tempo

Projeto-exemplo da Parte 10 do guia (`../index.html`): CLI de time tracking em Node
puro, usado para demonstrar o workflow permanente spec → testes → implementação →
verificação. Os ativos permanentes vivem em `.claude/` e `docs/specs/`.

- `npm test` — roda a suíte (node:test, zero dependências)
- `node src/cli.js 1h30m 45m` — soma durações e imprime o total

## Como reproduzir

```bash
cd exemplo-pratico && npm test && node src/cli.js 1h30m 45m
```
