# Design A — "State Hub" (restrição: máxima flexibilidade)

> Subagente do exercício DESIGN-IT-TWICE (2026-08-16). Veredito e comparação: ver README.md desta pasta.

Interface de 4 entry points, cada um pagando seu custo:

- **snapshot(query)** — leitura PURA com fatias (`slices`), seleção de campos (`fields`) e sujeito
  (`subject: "current" | { id }`) — pronto para multi-learner/rivais sem mudar o contrato.
- **settle()** — separa os efeitos colaterais (regen de hearts, reset de liga) da leitura;
  idempotente; ordering constraint documentada (`settle → snapshot`, senão `stale: true`).
- **signals(cursor)** — canal de eventos ordenado por `seq` com payload opaco: novos sinais
  (toasts, resets futuros) são aditivos, nunca breaking.
- **subscribe?** — opcional, hoje com adapter de polling (seam hipotética que não infla quem não usa).

Anti-drift: tipos num único arquivo importado por servidor e cliente + error mode `unknown_field`
fail-fast (o bug leagueXp vira erro explícito). Relógio: `Clock` injetado na construção; `FakeClock`
nos testes. Error modes exaustivos via `Result<T>` com union discriminada
(`learner_not_found`, `unknown_field`, `forbidden_slice`, `stale_cursor`, `internal`).

Trade-offs: leverage alto no snapshot(query) para callers heterogêneos; leverage fino em subscribe
(um adapter); settle separado adiciona round-trip e a única ordering constraint dos 4 designs.
Fora: mutações (read-side only), push realtime, paginação histórica de sinais.
