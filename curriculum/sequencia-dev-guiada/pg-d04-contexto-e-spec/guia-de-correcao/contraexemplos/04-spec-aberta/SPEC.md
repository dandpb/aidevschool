# SPEC — contraexemplo 04: spec aberta, sem allowlist (contraexemplo de correção)

> Sem Arquivos permitidos, com uma borda só e sem não-metas: a solução
> pode "aproveitar e mexer" onde não deve — é o espaço que uma spec aberta
> deixa para extrapolar.

## Estado atual → estado desejado

Hoje `plano.py` ordena por ordem de inserção. Meta: ordem topológica
estável com duração total.

## Interface

```python
ordenar(tarefas: list[Tarefa]) -> list[Tarefa]
duracao_total(tarefas: list[Tarefa]) -> int
```

## Casos de borda

1. Empate entre tarefas liberadas na mesma rodada: ordem de inserção.

## Estratégia de teste

Testes na suíte existente com a amostra fixa.
