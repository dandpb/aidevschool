# Spec — [nome da feature]

> A spec transforma o PRD em contrato executável. Cada requisito precisa ser
> verificável; cada critério de aceite vira um teste automatizado.

## 1. Contexto (por quê)

_Um parágrafo: estado atual, gap, por que agora. Link para o PRD se existir._

## 2. Escopo

**Dentro:**
- _comportamento 1_
- _comportamento 2_

**Fora (próximos passos, não nesta spec):**
- _o que fica para depois_

## 3. Requisitos (contrato)

| # | Requisito | Detalhe |
|---|---|---|
| R1 | _entrada válida é aceita_ | `POST { x }` → `200 { ... }` e efeito persistido |
| R2 | _entrada inválida é rejeitada_ | `POST { y }` → `400 { error: "..." }`, nada persistido |
| R3 | _caso limite_ | _comportamento esperado_ |

## 4. Critérios de aceite (viram testes)

1. _arquivo de teste + comportamento coberto_
2. _..._

## 5. Plano de execução

1. _arquivo a criar/alterar + convenção a seguir (aponte um arquivo existente como modelo)_
2. _testes a escrever + padrão existente a imitar_
3. _comandos de validação: `npm test`, `npm run lint`, `npx tsc --noEmit`_
4. _registrar o resultado na seção 6_

## 6. Resultado da execução

_(preencher após executar: arquivos entregues, saída real dos comandos, critérios cobertos)_
