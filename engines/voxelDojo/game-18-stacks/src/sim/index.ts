/**
 * Inverted index + TF-IDF ranking (one concept: how a search engine turns text into a ranked list).
 *
 * Pure TypeScript, ZERO `three` imports. The inverted index is the data structure a search engine
 * builds once and re-reads on every query: a Map from each term (word) to its **posting list** —
 * the documents that contain it, paired with that document's term frequency. A query is then a
 * handful of postings-list lookups whose per-document scores are summed; the highest-scoring
 * documents come out first. Everything is deterministic: the same corpus + query ⇒ the same ranking.
 *
 * `score = Σ over query terms of tf · idf` where `idf = log(N / df)` (document frequency `df` is the
 * posting-list length). This is the textbook TF-IDF weighting that BM25 refines; the ranking lesson
 * is identical and this game isolates it.
 */

/** A document in the corpus. `id` is the stable handle; `text` is what gets tokenized. */
export interface Doc {
  id: string
  text: string
}

/**
 * One entry on a term's posting list: the document that contains the term and that document's raw
 * term frequency (count of occurrences). The posting list is the column the query reads.
 */
export interface Posting {
  docId: string
  tf: number
}

/** term → posting list. The whole index in one Map. Posting lists are kept sorted by docId so two
 *  lists can be merged deterministically and snapshots are stable. */
export type InvertedIndex = Map<string, Posting[]>

/** A document plus its computed score for a query. */
export interface ScoredDoc {
  docId: string
  score: number
}

/** Tokenize a string into lowercase word terms. Splits on any run of non-word characters, drops
 *  empties. "Hello, WORLD!" → ["hello", "world"]. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
}

/** Term frequency map for a single document: term → count. */
export function termFreq(tokens: readonly string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  return tf
}

/**
 * Build the inverted index from a corpus. For every term in every document we append a
 * `{docId, tf}` posting to that term's list; each list is sorted by docId so the structure is
 * deterministic regardless of Map insertion order. Returns the index and the document count N
 * (needed for idf).
 */
export function index(docs: readonly Doc[]): { inverted: InvertedIndex; n: number } {
  const inverted: InvertedIndex = new Map()
  for (const doc of docs) {
    const tf = termFreq(tokenize(doc.text))
    for (const [term, count] of tf) {
      let postings = inverted.get(term)
      if (!postings) {
        postings = []
        inverted.set(term, postings)
      }
      postings.push({ docId: doc.id, tf: count })
    }
  }
  // Deterministic posting lists: sort by docId.
  for (const postings of inverted.values()) {
    postings.sort((a, b) => (a.docId < b.docId ? -1 : a.docId > b.docId ? 1 : 0))
  }
  return { inverted, n: docs.length }
}

/** Document frequency — how many postings (documents) a term appears in. */
export function df(inverted: InvertedIndex, term: string): number {
  return inverted.get(term)?.length ?? 0
}

/**
 * Inverse document frequency: `log(N / df)`. Rare terms (low df) score higher; terms that appear in
 * every document score ~0 and stop mattering. Returns 0 when the term is absent so queries can be
 * scored uniformly.
 */
export function idf(inverted: InvertedIndex, term: string, n: number): number {
  const d = df(inverted, term)
  if (d === 0) return 0
  return Math.log(n / d)
}

/**
 * Score every document against the query terms using TF-IDF. For each query term we walk its posting
 * list and add `tf · idf` to every document that contains it; documents that contain none of the
 * terms never appear (score 0 ⇒ unranked). Pure & deterministic.
 */
export function query(
  inverted: InvertedIndex,
  terms: readonly string[],
  n: number,
): Map<string, number> {
  const scores = new Map<string, number>()
  for (const term of terms) {
    const w = idf(inverted, term, n)
    if (w === 0) continue // term absent or zero-weight: contributes nothing
    const postings = inverted.get(term)
    if (!postings) continue
    for (const p of postings) {
      scores.set(p.docId, (scores.get(p.docId) ?? 0) + p.tf * w)
    }
  }
  return scores
}

/**
 * Rank scored documents highest-first. Ties are broken by docId (ascending) so the order is fully
 * deterministic — the same scores always yield the same ranking.
 */
export function rank(scores: Map<string, number>): ScoredDoc[] {
  const out: ScoredDoc[] = []
  for (const [docId, score] of scores) out.push({ docId, score })
  out.sort((a, b) => (b.score > a.score ? 1 : b.score < a.score ? -1 : a.docId < b.docId ? -1 : 1))
  return out
}

/** Convenience: index → query → rank in one call. */
export function search(docs: readonly Doc[], terms: readonly string[]): ScoredDoc[] {
  const { inverted, n } = index(docs)
  return rank(query(inverted, terms, n))
}

/** Normalize a query string the same way documents are tokenized. */
export function tokenizeQuery(q: string): string[] {
  return tokenize(q)
}
