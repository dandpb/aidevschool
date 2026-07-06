# PLAN — Game 18: "STACKS" (Search Engine / Inverted Index + Ranking)

> One game = one concept. The ONE concept here is **inverted index + ranking**: documents are
> tokenized into word-cards filed into the inverted index (a Map from each term to its posting list
> of doc ids), and a query fires ranked lookups that score matching docs (`tf · idf`) and return
> them in rank order. Everything else in the search-engine project (BM25's length normalization,
> fuzzy/autocomplete, incremental indexing and persistence, positional postings for phrase queries,
> sharding, distributed query fan-out) is out of scope — that is the curriculum project's job, not
> this game's. One game = one concept = **the inverted index turns text into a ranked result list.**

---

**1. Subject & concept**
Curriculum project: `../../curriculum/18_search_engine/`. Concept: **inverted index + ranking** —
build a `Map<term, Posting[]>` where `Posting = {docId, tf}`; tokenize each document (lowercase +
split on non-word); on a query, sum each query term's `tf · idf` contribution over the documents on
its posting list (`idf = log(N / df)`, with `df` the posting-list length); return the scored docs in
descending order, ties broken deterministically by docId. Out of scope: BM25 saturation/length
normalization, positional/phrase queries, fuzzy matching and edit distance, autocomplete tries,
incremental index updates, index persistence/serialization, distributed/sharded query fan-out. One
game = one concept = **term → posting list → ranked docs.**

**2. Why 3D**
A search engine's inverted index is a *3D library*. Each term is a labeled shelf holding the
word-cards (postings) of the documents that contain it; a query fires light-beams from a query orb
to every matching shelf, and the documents those postings reference light up behind the shelves as
glowing books whose brightness tracks their score, sorted in rank order. In 3D the player physically
files a word-card onto the correct shelf, watches beams converge on multiple shelves for a
multi-term query, and sees the ranked result books brighten in order. The "term → posting list →
ranked docs" structure is *spatial*: a 2D rule can show a table, but it cannot make the multi-term
beam convergence and the additive scoring-that-lights-up-the-both-terms-doc-brightest properties
visceral the way a library of shelves and books does. That delta is the lesson, and it is
intrinsically spatial.

**3. Player goal**
File word-cards onto the correct term shelves, then for each query predict which document ranks #1
(L2 single-term, L3 two-term) and read off the full ranked top-3 (L4) — proving the player
understands that the inverted index turns the query into a ranked list by summing term scores.

**4. Concept → mechanic mapping** (the pedagogical core)

| Concept element | 3D mechanic | What "playing it right" proves |
| --- | --- | --- |
| Tokenization | A word-card ("FOX", "Quick-Brown") is shown; player files it onto a shelf | Player knows a card lands on exactly one normalized term |
| Inverted index (term → posting list) | Shelves labeled by term, each holding word-cards (one per posting, labeled by docId) | Player reads "the index is a term-keyed shelf of cards" |
| Term frequency (tf) | A shelf with several cards from the same doc shows repeats | Player sees "more occurrences ⇒ more cards ⇒ higher weight" |
| Document frequency / idf | An omnipresent term's shelf is full (low idf); a rare term's shelf has one card (high idf) | Player learns rare terms discriminate |
| Query as postings lookup | Beams shoot from the query orb to each matching shelf | Player sees a query = a few shelf lookups |
| Additive scoring | A doc on two beamed shelves (both terms) glows brighter than a doc on one | Player learns two-term scores sum |
| Ranking | Result books behind the shelves brighten and order highest-score-first | Player reads the ranked list off space |

**5. Main loop**
A 20–40s wave: (1) the corpus is indexed (shelves fill with word-cards); (2) the player makes a
**prediction** (which shelf a card lands on [L1], which doc ranks #1 [L2/L3], the full top-3 order
[L4]); (3) the query fires — beams shoot to the matching shelves, books light up; (4) the prediction
is judged against the deterministic ranking. Score = prediction correctness.

**6. Camera & controls**
Mouse-orbit + scroll zoom around the library (OrbitControls), target fixed on the shelf row. Click a
shelf to file a word-card (L1); click a document/book to predict it (L2/L3/L4). Three actions plus
camera. A query orb sits in front of the shelves; beams render when the query is firing/cleared.

**7. Win / fail states**
*Win a wave:* the player's prediction matches the deterministic ranking — correct shelf for each
card ≥3 of 4 (L1); correct #1 doc (L2); correct #1 doc that contains BOTH terms (L3); correct full
top-3 order (L4). *Fail:* prediction wrong (the player's model of tokenization/scoring/ranking does
not match the index). Every failure is a misread of the inverted-index model — never arbitrary.

**8. Progression / difficulty**

- **L1 — File the word-card:** tokenization. Predict which shelf each shown word-card lands on (≥3
  of 4 correct). Lesson: a card lands on exactly one normalized term.
- **L2 — One-term query:** a single query term. Predict the top-ranked document for it. Lesson: a
  query reads one posting list and ranks by `tf · idf`.
- **L3 — Two-term query:** `dog fox`. Predict the top doc — it must contain BOTH terms (additive
  scoring ranks docs-with-both above docs-with-one). Lesson: scores sum across query terms.
- **L4 — Ranking:** a multi-term query over a larger corpus. Predict the full top-3 order. Lesson:
  read the whole ranked list, not just the top.

**9. Visual direction**
Single hero object: a **row of term shelves** (flat bookcase slots) with a query orb floating in
front. Word-cards are small planes on each shelf labeled by docId (the posting list made physical).
Beams are thin emissive cylinders from the orb to each queried shelf. Result documents are glowing
book meshes behind the shelves; emissive brightness ∝ score, scale ∝ score, sorted left→right by
rank with numbered labels. ≤8-colour flat palette; all geometry procedural (boxes, planes,
cylinders, icosahedra). Dark disc floor with subtle fog.

**10. Simulation core (headless)**
`src/sim/index.ts` — pure functions, ZERO three imports: `tokenize(text) → string[]` (lowercase +
split on non-word); `termFreq(tokens) → Map<term,count>`; `index(docs) → {inverted: Map<term,
Posting[]>, n}` where `Posting = {docId, tf}` and posting lists are sorted by docId (deterministic);
`df(inverted, term)`, `idf(inverted, term, n) = log(n/df)` (0 if absent); `query(inverted, terms, n)
→ Map<docId, score>` summing `tf · idf` per posting; `rank(scores) → ScoredDoc[]` sorted desc,
ties broken by docId ascending; `search(docs, terms)` convenience. Deterministic: same corpus +
query ⇒ identical ranking. Vitest covers: indexing builds correct posting lists; a single-term
query returns matching docs ranked by tf; a two-term query ranks docs-with-both above docs-with-one;
additive scoring; deterministic rank order. No Three.js imports here.

**11. Stack & performance budget**
Vite + strict TS + plain `three` (+ `OrbitControls` from `three/addons`). Budget: 60fps with ≤~25
shelves, ≤~40 word-cards, ≤7 result books (well under 80 meshes); labels are cached CanvasTexture
sprites. No instancing, postprocessing, or physics engine — beams are static cylinders drawn on
sync, book glow is emissive-intensity in the render loop.

**12. Learning-gate hooks**

- Targets unit **`U18-search-engine`** (project `18_search_engine`) in
  `../../learner/learning_state.yaml`. As of 2026-07-05 that unit is **not yet in the substrate**
  (only U0 is honestly gated), so STACKS evidence serves **deepening** play now and becomes the real
  learning gate for U18 when the scheduler makes it the active unit. The emitter derives
  `scheduled_review` / `review_reason` dynamically from the substrate-generated review slice, so
  both modes work without code changes.
- On wave clear, emit:
  `{"source":"voxeldojo","unit_id":"U18-search-engine","project":"18_search_engine","scenario_id":"stacks-L1","game":"STACKS","ts":"<iso>","pass":true,"metrics":{"cards_total":4,"cards_correct":4,"filing_accuracy":1},"review_context":{"unit_kind":"concept","scheduled_review":false,"review_reason":"deepening","scheduler_source":"learner-substrate","verifier_required":true},"curriculum_context":{"concept":"inverted index + ranking","mechanic":"3D library, word-card catalog"}}`
  via `window.__voxelDojoEvidence` and an `EVIDENCE <json>` console record.
- The verifier (Prometor context) validates metrics against the gate/review policy and owns any
  state transition. **The game never writes learner state.**

**13. Milestones**

- **M0** this plan.
- **M1** `sim/index.ts` + Vitest suite proving posting-list construction, single-term tf ranking,
  two-term additive ranking, determinism. (No pixels yet.)
- **M2** scene: row of term shelves with word-cards (postings) + query orb + glowing result books,
  rendering a static indexed state.
- **M3** interaction: click shelf to file (L1); click book to predict (L2/L3/L4); beams fire on
  query.
- **M4** levels L1–L4 (filing / one-term / two-term / ranking) with `evaluate*` judges.
- **M5** evidence emit wired to wave clears; console `EVIDENCE` records with the U18 schema.
- **M6** verify: Playwright plays L1 + L2 headed, asserts evidence records + screenshots to `.logs/`.

**Open questions / risks**
Is the L1 "file the word-card" mechanic (tokenization only) enough active recall, or should the
player also build the posting list by hand? Resolved at M1/M4: the player files cards onto the
correct shelf — that is the tokenization half — and the posting list fills automatically so the
shelves are readable; the ranking levels then exercise the query/scoring half. Together they cover
both halves of the one concept. Does WebGL run reliably in the Playwright smoke environment (see
`docs/GAP_ANALYSIS.md` §G6)? Resolved during M6 — WebGL boots cleanly in the smoke run.
