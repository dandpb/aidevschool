# Learning Notes: Project 02 Key-Value Store

> Companion to `docs/code_review.md`. Scope this cycle: **Node/TypeScript only**
> (Go/Rust out of scope by explicit repo-owner decision — see
> `learner/pipeline_status.md`). This document does not compare languages; it
> teaches what the Node implementation itself demonstrates well and where it
> falls short.

## Node/TypeScript in this domain

### Idioms this implementation uses well

- **Pure core, thin shell**: `store.ts` has zero HTTP imports; `server.ts` adapts
  the class to Express. You can unit-test the store's TTL/atomicity behavior
  in microseconds without spinning up an HTTP server (see `store.test.ts`),
  and separately test the wire contract with `supertest` (`server.test.ts`).
  This is the same shape as Project 01's rate limiter — recognize it as a
  reusable pattern for any business logic that has both a "rules" half and a
  "delivery" half.
- **Typed domain errors, one status-mapping function**: `DomainError` carries
  an `ErrorCode` enum value; exactly one function (`statusFor` in
  `server.ts`) knows how codes map to HTTP status. Add a new error code once,
  wire its status once — no route handler needs to know about HTTP at all
  when it throws.
- **`process.hrtime.bigint()` + `BigInt` math for TTL**: monotonic,
  nanosecond-precision, immune to system clock adjustments (NTP steps,
  manual clock changes) — critical because `docs/spec.md` explicitly forbids
  using wall-clock timestamps for internal expiry comparisons (only for
  client-facing display).
- **zod for recursive JSON validation**: `z.lazy(...)` cleanly expresses "a
  JSON value is null | bool | number | string | array-of-JsonValue |
  object-of-JsonValue" recursively, matching the domain's own recursive
  `JsonValue` TypeScript type.

### Where the Node implementation falls short (this cycle's real findings)

- **Byte-count vs. code-unit-count**: `serialized.length` (UTF-16 code units)
  was used to enforce a byte limit, while `Buffer.byteLength(str, 'utf8')`
  was used three lines later for the correct measurement. See
  `code_review.md` MAJOR-002. Lesson: any "size in bytes" check on a JS
  `string` must go through `Buffer.byteLength` (or `TextEncoder`); `.length`
  is never a byte count for non-ASCII content.
- **Validation must be applied uniformly across every route that touches
  the same resource.** `expire()` skipped the shared `validateKey` call that
  `set()`/`delete()`/`ttl()`/`mget()` all use. See `code_review.md`
  MAJOR-001. Lesson: when N routes share a precondition, put the check in the
  one function every route is forced to call — or write a single
  table-driven test across all N routes so a missing call fails loudly.
- **A spec's stated default is part of the contract.** The spec pins
  `127.0.0.1` as the default bind address; the implementation binds
  `0.0.0.0`. See `code_review.md` MAJOR-003. Lesson: for security-relevant
  defaults, grep the implementation for the literal value the spec
  specifies — don't assume the README's documented behavior was a reviewed
  choice just because it's written down.

### When to choose Node for this kind of problem

- **Good fit**: a single-process, single-authority key-value store where
  correctness under concurrency comes from "don't `await` inside a mutation"
  rather than from explicit locking. Fast to write, fast to test
  (synchronous unit tests, no thread-safety tooling needed), and the whole
  class of "torn write" bugs simply doesn't exist as long as the discipline
  holds.
- **Weaker fit**: a key-value store that needs genuine parallelism across
  CPU cores (Node's single event loop caps you at one core for compute-bound
  work — cloning large JSON values on every `set`/`mget`, as this
  implementation does via `cloneJson`, is exactly the kind of CPU-bound work
  that competes with request handling on the same thread). If throughput
  under many-core hardware matters more than implementation simplicity, Go's
  goroutines or Rust's `Arc<RwLock<_>>` with real OS threads are a better
  starting point.
- **Where the "no `await` in the critical section" discipline breaks down**:
  the moment a mutation needs to call something genuinely asynchronous
  (writing to disk for persistence, calling another service), Node loses its
  free atomicity guarantee and needs an explicit mutex/queue — exactly the
  same problem Go/Rust solve with `sync.Mutex`/`RwLock`. This project's
  spec explicitly keeps persistence out of scope (`docs/spec.md` line 207:
  "Snapshot/persistence basics remain conceptual for later extension") —
  which is *why* the current single-threaded-implies-atomic argument holds.
  Adding real disk persistence later would need to revisit this.

## Conceptos que você deve saber responder

1. **Por que `KeyValueStore` não precisa de um mutex em Node, e sob que
   condição essa garantia deixaria de valer?**
   Resposta esperada: o event loop de Node só executa JS de um único thread
   por vez; como nenhum método de `store.ts` tem `await` entre a validação e
   o commit, cada chamada roda do início ao fim sem ceder o controle — não
   há ponto de interleaving possível. A garantia quebraria no instante em que
   qualquer método de mutação passasse a fazer `await` no meio da operação
   (ex.: logging assíncrono, chamada de I/O), porque aí duas chamadas
   concorrentes poderiam intercalar exatamente naquele ponto.

2. **Por que `serialized.length > maxValueBytes` é um bug, e por que os
   testes existentes não pegaram isso?**
   Resposta esperada: `.length` em uma string JS conta unidades de código
   UTF-16, não bytes. Para conteúdo multi-byte (emoji, CJK, acentos fora de
   Latin-1), o número de bytes UTF-8 reais pode ser até ~2-4x maior que
   `.length`. Os testes existentes só usam valores ASCII puros para o caso
   "valor grande demais", onde `.length` e bytes UTF-8 coincidem — por isso
   o bug nunca apareceu na suíte.

3. **Por que `expire()` retorna `KEY_NOT_FOUND` em vez de `INVALID_KEY` para
   uma chave vazia, e qual é o princípio geral que evitaria esse tipo de
   bug?**
   Resposta esperada: `expire()` nunca chama `validateKey()`; ele vai direto
   para uma checagem de existência no mapa, que trata "chave nunca foi
   válida" e "chave válida mas ausente" da mesma forma (ambas retornam
   `false`). O princípio geral: quando uma regra de validação é compartilhada
   por várias rotas, ela deve viver em um único ponto que todas as rotas são
   obrigadas a passar — não em cada handler lembrando de chamar
   individualmente.

4. **Qual é a diferença entre "Node é single-threaded" e "Node é livre de
   condições de corrida", e por que a spec deste projeto pede
   especificamente para não usar `await` entre validação e commit?**
   Resposta esperada: single-threaded elimina paralelismo real (duas
   instruções de JS nunca executam ao mesmo tempo), mas não elimina
   concorrência (intercalação): funções `async` ainda podem ceder o controle
   em cada `await`, permitindo que outra requisição rode "no meio" de uma
   operação supostamente atômica. A spec pede para evitar `await` no meio de
   uma mutação precisamente para preservar a atomicidade que o modelo
   single-threaded oferece de graça — essa atomicidade é uma disciplina de
   código, não uma garantia da linguagem.

5. **Por que `expiresAtNanos` usa `BigInt`/`process.hrtime.bigint()` mas
   `expiresAtDate` (o campo que o cliente vê) usa `Date`/`Date.now()`? Por
   que não usar `BigInt` para os dois?**
   Resposta esperada: comparações internas de expiração precisam de uma
   fonte de tempo monotônica e de alta precisão, imune a ajustes do relógio
   do sistema — daí `hrtime.bigint()`. O timestamp que o cliente vê é só para
   observabilidade (a spec proíbe explicitamente usá-lo em comparações
   internas), então precisão de milissegundo com `Date` é suficiente e mais
   simples/idiomático para serializar como ISO-8601.

6. **O que significa "MSET é atômico" neste código, e como o teste
   `store.test.ts` prova isso — e por que essa prova poderia quebrar
   silenciosamente em um refactor futuro?**
   Resposta esperada: atômico aqui significa "todos os itens são validados
   primeiro; só depois de todos passarem é que qualquer entrada é de fato
   escrita no mapa" — se qualquer item falhar, nenhuma escrita acontece. O
   teste prova isso rejeitando um `mset` que estouraria `maxKeys` e depois
   confirmando que a chave rejeitada (`c`) continua ausente do mapa. Isso
   poderia quebrar silenciosamente porque a correspondência entre o array
   `plans` e o array `items` é mantida apenas pela ordem do loop (índice por
   índice) — não há nenhuma estrutura de dados que amarre os dois
   explicitamente (ver `code_review.md` MINOR-001).

## Prerequisites and follow-ups

- Builds on Project 01's clock-injection and pure-core patterns (see
  `learner/journal.md`, "Clock injection is the universal testability seam").
- Sets up Project 10 (Distributed Cache), which will need eviction policies
  this project explicitly excludes (`docs/spec.md` line 208: "Live-key
  eviction belongs to the later Distributed Cache project").
