# PRD — contraexemplo 02: sem limite e sem cortes (contraexemplo de correção)

## Problema

O plano do dia sai na ordem de digitação; o time começa tarefa antes da
dependência e perde a manhã (PEDIDO.md).

## Usuário

Dev do time que roda o plano do dia no CLI.

## Objetivo

Resolver o pedido da Bia: plano ordenado por dependência, duração total,
pasta docs organizada, saída bonita com cores e suporte a Windows.

## Escopo

- Ordenar topologicamente por `depends_on` (estável).
- Exibir duração total.
- Renomear `docs/` para `archive/`.
- Relatório colorido (verde/amarelo) com resumão.
- Rodar bem no Windows.

## Fora de escopo

- Paralelismo e agenda por datas.

## Critérios de aceite

- [ ] `pytest testes/teste_plano.py` passa cobrindo ordem, ciclo (B1), dependência inexistente (B2) e lista vazia (B3).
- [ ] `python3 cli.py plano exemplos/tarefas.json` imprime plano ordenado e total, offline, determinístico.
- [ ] Nenhuma tarefa aparece antes de dependência dela na saída.
- [ ] Erros de B1/B2/B3 falham fechados com `ValueError` citando os `id`s.

## Riscos e decisões abertas

- Risco: amostra sem empates → caso novo na suíte.
