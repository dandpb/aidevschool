import {
  type Doc,
  index,
  query,
  rank,
  type ScoredDoc,
  search,
  tokenize,
  tokenizeQuery,
} from "./index"

export type LevelId = "L1" | "L2" | "L3" | "L4"

export interface LevelConfig {
  id: LevelId
  title: string
  lesson: string
  /** corpus the level indexes */
  docs: Doc[]
  /** the query terms the level fires */
  queryTerms: string[]
  passRule: string
}

/**
 * The corpus used by L1–L3. Five short documents whose inverted index is small enough to read at a
 * glance but rich enough to show term-frequency differences and ranking.
 */
const CORPUS: Doc[] = [
  { id: "doc-a", text: "the quick brown fox jumps" },
  { id: "doc-b", text: "the lazy dog sleeps quietly" },
  { id: "doc-c", text: "the quick dog and the lazy fox" },
  { id: "doc-d", text: "fox fox fox den under the hill" },
  { id: "doc-e", text: "quiet streams and lazy fish" },
]

/**
 * L4 uses a larger corpus so the full ranking has more than two layers and the player must read the
 * whole ordered list, not just "the top".
 */
const CORPUS_LARGE: Doc[] = [
  { id: "p1", text: "search engine inverted index ranking" },
  { id: "p2", text: "the search engine ranks documents by relevance" },
  { id: "p3", text: "an inverted index maps terms to posting lists" },
  { id: "p4", text: "ranking uses tf idf weighting of query terms" },
  { id: "p5", text: "document retrieval returns the top ranked matches" },
  { id: "p6", text: "query parsing splits the query into terms" },
  { id: "p7", text: "postings store document ids and term frequency" },
]

export const LEVELS: readonly LevelConfig[] = [
  {
    id: "L1",
    title: "File the word-card",
    lesson:
      "Each word-card is tokenized (lowercased, split on non-word) and filed onto the shelf of its term. A card lands on exactly one shelf.",
    docs: CORPUS,
    queryTerms: [],
    passRule: "Predict which shelf (term) each shown word-card lands on (≥3 of 4 correct).",
  },
  {
    id: "L2",
    title: "One-term query",
    lesson:
      "A one-term query reads that term's posting list and ranks the matching documents by score (tf · idf).",
    docs: CORPUS,
    queryTerms: ["fox"],
    passRule: "Predict the top-ranked document for the query 'fox'.",
  },
  {
    id: "L3",
    title: "Two-term query",
    lesson:
      "A two-term query sums each term's contribution. A document with both terms outranks one with only one.",
    docs: CORPUS,
    queryTerms: ["dog", "fox"],
    passRule: "Predict the top document for 'dog fox' — it must contain both terms.",
  },
  {
    id: "L4",
    title: "Ranking",
    lesson:
      "A multi-term query returns a full ranked list. Read off the whole order, not just the top.",
    docs: CORPUS_LARGE,
    queryTerms: ["search", "ranking", "inverted", "terms"],
    passRule: "Predict the full rank order (top 3) for the multi-term query.",
  },
] as const

export function levelConfig(id: LevelId): LevelConfig {
  const cfg = LEVELS.find((l) => l.id === id)
  if (!cfg) throw new Error(`unknown level ${id}`)
  return cfg
}

export interface LevelOutcome {
  pass: boolean
  metrics: Record<string, number | boolean | string>
}

/**
 * L1 — did the player predict the correct shelf (term) for each word-card? A word-card's shelf is
 * simply `tokenize(word)[0]`. `predictions` is an array of `{card, predicted}` pairs; `correct`
 * is the count of matches. Pass at ≥3 of 4 (≥75%).
 */
export function evaluateFiling(args: {
  cards: readonly string[]
  predictions: readonly string[]
}): LevelOutcome {
  const total = args.cards.length
  let correct = 0
  for (let i = 0; i < total; i++) {
    const card = args.cards[i]
    const guess = args.predictions[i]
    if (card === undefined || guess === undefined) continue
    const truth = tokenize(card)[0] ?? ""
    if (guess === truth) correct++
  }
  const accuracy = total === 0 ? 0 : correct / total
  return {
    pass: correct >= 3 && accuracy >= 0.75,
    metrics: {
      cards_total: total,
      cards_correct: correct,
      filing_accuracy: round2(accuracy),
    },
  }
}

/** L2 — predict the top document for a single-term query. */
export function evaluateTopDoc(args: {
  docs: readonly Doc[]
  terms: readonly string[]
  predictedTop: string
}): LevelOutcome {
  const ranked = search(args.docs, args.terms)
  const top = ranked[0]?.docId ?? ""
  const ok = args.predictedTop === top
  return {
    pass: ok,
    metrics: {
      top_prediction_ok: ok,
      predicted_top: args.predictedTop,
      actual_top: top,
      query: args.terms.join(" "),
      top_score: round2(ranked[0]?.score ?? 0),
      matches_returned: ranked.length,
    },
  }
}

/**
 * L3 — predict the top document for a two-term query, AND verify the top doc contains BOTH terms
 * (the lesson: docs-with-both rank higher than docs-with-one).
 */
export function evaluateTwoTerm(args: {
  docs: readonly Doc[]
  terms: readonly string[]
  predictedTop: string
}): LevelOutcome {
  const ranked = search(args.docs, args.terms)
  const top = ranked[0]?.docId ?? ""
  const ok = args.predictedTop === top
  // Confirm the top doc actually contains both query terms.
  const topDoc = docsById(args.docs, top)?.text ?? ""
  const topTokens = new Set(tokenize(topDoc))
  const bothTerms = args.terms.every((t) => topTokens.has(t))
  return {
    pass: ok && bothTerms,
    metrics: {
      top_prediction_ok: ok,
      predicted_top: args.predictedTop,
      actual_top: top,
      query: args.terms.join(" "),
      top_has_both_terms: bothTerms,
      top_score: round2(ranked[0]?.score ?? 0),
      matches_returned: ranked.length,
    },
  }
}

/**
 * L4 — predict the full top-3 rank order for a multi-term query. The order must match exactly
 * (positional comparison). Partial credit is not awarded — the lesson is reading the whole list.
 */
export function evaluateRanking(args: {
  docs: readonly Doc[]
  terms: readonly string[]
  predictedOrder: readonly string[]
  topK?: number
}): LevelOutcome {
  const k = args.topK ?? 3
  const ranked = search(args.docs, args.terms)
  const truth = ranked.slice(0, k).map((r) => r.docId)
  const predicted = args.predictedOrder.slice(0, k)
  let positionMatches = 0
  for (let i = 0; i < k; i++) {
    if (predicted[i] === truth[i]) positionMatches++
  }
  const ok = positionMatches === k && truth.length >= k
  return {
    pass: ok,
    metrics: {
      rank_order_ok: ok,
      query: args.terms.join(" "),
      position_matches: positionMatches,
      top_k: k,
      predicted_order: predicted.join(","),
      actual_order: truth.join(","),
      top_score: round2(ranked[0]?.score ?? 0),
    },
  }
}

/** Build the inverted index for a level's corpus (convenience for the scene/controller). */
export function levelIndex(cfg: LevelConfig): {
  inverted: ReturnType<typeof index>["inverted"]
  n: number
} {
  return index(cfg.docs)
}

/** Run a level's query and return the ranked list. */
export function levelRanking(cfg: LevelConfig): ScoredDoc[] {
  const { inverted, n } = index(cfg.docs)
  return rank(query(inverted, cfg.queryTerms, n))
}

/** All distinct terms in a corpus (the shelves), sorted — stable shelf layout. */
export function shelves(cfg: LevelConfig): string[] {
  return [...new Set(cfg.docs.flatMap((d) => tokenize(d.text)))].sort()
}

/** Tokens of a query (used to draw the query orb's term labels). */
export function levelQueryTerms(cfg: LevelConfig): string[] {
  return tokenizeQuery(cfg.queryTerms.join(" "))
}

function docsById(docs: readonly Doc[], id: string): Doc | undefined {
  return docs.find((d) => d.id === id)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
