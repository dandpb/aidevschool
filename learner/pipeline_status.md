# Pipeline Status — MiniMax Evolution Engine

> Estado do **pipeline de software** do ciclo atual. (A jornada de aprendizado fica em
> `learning_state.yaml`, na mesma pasta.) Caminhos relativos à raiz do ecossistema.
> Atualizado por cada agente ao fim da sua fase.

- **cycle_id**: 2026-06-04-01-rate-limiter
- **current_project**: `curriculum/01_rate_limiter`
- **complexity_level**: 2 (intermediário — concorrência + gestão de memória)
- **phase**: cycle-complete
- **awaiting**: `next-curator`
- **agents**:
  - `dev-node`: done (cobertura ~91.86%, 55 testes passados)
  - `dev-go`: done (cobertura ~85.9%, ratelimit green)
  - `dev-rust`: done (14 Rust unit tests + 6 integration tests green)
  - `reviewer`: done (21 issues: 0 Critical / 8 Major / 9 Minor / 4 Educational; 7 categorias
    cobertas; ver `curriculum/01_rate_limiter/docs/{code_review,learning_notes,quiz}.md`)
  - `benchmarker`: done (Node.js N=10, harness nativo sem k6; Go/Rust não executados — toolchain
    indisponível no sandbox, ver `curriculum/01_rate_limiter/docs/benchmark_results.md` §1.3;
    verifier tolerance re-check PASS: RPS dev 4.38%, latência avg dev 5.07%, ambos dentro de ±20%)
  - `optimizer`: done (Node.js: 1 otimização aplicada e medida — conectou a abstração morta
    `clientKeyStrategy.ts` em `index.ts`, removendo a duplicação inline (achado XLANG-MAJOR-001);
    re-medido N=10 nativo: RPS −5.9% média, latência média +7.3% — regressão real, pequena,
    reportada honestamente, não maquiada como ganho. Go/Rust: 0 otimizações aplicadas, 2 propostas
    para Go e 1 para Rust, ambas **não verificadas** — sem toolchain no sandbox para compilar/testar
    Go/Rust. ≥1 otimização rejeitada documentada. Ver `curriculum/01_rate_limiter/docs/evolution_report.md`.
    Verifier gate (fase=optimize): PASS para a trilha Node (única execution-verified); Go/Rust
    ficam fora do gate desta fase — propostas documentadas, não aplicadas/medidas.)
- **notas**:
  - Implementações polyglot em Go, Rust e Node.js/TypeScript validadas com sucesso pelos respectivos test suites.
  - Review re-derivou achados contra o código atual (não confiou nos artefatos pré-existentes do
    ciclo anterior `2026-06-03-01-rate-limiter`); 2 achados do rascunho antigo já estavam corrigidos
    (sharded mutex em Go/Rust, dead-code condicional no Rust) e 1 achado novo foi encontrado
    (abstrações `ClientKeyStrategy` mortas nas 3 linguagens). Detalhes em `learner/journal.md`
    (entrada 2026-07-05).
  - Go/Rust não puderam ser re-executados neste sandbox (toolchain indisponível); revisados
    estaticamente. `npm audit`/`cargo audit`/`govulncheck` não executados (sem rede/toolchain) —
    lacuna reportada explicitamente em `code_review.md` §7, não omitida.
  - Benchmark (fase atual): mesmo sandbox sem rede para toolchains — tentativa real de instalação
    de go/cargo/k6 falhou (proxy allowlist bloqueia `ports.ubuntu.com`, `go.dev`,
    `static.rust-lang.org`, `dl.k6.io`; binário Rust pré-buildado no repo é macOS Mach-O, não roda
    no sandbox Linux). Rodado N=10 real só para Node.js (autocannon como substituto do k6, 100
    conexões × 25s), RPS médio 18387 (CV 5.6%), p50 4.3ms (CV 11.2%), RSS pico 113.7MB (CV 0.75%);
    p95/p99 marcados como inconclusivos (CV 16-18%, acima do limiar de 15%). Nenhum vencedor
    cross-language declarado — só há dado real de 1 das 3 linguagens. Detalhes completos e
    caveats em `curriculum/01_rate_limiter/docs/benchmark_results.md`.
  - Optimize (fase final): mesma limitação de sandbox carregada adiante — sem toolchain para
    Go/Rust, o `optimizer` aplicou e mediu exatamente 1 otimização em Node.js (dead-code wiring),
    honestamente reportando uma pequena regressão (não um ganho), e documentou (sem aplicar) 2
    propostas para Go e 1 para Rust, rotuladas explicitamente como não verificadas. Achado extra:
    `rust-impl/src/client_key.rs` não está sequer declarado como módulo em `lib.rs` (mais morto
    do que o code review original tinha caracterizado). Ciclo encerrado como
    **Node-only execution-verified; Go/Rust code-reviewed/proposed-only** — não uma paridade de 3
    linguagens. Detalhes completos em `curriculum/01_rate_limiter/docs/evolution_report.md`.
- **blockers**: []

## Transições
`spec` → `diagnostic` (learner attempt evaluated · sonda) → `impl` (3 langs green + verifier) →
`review` → `benchmark` → `optimize` → `cycle-complete`
