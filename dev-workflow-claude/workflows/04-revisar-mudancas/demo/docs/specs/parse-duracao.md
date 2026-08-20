# Spec: parse de durações

**Ideia vaga original:** "quero digitar tempos tipo 1h30m no CLI"

## Requisitos

| ID | Requisito | Critério de aceite |
|----|-----------|--------------------|
| REQ-1 | `parseDuracao(texto)` aceita horas (`"2h"`), minutos (`"45m"`) e composto (`"1h30m"`), retornando o total em minutos | `"2h"` → 120 · `"45m"` → 45 · `"1h30m"` → 90 |
| REQ-2 | Entrada inválida lança `Error` com mensagem citando o texto recebido | `"abc"`, `""`, `"h30"`, `"30"`, `"1m30h"` lançam `Error`; a mensagem para `"abc"` contém `abc` |
| REQ-3 | `formatDuracao(minutos)` faz o caminho inverso | 90 → `"1h30m"` · 120 → `"2h"` · 45 → `"45m"` |
| REQ-4 | CLI soma múltiplas durações e imprime o total formatado | `node src/cli.js 1h30m 45m` imprime `Total: 2h15m` |

## Fora de escopo

Dias (`"1d"`), segundos, números decimais, persistência.
