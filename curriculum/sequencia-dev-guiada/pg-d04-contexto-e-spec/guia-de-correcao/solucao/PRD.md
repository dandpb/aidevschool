# PRD — Plano do dia em ordem de dependência (`rodadia`, fictício)

## Problema

O plano do dia sai na ordem em que as tarefas foram digitadas; o time começa
`relatorio` antes de `dados` estar pronto e perde a manhã retrabalhando —
dor relatada pela líder técnica (PEDIDO.md, terça 09:12).

## Usuário

Dev do time que roda o plano do dia no CLI e precisa saber **em que ordem**
executar e **quanto** o dia soma.

## Objetivo

O plano do dia ordena as tarefas respeitando `depends_on` (ordem estável:
empate decide a ordem de inserção no arquivo) e exibe a duração total em
minutos.

## Limite

**Tarefa de até 30 min** (uma sessão de implementação, cadência da escola).
Se não cabe em 30 min, o escopo está grande — corte, não estique.

## Escopo

- Ordenar topologicamente as tarefas por `depends_on` (DAG).
- Empate entre tarefas liberadas na mesma rodada: ordem de inserção (estável).
- Exibir a duração total do plano (soma de `duracao_min`).

## Fora de escopo (cortes do pedido da Bia)

- Renomear `docs/` → `archive/`: organização de repo é outra entrega (o
  workflow_lab faz renomes num ciclo separado do DAG por esse motivo).
- Relatório colorido no terminal (verde/amarelo + resumão): cosmético,
  não resolve a dor de ordem errada.
- Suporte a Windows ("notebook da Marta"): plataforma nova é investimento
  em compatibilidade, não parte da ordenação.
- Paralelismo/múltiplas estações de trabalho, datas/agenda: não pedidos
  pela dor real.

## Critérios de aceite

- [ ] `pytest testes/teste_plano.py` passa cobrindo: ordem topológica,
  empate por ordem de inserção, ciclo (B1), dependência inexistente (B2),
  lista vazia (B3).
- [ ] `python3 cli.py plano exemplos/tarefas.json` imprime o plano ordenado
  e a duração total, offline, com a mesma entrada produzindo a mesma saída.
- [ ] Nenhuma tarefa aparece antes de uma dependência dela na saída
  (invariante verificável linha a linha).
- [ ] Erros de B1/B2/B3 falham fechados com `ValueError` citando os `id`s
  envolvidos — nenhuma ordenação silenciosamente incompleta.

## Riscos e decisões abertas

- Risco: amostra `exemplos/tarefas.json` não cobrir empates → mitigar com
  caso novo na suíte (custo incluído nos 30 min).
- Decisão fechada: lista vazia é erro (`ValueError`), não plano vazio —
  falhar fechado é mais seguro que dia "vazio" sem explicação (mesma doutrina
  do SPEC real do workflow-exemplo).
