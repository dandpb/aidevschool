# DIAGNOSTICO — total do relatório diminui a cada refresh do painel

Investigação conduzida com `/investigar` em 2026-08-19. **Nenhum código de produção foi alterado**; o entregável é este diagnóstico + o teste de reprodução mínima.

## Sintoma

O painel mostra totais diferentes para o MESMO projeto a cada refresh, sempre 1h a menos. Determinístico dentro de um processo (não é flaky), e a suíte de regressão passa 6/6.

```
$ node src/painel.js cliente-a 3
[refresh 1] cliente-a: 3 sessões, 6h30m trabalhadas
[refresh 2] cliente-a: 3 sessões, 5h30m trabalhadas
[refresh 3] cliente-a: 3 sessões, 4h30m trabalhadas
```

Valor correto (2h30m + 3h + 2h − 1h de pausas): **6h30m**, sempre.

## Causa raiz

**`src/sessoes.js:28` devolve a MESMA referência do objeto cacheado, e `src/relatorio.js:7` a muta** (`resumo.minutos -= resumo.pausas`). Cada chamada de `gerarRelatorio` subtrai as pausas de novo do objeto compartilhado do cache: 450 → 390 → 330 → 270 minutos.

O sintoma aparece longe da causa: o número errado sai em `painel.js`, o desconto é feito em `relatorio.js`, mas o defeito é o contrato implícito do cache em `sessoes.js` (entregar referência viva em vez de cópia). Por isso a suíte passa — cada arquivo de teste roda num processo novo e chama o relatório uma única vez.

## Hipóteses (ranqueadas) e experimentos

### H1 — desconto de pausas aplicado mais de uma vez sobre estado que vive no processo · CONFIRMADA

Experimento E-3 (isolar a variável "processo"):

```
--- mesmo processo, 2 chamadas:
1a: cliente-a: 3 sessões, 6h30m trabalhadas
2a: cliente-a: 3 sessões, 5h30m trabalhadas
--- processos separados, 1 chamada cada:
proc A: cliente-a: 3 sessões, 6h30m trabalhadas
proc B: cliente-a: 3 sessões, 6h30m trabalhadas
```

O estado errado vive na memória do processo, não nos dados. Experimento E-4 (apontar o mecanismo):

```
mesma referência entre chamadas? true
minutos antes do relatório : 450
minutos depois do relatório: 390 (objeto do cache foi mutado)
```

### H2 — parse de duração instável ou dados das sessões variando entre leituras · DESCARTADA

Experimento E-1 (o mais barato — one-liner somando as sessões cruas duas vezes):

```
rodada 1: minutos=450 pausas=60 inteiros=true
rodada 2: minutos=450 pausas=60 inteiros=true
```

Parse determinístico e somas idênticas entre rodadas.

### H3 — acúmulo de erro de ponto flutuante na soma dos minutos · DESCARTADA

Mesmo experimento E-1: todos os valores são inteiros (`inteiros=true`) — `parseDuracao` só produz minutos inteiros, não há aritmética fracionária para acumular erro.

## Reprodução mínima

`test/reproducao-bug.test.js` — duas chamadas de `gerarRelatorio('cliente-a')` devem ser iguais. Saída real:

```
$ node --test test/reproducao-bug.test.js
not ok 1 - reprodução mínima: relatório do mesmo projeto é estável entre chamadas
    + actual - expected
    + 'cliente-a: 3 sessões, 5h30m trabalhadas'
    - 'cliente-a: 3 sessões, 6h30m trabalhadas'
# pass 0
# fail 1
```

A correção estará certa quando este teste passar sem ser alterado.

## Correção sugerida (NÃO implementada — outro fluxo)

Opções, da mais robusta à mais pontual:

1. **`sessoes.js` devolver cópia** (`return { ...cache.get(projeto) }`) ou objeto congelado (`Object.freeze`) — conserta a classe inteira de bugs: nenhum chamador consegue corromper o cache. `Object.freeze` em modo estrito ainda faria a mutação lançar `TypeError` na origem.
2. **`relatorio.js` não mutar o resumo**: calcular `const minutos = descontarPausas ? resumo.minutos - resumo.pausas : resumo.minutos` — conserta este sintoma, mas deixa o contrato frágil do cache para o próximo chamador.
