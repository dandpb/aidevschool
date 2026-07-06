# PLAN slice — `18_search_engine` (Shape B: Search Stacks)

> PLAN slice for `/threejs-dojo 18_search_engine`. The slug's catalog concept row is "Inverted
> indexes, tokenization, TF-IDF/BM25 ranking, query parsing, fuzzy search, autocomplete,
> incremental indexing, index persistence". This slice narrows that row to its **primary** concept
> (per `curriculum/18_search_engine/docs/spec.md` "Learning Objectives" + the `ROUTING_MANIFEST.md`
> row for this slug): **building an inverted index (tokenize → postings lists with positions) and
> resolving a parsed boolean query to top-k documents ranked by BM25**. Fuzzy search, autocomplete,
> and incremental indexing are out of scope for the playable concept — one game = one concept.
> Persistence is included only as the L5 fail-safety beat (a save crystal the player loads from),
> not a buildable subsystem.
>
> **Shape B (accepted):** a fresh standalone 3D (three.js) world. None of pixel-quest's existing
> encounter kinds (sequence_flow / policy_gate / route_health / token_bucket) can represent
> * postings lists keyed by term with per-document term-frequency and corpus-level document-frequency
> statistics feeding a BM25 ranker* — they are all variants of "incoming sprite → admit/reject",
> which has no per-term pillar geometry, no intersect/union/exclusion threading, and no ranked
> top-k rising order. The concept needs 3D library geometry, so it gets its own world.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/18_search_engine/`
- **ONE concept this game teaches:** a full-text retrieval pipeline where raw document text is
  tokenized into normalized terms (lowercase, strip punctuation, drop stop-words) with positions
  (FR-002, FR-003); each term maps to a **postings list** of `(doc_id, term_frequency, positions)`
  (FR-004); corpus statistics — document frequency `df`, average document length `avgdl`, total
  document count `N` — are maintained (FR-005); a parsed boolean query (`AND` / `OR` / `NOT` with
  `NOT > AND > OR` precedence, FR-008, FR-009) resolves to a candidate doc set; and the candidates
  are returned as **top-k ranked by BM25** (FR-006, default ranking), where each query term's
  contribution is `idf * (tf * (k1+1)) / (tf + k1 * (1 - b + b * dl/avgdl))` with `idf = ln(1 + (N - df + 0.5)/(df + 0.5))`. Out of scope: TF-IDF selector switch, fuzzy edit-distance, autocomplete prefix trie, incremental upsert/delete, the Go/Rust/Node comparison (those are the curriculum project's job).
- **Slug:** `18_search_engine`
- **Catalog key question (context only, not the win condition):** "How do inverted index build
  times and query latencies compare for different corpus sizes?"
- **Done-rule (one sentence, lifted from the spec's primary learning objective + manifest concept
  row):** the player demonstrates that documents are tokenized/normalized into positional postings
  lists and a multi-term boolean query is resolved to the correct top-k documents in BM25 rank
  order — read straight off the inverted index and the corpus statistics (FR-002, FR-004, FR-005,
  FR-006, FR-008, FR-009).
- **Unit id (evidence target):** `U18-search-engine` (per
  `.loops/threejs-dojo/ROUTING_MANIFEST.md`; the substrate does not yet have this unit registered,
  so the run emits `scheduled_review: false`, `review_reason: "deepening"` until it is added).
- **Encounter / scene id:** `search-stacks-01`
- **Engine / dir / port:** `voxelDojo` · `game-18-stacks` · `5218`

## 3. Concept → mechanic mapping (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| **Tokenizer + normalizer (FR-002, FR-003)** | A "Tokenizer Gate" arch at the library entrance. Each incoming document is a floating tome whose raw text is rendered as a stream of mixed orbs (lowercase letters, capitalized words, punctuation shards, stop-words tagged red). The player sorts: good orbs (normalized terms) pass through the gate; punctuation is dropped into a bin; stop-words are bounced into a rejection chute. A position counter ticks per accepted term per doc. | Player internalizes that the indexer never sees raw text — only normalized, position-tracked terms. |
| **Postings list per term (FR-004)** | Beyond the gate stands the **Stacks Hall**: a grid of vertical term-pillars (one per unique normalized term). Each accepted orb flies to its matching pillar and lodges as a glowing card inscribed `(doc_id, tf, [positions])`. Pillars are sorted alphabetically; the HUD lists the postings stack under the cursor. | Player sees the inverted index literally *inverted*: terms index docs, not docs indexing terms. |
| **Term frequency `tf` (FR-004)** | A card's glow intensity ∝ `tf` for that (term, doc). The brighter the card, the more times the term appears in that doc. | Player reads tf as a per-card intensity, not a number on a page. |
| **Document frequency `df` (FR-005)** | The height of a term-pillar = number of cards = `df`. A pillar tag displays `df=N`. Stop-word-like common terms grow into towering dim pillars; rare terms stay short and bright. | Player feels "rare vs common" as pillar geometry before they ever see an idf formula. |
| **Inverse document frequency `idf` (FR-006)** | A halo around each pillar whose color shifts blue→gold as `idf` rises (rare term = gold halo). The halo updates live as new docs are indexed. | Player links "rare term → high idf → high rank contribution" geometrically. |
| **Corpus stats `avgdl`, `N` (FR-005)** | A floor dial at the hall center displays live `N` (total docs indexed) and `avgdl` (average document length in tokens). A length ruler beside each card shows `dl/avgdl` ratio. | Player sees BM25's length-normalization inputs as visible measurements. |
| **Boolean query parser, precedence NOT>AND>OR (FR-008, FR-009)** | A "Quest Lectern" posts a parsed-or-unparsed query card (e.g. `"distributed AND (cache OR store) NOT redis"`). For unparsed cards the player must arrange operator tokens in the correct precedence order on a rail before firing. Wrong order = parse reject. | Player demonstrates that query parsing is deterministic precedence, not free-form text matching. |
| **Postings intersection / union / exclusion (FR-008, FR-009)** | The player threads a **query laser** through the term-pillars named in the query: AND = laser passes through both pillars and only cards hit by *both* beams stay lit (intersection); OR = either beam keeps a card lit (union); NOT = a card lit by the NOT-pillar's beam is extinguished (exclusion). The remaining lit cards are the candidate set. | Player proves they can evaluate boolean algebra as set operations over postings — the literal definition of inverted-index query processing. |
| **BM25 score (FR-006, NFR-005)** | Each surviving candidate card grows a vertical **relevance beam** above it whose height ∝ its BM25 score for the query. Beam height sums the per-term contributions: `Σ idf · (tf·(k1+1))/(tf + k1·(1−b+b·dl/avgdl))`. The HUD shows the per-term breakdown on hover. | Player links the formula's three levers (tf saturation via `k1`, length norm via `b`, rarity via `idf`) to one visible height. |
| **Top-k retrieval (FR-006, default `k=3`)** | The player presses **↑/↓** to set `k` (default 3, capped at 5) and then presses **X** to "lift" the top-k highest-beam cards out of the hall as answer tomes. Lifting the wrong card or lifting out of rank order = `topk_wrong`. | Player demonstrates top-k = sort by score then truncate, the canonical retrieval step. |
| **Determinism / stable tie-break (NFR-005)** | When two beams tie in height, the HUD highlights the tie and the player must lift the lower `doc_id` first. A wrong order is `bm25_rank_wrong`. | Player experiences that BM25 is deterministic only with a declared tie-breaker (here `doc_id` asc). |
| **Persistence (FR-016, NFR-006)** | A floor-mounted **save crystal** serializes the current index (terms, postings, stats) to disk on press. On wave restart the hall loads from the crystal — the tomes do NOT re-enter the gate. A "corrupted crystal" wave writes a partial file the player must reject rather than load, teaching NFR-006 crash-safety. | Player proves that an index is a materialized artifact that can outlive the documents, and that a partial file is not a valid index. |
| **Latency budget (NFR-002, key question)** | A wave timer counts ms while the query laser is live. If the player exceeds the budget (loose at first, tightening per level: 200ms → 100ms → 50ms p95-equivalent in scaled game-time), the wave fails with `query_latency_over`. | Player feels query latency as the cost of the work, mirroring the catalog's key question. |

## 4. Main loop (the ~30–45 s cycle the player repeats)

1. **Wave card.** The HUD posts the wave contract, e.g.
   `WAVE 2: 4 docs, tokenizer=on, query = "cache AND (ring OR mesh) NOT redis", k=3, budget=120ms, ranker=bm25`.
   Save crystal state is shown (`loaded` / `empty` / `corrupt`).
2. **Index phase.** Document tomes enter the gate one at a time. For each tome the player:
   - Routes good orbs through the gate (**←/→** + **Z**), drops punctuation in the bin, bounces
     stop-words into the chute. The HUD shows live `tf` per accepted term for the current doc.
   - Watches cards fly to their pillars; pillar heights and halos update live.
   - Floor dial ticks `N` and `avgdl`.
3. **Query parse.** Once all docs are indexed, the Quest Lectern lights. If the query is presented
   unparsed, the player orders operator tokens on the precedence rail (**←/→** + **Z**), then
   presses **X** to commit the parse.
4. **Postings evaluation.** The player threads the query laser through the named term-pillars,
   choosing AND/OR/NOT at each junction. Surviving cards stay lit.
5. **Rank + lift.** The player presses **X** to compute BM25 beams, then **↑/↓** to set `k`, then
   lifts the top-k tomes in rank order (**Z** on each).
6. **Save crystal (L5+).** Before the wave ends, the player presses **C** on the crystal to persist
   the index. On corruption waves the player presses **V** to reject the partial file rather than
   load it.
7. **Wave clear.** When the candidate set matches the parse, the rank order is correct, the budget
   holds, and the crystal is healthy, the hall dims and the HUD posts the wave score:
   `{docs_indexed, terms_indexed, tokenization_errors, postings_eval_correct, postings_eval_wrong,
   boolean_eval_correct, boolean_eval_wrong, bm25_rank_correct, bm25_rank_wrong, topk_correct,
   topk_wrong, query_latency_ms, index_build_ms, persistence_state}`.
8. **Evidence emit.** If the pass rule holds, the scene emits one `EVIDENCE {...}` line to the
   in-page channel and to `engines/voxelDojo/games/18_search_engine/.logs/evidence.ndjson`. The
   next wave (more docs, longer query, smaller budget, ranker curveballs) unlocks.

## 5. Inputs & controls (≤ 4 primary actions, NES-pad feel)

- **A/D** or **←/→** — move the cursor: between gate lanes during the index phase, between
  term-pillars during the query phase, along the precedence rail during parse.
- **Z** — DROP/SELECT: pass an orb through the gate, lodge an operator token on the rail, fire the
  query laser through a pillar, lift a top-k tome. Primary write action.
- **X** — COMMIT/COMPUTE: commit the query parse, compute BM25 beams, open the lift step. Primary
  read/action action.
- **↑/↓** — set `k` (top-k count, default 3, capped 5). Primary retrieval-tuning action.
- **C** — CRYSTAL SAVE: persist the index to disk (L5+ only). Secondary persistence action.
- **V** — REJECT: refuse to load a corrupted crystal (NFR-006 wave only). Secondary safety action.
- **Q** — toggle HUD detail: show per-term `idf`, `tf`, `dl/avgdl`, and the BM25 breakdown
  (allowed in waves 1–2, disabled in later waves to test mastery without the crutch).
- Four primary actions (**Z**, **X**, **↑/↓**, **C**) define the loop; **V** and **Q** are
  context-locked so they don't overload the player.

## 6. Win / fail states

- **Win the wave (PASS)** when **all** of:
  - `tokenization_errors === 0` (every raw orb was routed correctly: lowercased, punctuation
    binned, stop-words bounced, positions preserved),
  - `postings_eval_correct === postings_eval_total` (every boolean operator in the query produced
    the right set operation over postings),
  - `boolean_eval_correct === true` (the parse + evaluation produced exactly the candidate set the
    deterministic oracle expects),
  - `bm25_rank_correct === bm25_rank_total` (the lifted tomes are in non-increasing BM25 order,
    ties broken by `doc_id` asc),
  - `topk_correct === true` (the count and identity of lifted tomes equals the oracle's top-k),
  - `query_latency_ms <= budget` (the wave timer stayed under the contract budget),
  - `persistence_state ∈ {"loaded","saved","rejected-corrupt"}` (no corrupt crystal was loaded).
- **Fail the wave (FAIL)** when **any** of:
  - An orb is misrouted (`tokenization_errors > 0`) → orb bounces, gate flashes red, evidence
    `pass: false`. The misrouted term either pollutes a pillar (stop-word leaked → bloated `df`,
    dim halo) or drops a real term (card missing → candidate set wrong downstream).
  - A postings evaluation is wrong (`postings_eval_wrong > 0`) → the laser paints the wrong
    surviving set, evidence `pass: false`.
  - The boolean parse is wrong (`boolean_eval_correct === false`) → the precedence rail flashes
    red, the parse is rejected, evidence `pass: false`.
  - The rank order is wrong (`bm25_rank_wrong > 0`) → the HUD shows the correct order in green
    and the player's order in red, evidence `pass: false`.
  - The lifted set is wrong (`topk_correct === false`) → wrong tomes rise, evidence `pass: false`.
  - The wave timer exceeds budget (`query_latency_over === true`) → the hall alarm sounds,
    evidence `pass: false` with `latency_over: true`.
  - A corrupt crystal is loaded (`persistence_state === "loaded-corrupt"`) → the index goes
    nonsensical (random pillars vanish), evidence `pass: false` with `corrupt_loaded: true`.
- Both outcomes are **direct readouts of inverted-index + boolean-parse + BM25 discipline**. The
  only clock is the latency budget, which is itself the catalog's key question made playable.

## 11. Learning-gate hooks

- **Active unit:** `U18-search-engine` (project `18_search_engine`). If
  `learner/learning_state.yaml > active_unit.id` does not yet contain this id, the run still emits
  evidence with `scheduled_review: false` and `review_reason: "deepening"` (per
  `ROUTING_MANIFEST.md`); the verifier will not promote until the substrate registers the unit.
  The game never writes learner state.
- **Encounter / scene id:** `search-stacks-01`.
- **Mechanic kind:** `voxeldojo-search-engine` (NEW evidence metrics variant — extends the
  discriminated union in `pixel-quest/src/game/evidence/types.ts` or the voxelDojo sibling; the
  verifier dispatches on `metrics.kind`).
- **Evidence channel (producer side):** append-only `window.__voxelDojoEvidence` plus
  `console.log("EVIDENCE " + json)` plus NDJSON at
  `engines/voxelDojo/games/18_search_engine/.logs/evidence.ndjson`, mirroring the
  `EVIDENCE_CONTRACT.md` producer pattern (game emits, verifier owns mastery).
- **Test hook:** `window.__searchStacks` exposing the deterministic public API
  (`tokenize(rawText)`, `indexDoc(doc)`, `parseQuery(q)`, `evaluate(parse, postings)`,
  `rankBM25(candidates, query)`, `liftTopK(k)`, `saveCrystal()`, `loadCrystal()`), so the
  Playwright smoke can drive the loop without timing-sensitive inputs and assert the evidence
  record on a fixed RNG seed.
- **Evidence record fields** (this game's metrics variant — `kind: "voxeldojo-search-engine"`):

  ```json
  {
    "source": "voxeldojo",
    "unit_id": "U18-search-engine",
    "project": "18_search_engine",
    "scenario_id": "search-stacks-L2",
    "game": "Search Stacks",
    "ts": "<iso-8601>",
    "pass": true,
    "metrics": {
      "kind": "voxeldojo-search-engine",
      "docs_indexed": 4,
      "terms_indexed": 27,
      "tokenization_errors": 0,
      "postings_eval_correct": 3,
      "postings_eval_wrong": 0,
      "boolean_eval_correct": true,
      "bm25_rank_correct": 3,
      "bm25_rank_wrong": 0,
      "topk_correct": true,
      "topk_k": 3,
      "query_latency_ms": 84,
      "query_latency_budget_ms": 120,
      "latency_over": false,
      "index_build_ms": 412,
      "persistence_state": "saved",
      "k1": 1.2,
      "b": 0.75
    },
    "review_context": {
      "unit_kind": "concept",
      "scheduled_review": false,
      "review_reason": "deepening",
      "streak_candidate": false,
      "scheduler_source": "learner-substrate",
      "verifier_required": true
    },
    "curriculum_context": {
      "concept": "Inverted index build + boolean query evaluation + BM25 top-k ranking",
      "mechanic": "3D card-catalog library with term-pillars, query lasers, and relevance beams",
      "accepted_signal": "postings evaluated correctly AND bm25 rank correct AND top-k correct AND within latency budget AND healthy crystal",
      "rejected_trap": "lax tokenization, wrong boolean precedence, wrong rank order, lifted wrong tomes, blew the latency budget, or loaded a corrupt crystal"
    }
  }
  ```

- **Pass rule (verifier reads this; the game only emits `pass: true|false`):** the attempt is a
  PASS if and only if
  `tokenization_errors === 0 ∧ postings_eval_wrong === 0 ∧ boolean_eval_correct === true ∧
  bm25_rank_wrong === 0 ∧ topk_correct === true ∧ latency_over === false ∧
  persistence_state ≠ "loaded-corrupt"`.
  A `pass: true` here is **never mastery by itself** — the verifier (separate context) maps the
  eligible record to a gate outcome (`fail` / `pass_retried` / `pass_first_try`) and appends the
  review to `learner/learning_state.yaml > units_log` only when the substrate has registered
  `U18-search-engine` and the attempt is strictly newer than the last graded evidence for the
  unit (anti-replay, per `EVIDENCE_CONTRACT.md`).
