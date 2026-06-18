# codexDojo Curriculum Scope

This file maps the requested learning scope to concrete tracks. It prevents the ecosystem from becoming only a dashboard or only a polyglot benchmark lab.

## Programming Fundamentals Track

| Requested topic | How codexDojo teaches it |
| --- | --- |
| Logic | CLI and API exercises with explicit input/output contracts. |
| Data structures | Task lists, indexes, caches, queues, search, and graph-style workflow dependencies. |
| Algorithms | Rate limiting, scheduling, retry/backoff, ranking, cache eviction, queue processing. |
| Object-oriented programming | Service boundaries, entities, value objects, policies, and dependency inversion. |
| Functional programming | Pure domain functions, immutable transformations, Result/error modeling. |
| Concurrency | Worker queues, async jobs, WebSockets, rate limiter, load tests. |
| Design patterns | Strategy, adapter, repository, circuit breaker, observer, command, factory when useful. |
| Clean code | Code review gates, naming, cohesion, small modules, typed boundaries. |
| Refactoring | Legacy-migration track every third project plus robustness units. |

## Technology Comparison Track

| Requested technology | Comparison path |
| --- | --- |
| Python | CLI, FastAPI, data pipeline, testing ergonomics. |
| JavaScript/TypeScript | API parity, dashboard, AI workflow, strict type modeling. |
| Go | Async queue, rate limiter, concurrency and operational simplicity. |
| Rust | Rate limiter and performance-sensitive comparisons. |
| Java | Later enterprise API comparison and OOP pattern exercise. |
| C# | Later internal tool/API comparison with Java/TypeScript. |
| SQL | PostgreSQL persistence, migrations, indexes, query plans. |
| Bash | CI/CD glue, smoke scripts, deployment checks. |
| Web frameworks | FastAPI vs Hono/Express vs later Java/C# frameworks. |
| Relational databases | PostgreSQL project and query-performance labs. |
| Non-relational databases | Redis cache and later document/search stores. |
| Queues | Async queue project with retries and DLQ. |
| Caches | Redis cache project with invalidation and staleness metrics. |
| APIs | CLI to REST to full-stack to AI-enabled APIs. |
| Containers | Dockerfiles, compose, image size, health checks. |
| Cloud | Deployment and observability track once local gates are stable. |
| AI tools | Prompt tests, evals, RAG, function calling, embeddings, workflows. |

## Legacy Modernization Track

| Requested capability | How codexDojo teaches it |
| --- | --- |
| Understand undocumented code | Map entry points, dependencies, side effects, and risk before editing. |
| Add tests to legacy systems | Require characterization tests that preserve current behavior. |
| Refactor safely | Use one small behavior-preserving move at a time, then verify parity. |
| Migrate incrementally | Prefer Strangler Fig, Branch by Abstraction, Parallel Run, Feature Flags, Expand/Contract, and anti-corruption layers. |
| Modernize without regressions | Measure before/after coverage, complexity, coupling, build/test time, runtime, and regression count. |
| Practice legacy drills | Add script-to-module, JS-to-TS, callback-to-async, framework-boundary, and monolith-extraction variants. |

Canonical contract: `LEGACY_MIGRATION.md`.

## Application Construction Track

| Requested app type | Roadmap coverage |
| --- | --- |
| APIs | Projects 2, 3, 5, and later service comparisons. |
| CLIs | Project 1 and Bash/DevOps scripts. |
| Dashboards | `codexDojo` app and later metrics dashboard. |
| Async systems | Projects 8 and queue/backpressure units. |
| Microservices | Taught after modular monolith and event-driven foundations. |
| Full-stack apps | Task system evolves from CLI to API to dashboard. |
| AI agents | Project 10 and agent orchestration docs. |
| Data pipelines | Later data ingestion and metrics/reporting extension. |
| Internal tools | Dashboard, CI scripts, runbooks, comparison reports. |
| Scalable systems | Cache, queue, observability, benchmarks, and architecture labs. |

## Architecture Track

| Requested architecture | Teaching approach |
| --- | --- |
| Simple monolith | First CLI/API versions. |
| Modular monolith | Default architecture once persistence/auth appears. |
| Microservices | Introduced only after bounded contexts and observability. |
| Event-driven architecture | Queue and async workflow projects. |
| Clean architecture | Service/domain/repository boundaries in API projects. |
| Hexagonal architecture | Ports/adapters refactor after testing maturity. |
| Serverless | Later deployment comparison against container runtime. |
| Agent-oriented architecture | `codexDojo` and `minimaxDojo` operating model. |
| RAG | Later AI knowledge assistant extension. |
| LLM workflows | Project 10 and evaluation model. |

## Professional AI Integration Track

| Requested capability | codexDojo rule |
| --- | --- |
| Generate code responsibly | Learner attempt first; implementation gate second. |
| Review code | Revisor prompt and scorecard. |
| Create tests | Testes prompt and empirical gate. |
| Document systems | Project package and cycle report templates. |
| Plan architecture | Arquiteto prompt, ADRs, and alternatives. |
| Create agents | Prompt set and OpenClaw/Hermes runbook. |
| Use RAG/function calling/embeddings/workflows | AI roadmap extension after project 10. |
| Evaluate model responses | Prompt tests, evals, and verifier evidence. |
| Measure generated-solution quality | Code evaluation, metrics, and AI dependency index. |

## Roadmap Expansion After The First 10

The first 10 projects establish the base. The next wave should cover:

11. Modular monolith vs microservices comparison.
12. Benchmark and technical report generator.
13. Event-sourced workflow.
14. RAG knowledge assistant for project docs.
15. Serverless vs container deployment comparison.
16. Java/C# enterprise API comparison.
17. Search/indexing service.
18. Multi-agent workflow with eval harness.
