# Gates — Portão Empírico

> **Canônico:** [`../../docs/04_empirical_gates.md`](../../docs/04_empirical_gates.md)

## Princípio

> **Consenso não é correção.** O Worker diz "funciona". O Verifier (PROMĘTOR) **roda o código** e diz "passa, com mutation score 0.71, cobertura 0.83, sem warnings". Só então vira `DOMINADO`.

## Portão Universal

| Critério | Threshold | Verificado por |
|----------|-----------|----------------|
| Execução real | testes rodam em sandbox | PROMĘTOR |
| Suíte verde | 100% (happy + bordas + adversarial) | PROMĘTOR |
| **Mutation score** | **≥ 0.65** | PROMĘTOR |
| Cobertura do núcleo | ≥ 0.80 | PROMĘTOR |
| Linter limpo | 0 erros | PROMĘTOR |
| Código idiomático | revisa PORQUÊ | CRÍTICO |
| Sem anti-padrões | lista negra | CRÍTICO |
| Reflexão do aluno | score ≥ 3 | MAESTRO |

## Ferramentas por Linguagem

| Linguagem | Test runner | Mutation | Coverage | Linter | Bench |
|-----------|-------------|----------|----------|--------|-------|
| Python | pytest | mutmut | coverage.py | ruff + mypy | pytest-benchmark |
| Go | go test + testify | go-mutesting | go test -cover | golangci-lint | go test -bench + benchstat |
| Rust | cargo test | cargo-mutants | cargo tarpaulin | clippy | criterion |
| **TypeScript** | **vitest** | **stryker** | **c8/v8** | **eslint + tsc** | **vitest bench** |

> TypeScript é o foco do learner atual. Ver [`../../config/learner.yaml`](../../config/learner.yaml).
