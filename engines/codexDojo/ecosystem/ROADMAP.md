# codexDojo Roadmap

The first 10 projects follow the user's requested progression. Each project is small enough to complete, verify, review, compare, and use as input to the next one.

## First 10 Projects

| # | Project | Main learning goal | Primary stack | Evidence |
| --- | --- | --- | --- | --- |
| 1 | CLI de tarefas em Python | Separate CLI, domain, persistence, and tests. | Python | CLI commands, unit tests, README. |
| 2 | API REST de tarefas com FastAPI | Convert a local domain into an HTTP contract. | Python, FastAPI | OpenAPI, integration tests, error cases. |
| 3 | Same API in Node.js/TypeScript | Compare Python and TypeScript ergonomics. | TypeScript, Hono or Express | Equivalent tests, comparison report. |
| 4 | PostgreSQL persistence | Learn schema, migrations, and real DB tests. | PostgreSQL, SQL tooling | Migrations, testcontainers, rollback notes. |
| 5 | Authentication | Separate identity, session, authorization, and audit. | JWT or session auth | Access-denied tests, threat model. |
| 6 | Tests and CI/CD | Turn quality gates into automation. | CI, shell, test runners | CI pipeline, failing regression proof. |
| 7 | Redis cache | Measure latency, staleness, and invalidation. | Redis | Before/after benchmark, failure simulation. |
| 8 | Async queue | Learn retries, DLQ, idempotency, and backpressure. | Go or TypeScript queue | Worker tests, throughput metric. |
| 9 | Observability | Diagnose behavior from logs, metrics, and traces. | OpenTelemetry | Trace, dashboard, alert runbook. |
| 10 | AI task-analysis agent | Use AI as a professional review assistant. | TypeScript, LLM workflow | Prompt tests, evals, non-AI fallback. |

## Project Package Structure

```text
curriculum/NN_project_name/
  README.md
  docs/
    spec.md
    architecture.md
    code_review.md
    technology_comparison.md
    benchmark_results.md
    learning_notes.md
    evolution_report.md
  <language>-impl/
    src/
    tests/
    README.md
  benchmarks/
    scripts/
    results/
  reports/
    cycle_report.md
```

## Increment Rule

A project may add only one main dimension of complexity at a time:

- Interface complexity: CLI -> HTTP -> dashboard.
- Data complexity: file -> SQL -> cache -> queue.
- Operational complexity: local run -> CI -> Docker -> deploy -> observability.
- Architecture complexity: simple module -> modular monolith -> event-driven -> service split.
- AI complexity: prompt helper -> tool workflow -> RAG -> eval harness -> agent orchestration.

## Refactoring And Legacy Migration Track

Every third project includes a legacy-style exercise:

| Project | Legacy/refactoring angle |
| --- | --- |
| 3 | Port behavior from Python API to TypeScript without changing contract. |
| 6 | Add CI to an existing project without rewriting it. |
| 9 | Add observability to existing code without changing business behavior. |

This keeps the roadmap aligned with real engineering work, not only greenfield building.
