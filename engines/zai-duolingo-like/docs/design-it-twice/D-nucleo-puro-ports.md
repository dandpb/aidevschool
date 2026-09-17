# Design D — "Núcleo puro + Ports & Adapters" (restrição: ports & adapters)

> Subagente do exercício DESIGN-IT-TWICE (2026-08-16). Veredito e comparação: ver README.md desta pasta.

**1 entry point de uso**: `sync()` → `{ snapshot, events }`, mais `createStateModule(ports)`
na composition root e 3 seletores puros (selectHearts/selectGems/selectStreak).

4 ports, cada um com exatamente 2 adapters reais (regra "um adapter = seam hipotética"):

| Port | Adapters |
|---|---|
| Clock | SystemClock (prod) / TestClock settable (teste) |
| LearnerStore | PrismaLearnerStore (transação p/ concorrência) / InMemoryLearnerStore |
| LeagueResetPort | WeeklyLeagueReset (política portada) / ScriptedLeagueReset (outcomes pré-programados) |
| ActivityLogPort | PrismaActivityLog / InMemoryActivityLog |

- **DomainEvent[]** por chamada (`hearts_regenerated`, `freeze_consumed`, `league_reset`) —
  canal honesto "o que aconteceu DESTA vez"; a UI reage sem conhecer o log.
- Invariantes: idempotência temporal (2ª chamada no mesmo instante → events: []), sem relógio
  escondido, snapshot sempre coerente (nada "fica certo na próxima chamada"), freeze derivado
  pelo núcleo, contrato único importado pela rota E pelo cliente.
- Error modes: `StateUnavailableError` tagged; falha do LeagueResetPort NÃO derruba o sync
  (reset é lazy, outcome vira "none").
- Rota HTTP rebaixada a adapter de 6 linhas — a seam real é o StateModule, testável sem Next.js.

Fora propositalmente: ports para funções puras (leagueForXp etc. ficam no núcleo recebendo `now`),
CQRS/event sourcing, invalidação granulosa, port de rede (nenhuma dependência remote-owned existe).
