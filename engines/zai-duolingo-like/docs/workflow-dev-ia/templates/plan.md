# Plano de execução — [feature]

> Usado no Build Mode. Cada passo termina numa verificação; se a verificação
> falhar, diagnosticar antes de mudar de abordagem (nunca retry no escuro).

## Estado inicial

- Branch: `[branch]`
- Testes passando antes de começar? `npm test` → [sim/não]

## Passos

| # | Ação | Arquivos | Verificação ao final do passo |
|---|---|---|---|
| 1 | _escrever teste que falha (red)_ | `tests/...` | `vitest run tests/...` falha pelo motivo certo |
| 2 | _implementar o mínimo (green)_ | `src/...` | mesmo comando passa |
| 3 | _integrar/limpar (refactor)_ | `src/...` | suíte completa `npm test` passa |
| 4 | _padrões_ | — | `npm run lint` + `npx tsc --noEmit` limpos |

## Fora de escopo durante a execução

- _nada de "aproveitar e..." — desvios viram nova spec_

## Rollback

- `git stash` / reverter commit — nada de apagar trabalho alheio.
