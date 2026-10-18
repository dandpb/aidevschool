# SPEC — Ordenação topológica estável do plano (`rodadia`, fictício)

## Estado atual → estado desejado

Hoje `plano.py` ordena por ordem de inserção e ignora `depends_on`. Meta:
ordenação topológica estável com duração total, Python puro, sem novas
dependências.

## Interface

```python
from plano import ordenar, duracao_total

ordenar(tarefas: list[Tarefa]) -> list[Tarefa]
# devolve as mesmas tarefas (sem copiar modelos) em ordem topológica;
# empate entre tarefas liberadas na mesma rodada: ordem de inserção.

duracao_total(tarefas: list[Tarefa]) -> int
# soma de `duracao_min` (inteiros positivos) — independe da ordem.
```

CLI inalterado: `python3 cli.py plano exemplos/tarefas.json` passa a
imprimir a ordem nova + a linha `total: <N> min` no fim.

### Erros (falha fechada)

- Ciclo em `depends_on` → `ValueError` citando os `id`s do ciclo (B1).
- Dependência inexistente citada (`depends_on` com `id` fora da lista) →
  `ValueError` citando o `id` da tarefa e a dependência desconhecida (B2).
- Lista vazia → `ValueError("sem tarefas")` (B3).

## Casos de borda

1. **B1** — `a` depende de `b` e `b` depende de `a` (inclui autodependência
   `a`→`a`): erro com os `id`s do ciclo; nunca ordem parcial silenciosa.
2. **B2** — `depends_on: ["deploy"]` sem `deploy` na lista: erro citando
   tarefa e dependência inexistente; nunca ignorar/dropar a aresta.
3. **B3** — lista vazia: erro `ValueError("sem tarefas")`; nunca plano vazio.
4. Empate — duas tarefas liberadas na mesma rodada: ordem de inserção no
   arquivo (saída determinística; mesma entrada, mesma saída).
5. `depends_on: []` em todas: ordem de inserção pura (caminho feliz mínimo).

## Arquivos permitidos (allowlist)

- `plano.py`
- `testes/teste_plano.py`

Nada além (não mexer em `cli.py`, `tarefa.py`, `CONTRATO.md`, docs/, nem
criar arquivos novos).

## Estratégia de teste

`pytest` na suíte existente + casos novos na mesma família: ordem correta na
amostra fixa, empate estável, B1/B2/B3 com `pytest.raises` citando `id`s,
duracao_total com lista da amostra. Sem rede, stdlib apenas.

## Ordem de implementação

1. `ordenar` com validação B1/B2/B3 + testes de erro.
2. Empate estável + teste de determinismo (duas chamadas, saídas idênticas).
3. `duracao_total` + linha `total:` no CLI (leitura only) + teste da amostra.

## Não-metas

- Não paraleliza tarefas, não agenda por datas, não desenha cores no
  terminal, não renomeia pastas, não detecta plataforma/Windows.
- Não reescreve o modelo `Tarefa` nem a CLI.
