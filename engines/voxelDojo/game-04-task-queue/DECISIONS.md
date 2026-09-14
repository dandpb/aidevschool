# TASK FORGE (game-04-task-queue) — decisões de engine

ADRs curtos, dono: Learning Engine Engineer. Referência: plano
`engines/pixelDojo/docs/plans/04_concurrent_task_queue.md` (decisão CEO AID-1859 Opção A).

## ADR-1 — Cadência turn-based determinística (não tempo real)

**Status:** accepted (PR-A1 AID-1901)

**Contexto.** O plano §4 descreve o loop "onda ~30s" com forklifts a cada ~1,5s. Um relógio de
tempo real tornaria a onda irreproduzível em teste e o smoke frágil (races de timing).

**Decisão.** Cada ação do jogador avança o clock do sim exatamente 1 beat; eventos automáticos
(conclusões, atracações, countdowns) rodam entre ações em `settle()`, que auto-avança beats
apenas enquanto nenhuma decisão está disponível. Consequências:

- mesma sequência de ações ⇒ mesma onda, mesmas métricas, mesma evidência (invariante do engine);
- WORK_BEATS=3 fixo por braço, DOCK_WINDOW=2 beats por forklift (constantes em `sim/levels.ts`);
- `P` (pausa) congela conclusões/despachos mas NÃO atracações — a fila continua aceitando
  (RF-006: pausado ≠ quebrado, status 200);
- despachar drena o funil e pode evitar um 429 que seria obrigatório — admissão decide a
  capacidade no momento da atracação, como num broker real.

**Alternativas.** (a) tempo real com `requestAnimationFrame` — rejeitada: não determinística;
(b) estritamente uma decisão por vez sem beats automáticos — rejeitada: countdowns de
backoff nunca drenariam sem o jogador martelando ações.

## ADR-2 — Classificação errada de poison não trava a onda

**Status:** accepted (PR-A1 AID-1901)

**Contexto.** Re-enfileirar poison é a patologia canônica de filas (loop infinito). O pass rule
já pune (`poison_requeued == 0`), mas a onda precisa terminar para emitir evidência.

**Decisão.** Um poison re-enfileirado erradamente volta ao funil com orçamento forçado além de
`max_retries`; a próxima conclusão apresenta DLQ de novo. A onda termina, a violação fica
registrada na métrica e o gate mantém-se fechado. Nenhuma masterização é escrita pelo jogo.
