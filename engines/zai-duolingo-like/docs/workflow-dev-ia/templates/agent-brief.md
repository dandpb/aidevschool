# Brief de subagente — [tarefa]

> Delegar sem perder o controle: o agente recebe missão, fronteiras e
> definição de pronto. Ele NÃO precisa (nem deve) redesenhar o mundo.

## Missão (1 frase)

_O que ele entrega. Ex.: "Escrever os testes de X seguindo o padrão Y"._

## Contexto mínimo

- Arquivos que ele DEVE ler antes: `[caminhos]`
- Convenções do repo que ele deve imitar: `[arquivo-modelo]`
- O que já foi tentado/descartado: `[...]`

## Fronteiras

- Pode modificar: `[caminhos]`
- NÃO pode modificar: `[caminhos — ex.: schema, config, código fora do escopo]`
- Não adicionar dependências sem aprovação.

## Definição de pronto

1. _entregável concreto (arquivo, teste passando)_
2. _comando de verificação que ele mesmo roda e reporta a saída_

## Formato da resposta

- Curto: o que fez, o que validou (com saída real), o que ficou pendente.
