# Pipeline Status — MiniMax Evolution Engine

> Estado do **pipeline de software** do ciclo atual. (A jornada de aprendizado fica em
> `learning_state.yaml`, na mesma pasta.) Caminhos relativos à raiz do ecossistema.
> Atualizado por cada agente ao fim da sua fase.

- **cycle_id**: 2026-07-06-02-key-value-store
- **current_project**: `curriculum/02_key_value_store`
- **complexity_level**: 1 (fundamentos — hash map + TTL + HTTP CRUD)
- **phase**: review-done
- **awaiting**: `benchmarker`
- **agents**:
  - `dev-node`: done (cobertura real medida nesta sessão: 86.15% statements / 80.76% branch /
    96.66% funcs / 86.15% lines — `npx vitest run --coverage`, 6/6 testes passando, 2 arquivos de
    teste; build `tsc` limpo; `eslint` limpo. Cobertura ≥ `cobertura_nucleo_min: 0.80` do
    `engines/minimaxDojo/config/learner.yaml`. Verificado em ambiente Linux isolado — `node_modules`
    do macOS presente no repo não roda no sandbox (`@rollup/rollup-linux-arm64-gnu` ausente,
    mismatch de plataforma), reinstalado fresh em `/tmp` para rodar de verdade; `node_modules/`,
    `dist/`, `coverage/` do repo continuam gitignored, não versionados.)
  - `dev-go`: not started this cycle (out of scope — repo owner decided Node-only for this ciclo).
    **Nota:** `go-impl/` já existe no repo (código + testes de um ciclo anterior/ungated), mas não
    foi tocado, editado, executado nem revalidado nesta sessão.
  - `dev-rust`: not started this cycle (out of scope — repo owner decided Node-only for this ciclo).
    **Nota:** `rust-impl/` já existe no repo (código + testes de um ciclo anterior/ungated), mas não
    foi tocado, editado, executado nem revalidado nesta sessão.
  - `reviewer`: done. Revisão real e independente do `node-impl/` (Go/Rust explicitamente fora de
    escopo, não revisados). Reinstalação fresh em `/tmp` + `npx vitest run --coverage` reproduziu
    de forma independente os números do `dev-node` (6/6 testes, 86.15%/80.76%/96.66%/86.15%);
    `tsc`/`eslint` limpos; `npm audit --omit=dev` = 0 vulnerabilidades (vulnerabilidades do audit
    completo são todas do dev-toolchain `esbuild`/`vite`/`vitest`, não do código em produção).
    3 achados Major reais, cada um reproduzido por execução direta do código (não só leitura
    estática): (1) `expire()` não chama `validateKey()`, retornando `KEY_NOT_FOUND` em vez de
    `INVALID_KEY`/`KEY_TOO_LONG` para chaves inválidas; (2) checagem de tamanho de valor usa
    `serialized.length` (UTF-16) em vez de `Buffer.byteLength` (UTF-8), permitindo bypass do limite
    para conteúdo multi-byte (confirmado: 122 bytes reais aceitos com limite de 100); (3) bind
    padrão `0.0.0.0` em `main.ts` contradiz o `127.0.0.1` exigido pela spec (`docs/spec.md:48`).
    Tally: 0 Critical / 3 Major / 4 Minor / 4 Educational, 7 categorias cobertas. Artefatos:
    `docs/code_review.md` (rewrite completo), `docs/learning_notes.md`, `docs/quiz.md` (8 questões
    com gabarito), entrada em `learner/journal.md` (2026-07-06).
- **notas**:
  - Escopo desta sessão (Fase 2.1, per `docs/SPEC_plano_execucao.md`): **somente Node.js** recebe
    implementação real e verificada neste ciclo. Go e Rust foram deliberadamente **não iniciados**
    — não é "esquecido", é decisão explícita do dono do repo.
  - Investigação prévia (Step 0) encontrou `curriculum/02_key_value_store/` já com: `docs/spec.md`
    (13 seções, adequado, cobre hash map/CRUD/TCP-HTTP/TTL/snapshot-persistence-basics conforme
    `benchmark.yaml`), `node-impl/` completo (store.ts, server.ts, main.ts, 2 arquivos de teste),
    além de `go-impl/` e `rust-impl/` com código real — todos aparentemente de um "backfill" anterior
    (`git log`: commit `5d0ee67 feat(curriculum): backfill per-cycle Definition-of-Done
    deliverables (02-18)`), não de um ciclo gated real. `docs/code_review.md`, `docs/
    evolution_report.md`, `docs/ADR.md`, `docs/verdict.md`, `docs/redteam.md`, `docs/lesson.md`
    também já existiam — não foram alterados nesta sessão nem re-verificados; a única verificação
    execution-based feita agora foi rodar de fato a suíte Node (testes + coverage + lint + build).
  - O spec pré-existente já era adequado; não foi reescrito, apenas confirmado contra os requisitos
    do Step 1 (hash maps, CRUD API, TCP/HTTP, TTL, snapshot/persistence). Persistência em disco está
    explicitamente escopada como "conceptual for later extension" no próprio spec (linha 18 e 207),
    não um requisito rígido deste ciclo.
  - `BACKLOG_STATUS.md`/`catalog.md` já rotulavam o projeto 02 como tendo "Go/Rust/Node
    implementations exist" (`scaffolded`) / "✅ Implemented" — essas linhas não foram alteradas
    nesta sessão; a certificação formal fica para a fase de review/verify, não para impl-done.
  - **Reconfirmado na fase review**: a contradição `catalog.md` ("✅ Implemented") vs.
    `BACKLOG_STATUS.md` ("scaffolded... pending catalog-verified 5-phase gate") segue sem correção
    — nenhum dos dois refletia a realidade antes desta sessão (nenhum ciclo tinha completado um
    review real e gated para o projeto 02). A revisão desta fase tratou o código como se a claim
    "✅ Implemented" não existisse, e a correção textual de `catalog.md`/`BACKLOG_STATUS.md` fica
    para a fase optimize/certify, não para review.
- **blockers**: []

## Transições
`spec` → `diagnostic` (learner attempt evaluated · sonda) → `impl` (3 langs green + verifier) →
`review` → `benchmark` → `optimize` → `cycle-complete`
