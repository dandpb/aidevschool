# Empirical Mutation Gate — Project 01 Node impl

> Owner: **Prometor** (verifier) · Tool: Stryker (objective, reproducible — not self-assessment)
> Date: 2026-06-27 · Target: mutation score ≥ 60% (per `learner/learning_state.yaml` → `empirical_gate.mutation_min`)

## Verdict: **PASS — 71.05%** (break threshold 60)

The 91.86% line coverage previously reported only proved lines *executed*. This gate proves the
suite actually *catches* injected faults. 373 mutants generated across 7 library files.

| Status | Count |
| --- | ---: |
| Killed | 263 |
| Timeout (counts as killed) | 2 |
| Survived | 78 |
| No coverage | 30 |
| **Mutation score** | **71.05%** |

## Per-file breakdown

| File | Score | Killed | Survived | NoCov |
| --- | ---: | ---: | ---: | ---: |
| `responseComposer.ts` | 100.0% | 16 | 0 | 0 |
| `rateLimiter.ts` (core) | 78.3% | 88 | 22 | 3 |
| `clientKeyStrategy.ts` | 75.8% | 25 | 8 | 0 |
| `config.ts` | 70.1% | 61 | 23 | 3 |
| `index.ts` | 63.6% | 70 | 18 | 22 |
| `errors.ts` | 40.0% | 2 | 1 | 2 |
| `logger.ts` | 14.3% | 1 | 6 | 0 |

## Honest weak spots (surviving-mutant clusters)

1. **`logger.ts` (14%)** — pino logging is never asserted; mutating log strings/levels survives. Low pedagogical value; candidate to exclude from the `mutate` set or accept as-is.
2. **`index.ts` server bootstrap (22 no-coverage)** — `listen`, `ERR_SERVER_NOT_RUNNING`, graceful-shutdown path (lines ~115–187) are process-entry code, the same class the coverage gate excludes via `main.ts`. Not exercised by the in-process supertest suite.
3. **`config.ts` (23 survived)** — env-var error *messages* and default literals aren't asserted exactly; tests check behavior but not the precise strings.
4. **`clientKeyStrategy.ts` / `index.ts` IPv6 regex** — the `::ffff:` IPv4-mapped normalization regex survives boundary mutations; needs a test with a real IPv4-mapped IPv6 address.

These are the highest-value targets if the score is pushed toward the 70–80% band — and good raw material for the learner's diagnostic Task 1 ("tests the existing suite doesn't have").

## Reproduce

```bash
cd curriculum/01_rate_limiter/node-impl
npm install        # first time only (adds @stryker-mutator/core + vitest-runner)
npm run test:mutation
# HTML report: reports/mutation/mutation.html
```

## Scope boundary (explicit)

- This gate measures **test quality of the pre-existing Node impl**. It is empirical evidence only.
- It does **NOT** unblock the learning gate (`gate.implementation_blocked` stays `true`; only the
  learner's evaluated diagnostic attempt flips it — see AD-003, golden rule #1).
- It does **NOT** mark U0 `mastered`. No `units_log` mastery entry is created.
