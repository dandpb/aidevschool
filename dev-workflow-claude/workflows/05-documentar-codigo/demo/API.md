# API — tempo

Documentação da API pública de `src/duracao.js`. Todos os exemplos abaixo são
executados por `tools/doctest.mjs` — se um exemplo mentir, o `npm test` quebra.

## `parseDuracao(texto) → number`

Converte uma duração textual (`"2h"`, `"45m"`, `"1h30m"`) em minutos totais.
Lança `Error` para qualquer formato fora do padrão `NhNm`.

```js
import { parseDuracao } from './src/duracao.js';

parseDuracao('2h')      // => 120
parseDuracao('45m')     // => 45
parseDuracao('1h30m')   // => 90
parseDuracao('0m')      // => 0
parseDuracao('90m')     // => 90
parseDuracao('banana')  // => throws
parseDuracao('')        // => throws
```

## `formatDuracao(minutos) → string`

Formata minutos totais de volta para o formato compacto `NhNm`,
omitindo a parte que for zero.

```js
import { formatDuracao } from './src/duracao.js';

formatDuracao(120) // => '2h'
formatDuracao(45)  // => '45m'
formatDuracao(90)  // => '1h30m'
formatDuracao(0)   // => '0m'
```
