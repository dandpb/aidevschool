# BUG-001 — CLI aceita duração malformada "1hm" em vez de dar erro

**Relatado por:** usuária final (via suporte)
**Data:** 2026-08-19

## Sintoma observado

Registrei minhas horas com:

```
node src/cli.js 2h 1hm 30m
```

O `1hm` era um typo — eu quis digitar `1h5m` e o dígito ficou de fora. Esperava que a
CLI rejeitasse a entrada com erro (como faz com `abc` ou `h30`), mas ela **aceitou em
silêncio** e imprimiu:

```
Total: 3h30m
```

Ou seja: o typo virou 1h a mais no meu registro de horas sem nenhum aviso.

## Comportamento esperado

Qualquer duração com `m` sem dígitos antes (`1hm`, `2hm`, `hm` dentro de composto) deve
ser rejeitada com a mensagem de erro padrão (`Duração inválida: "1hm" ...`) e exit code 1,
como já acontece com as demais entradas malformadas.
