# PRD — contraexemplo 03: aceite vago (contraexemplo de correção)

## Problema

O plano do dia sai na ordem de digitação; o time começa tarefa antes da
dependência e perde a manhã (PEDIDO.md).

## Usuário

Dev do time que roda o plano do dia no CLI.

## Objetivo

Plano ordenado por `depends_on` com duração total.

## Limite

Tarefa de até 30 min.

## Escopo

- Ordenar topologicamente por `depends_on` (estável).
- Exibir duração total.

## Fora de escopo

- Renomear `docs/` → `archive/`.
- Relatório colorido no terminal.
- Suporte a Windows.

## Critérios de aceite

- [ ] Ficar bonito.
- [ ] Não quebrar nada.

## Riscos e decisões abertas

- Risco: amostra sem empates → caso novo na suíte.
