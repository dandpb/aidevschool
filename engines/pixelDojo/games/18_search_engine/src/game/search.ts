// Pure full-text search logic for the Posting Lattice teaching game.
//
// No three.js, no DOM — fully deterministic. Both the renderer (main.ts) and
// the unit tests import from here so the rules of the simulation are anchored
// in one place. The mechanic encodes the curriculum's primary learning
// objective (curriculum/18_search_engine/docs/spec.md): raw text becomes
// searchable terms through Unicode-aware normalization; an inverted index maps
// each term to positional postings; boolean/phrase queries are evaluated with
// strict precedence (parens > NOT > AND > OR); ranking uses BM25.
//
// The wave's contract: 5 query orbs over a fixed 5-document corpus. Each orb
// carries a query string + a target document. The player must classify each
// orb as MATCH (Z — the query retrieves the target doc) or REJECT (X — the
// query does NOT retrieve the target doc). Two orbs are traps where the
// surface form suggests a match but the correct evaluation excludes the
// target. Passing requires zero misclassifications and full BM25 coverage.

// --- Tokenization (FR-002, FR-003) -----------------------------------------

// Stop words shared between indexing and querying so query-side boolean
// evaluation is consistent with the corpus. Tiny on purpose — the game shows
// every kept token on screen.
export const STOP_WORDS: ReadonlySet<string> = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "at",
  "by",
  "from",
  "is",
  "it",
  "this",
  "that",
])

// Deterministic Unicode-aware normalization:
//   - lowercase via String.prototype.toLowerCase (Unicode Default Case Folding)
//   - strip leading/trailing punctuation; collapse internal punctuation runs
//   - split on whitespace
//   - drop empties and configured stop words
export function tokenize(text: string): string[] {
  const lower = text.toLowerCase()
  // Treat any run of non-letter/non-number characters as a separator. This
  // keeps the tokenizer deterministic across the corpus and the query side
  // (an "at-least-once" becomes three tokens: at, least, once).
  const rough = lower.split(/[^0-9a-zÀ-ɏ一-鿿]+/i)
  const out: string[] = []
  for (const piece of rough) {
    if (piece.length === 0) continue
    if (STOP_WORDS.has(piece)) continue
    out.push(piece)
  }
  return out
}

// --- Documents + inverted index (FR-004, FR-005) ---------------------------

export type Document = {
  readonly id: string
  readonly title: string
  readonly body: string
  readonly tokens: readonly string[]
}

export type Posting = {
  readonly docId: string
  readonly termFrequency: number
  readonly positions: readonly number[]
}

export type InvertedIndex = {
  readonly documents: ReadonlyMap<string, Document>
  readonly postings: ReadonlyMap<string, Posting[]>
  readonly documentCount: number
  readonly averageDocumentLength: number
}

export function makeDocument(id: string, title: string, body: string): Document {
  return { id, title, body, tokens: tokenize(body) }
}

// Build the inverted index from a corpus. Each unique term maps to a postings
// list sorted by docId with positions preserved (FR-003).
export function buildIndex(corpus: readonly Document[]): InvertedIndex {
  const documents = new Map<string, Document>()
  const postings = new Map<string, Posting[]>()
  let totalLength = 0
  for (const doc of corpus) {
    documents.set(doc.id, doc)
    totalLength += doc.tokens.length
    // Position map per doc for this pass.
    const positionsByTerm = new Map<string, number[]>()
    doc.tokens.forEach((tok, idx) => {
      const list = positionsByTerm.get(tok)
      if (list) {
        list.push(idx)
      } else {
        positionsByTerm.set(tok, [idx])
      }
    })
    for (const [term, positions] of positionsByTerm) {
      const posting: Posting = {
        docId: doc.id,
        termFrequency: positions.length,
        positions,
      }
      const existing = postings.get(term)
      if (existing) {
        existing.push(posting)
      } else {
        postings.set(term, [posting])
      }
    }
  }
  // Sort each postings list by docId for deterministic iteration.
  for (const list of postings.values()) {
    list.sort((a, b) => (a.docId < b.docId ? -1 : a.docId > b.docId ? 1 : 0))
  }
  return {
    documents,
    postings,
    documentCount: documents.size,
    averageDocumentLength: documents.size === 0 ? 0 : totalLength / documents.size,
  }
}

export function documentFrequency(index: InvertedIndex, term: string): number {
  return index.postings.get(term)?.length ?? 0
}

export function postingFor(index: InvertedIndex, term: string, docId: string): Posting | null {
  const list = index.postings.get(term)
  if (!list) return null
  for (const p of list) {
    if (p.docId === docId) return p
  }
  return null
}

// --- Phrase / proximity (FR-010) -------------------------------------------

// Returns true when phraseTerms appear in adjacent, ordered positions in the
// target document. Empty phrase matches nothing; single-term phrase degrades
// to ordinary term presence.
export function phraseMatches(
  index: InvertedIndex,
  docId: string,
  phraseTerms: readonly string[],
): boolean {
  if (phraseTerms.length === 0) return false
  if (phraseTerms.length === 1) {
    const term = phraseTerms[0]
    if (!term) return false
    return postingFor(index, term, docId) !== null
  }
  const first = phraseTerms[0]
  if (!first) return false
  const head = postingFor(index, first, docId)
  if (!head) return false
  for (const start of head.positions) {
    let cursor = start
    let ok = true
    for (let i = 1; i < phraseTerms.length; i += 1) {
      const term = phraseTerms[i]
      if (!term) {
        ok = false
        break
      }
      const p = postingFor(index, term, docId)
      if (!p) {
        ok = false
        break
      }
      cursor += 1
      if (!p.positions.includes(cursor)) {
        ok = false
        break
      }
    }
    if (ok) return true
  }
  return false
}

// --- Query AST + parser (FR-008, FR-009) -----------------------------------

export type QueryNode =
  | { readonly type: "term"; readonly value: string }
  | { readonly type: "phrase"; readonly terms: readonly string[] }
  | { readonly type: "and"; readonly left: QueryNode; readonly right: QueryNode }
  | { readonly type: "or"; readonly left: QueryNode; readonly right: QueryNode }
  | { readonly type: "not"; readonly operand: QueryNode }

export class QuerySyntaxError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "QuerySyntaxError"
  }
}

// Tokenizer for the query language: recognizes quoted phrases, identifiers,
// parentheses, and the reserved words AND/OR/NOT (case-sensitive uppercase per
// the spec's API contract; lowercase "and"/"or" would be ordinary terms).
type QueryToken =
  | { kind: "term"; value: string }
  | { kind: "phrase"; terms: string[] }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "and" }
  | { kind: "or" }
  | { kind: "not" }

function lexQuery(input: string): QueryToken[] {
  const tokens: QueryToken[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    if (!ch) break
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (ch === "(") {
      tokens.push({ kind: "lparen" })
      i += 1
      continue
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen" })
      i += 1
      continue
    }
    if (ch === '"') {
      // Phrase: read until the closing quote.
      let j = i + 1
      let body = ""
      while (j < input.length && input[j] !== '"') {
        const c = input[j]
        if (!c) break
        body += c
        j += 1
      }
      if (j >= input.length) {
        throw new QuerySyntaxError("unterminated quote in phrase")
      }
      const terms = tokenize(body)
      tokens.push({ kind: "phrase", terms })
      i = j + 1
      continue
    }
    // Identifier or reserved word. Read until whitespace, paren, or quote.
    let j = i
    let body = ""
    while (j < input.length) {
      const c = input[j]
      if (!c) break
      if (/\s/.test(c) || c === "(" || c === ")" || c === '"') break
      body += c
      j += 1
    }
    if (body === "AND") {
      tokens.push({ kind: "and" })
    } else if (body === "OR") {
      tokens.push({ kind: "or" })
    } else if (body === "NOT") {
      tokens.push({ kind: "not" })
    } else {
      // Single-term queries are normalized through the same tokenizer so a
      // query for "Cache!" lowercases to "cache" and matches the corpus.
      const normalized = tokenize(body)
      if (normalized.length === 0) {
        throw new QuerySyntaxError(`invalid term near '${body}'`)
      }
      if (normalized.length === 1) {
        tokens.push({ kind: "term", value: normalized[0] as string })
      } else {
        // An identifier that splits into multiple tokens (e.g. "at-least-once")
        // is treated as a phrase of those tokens.
        tokens.push({ kind: "phrase", terms: normalized })
      }
    }
    i = j
  }
  return tokens
}

// Recursive-descent parser enforcing precedence (highest to lowest):
//   parentheses > NOT > AND > OR
//   parseOr  := parseAnd (OR parseAnd)*
//   parseAnd := parseNot (("AND" | implicit-before-NOT) parseNot)*
//   parseNot := NOT parseNot | parseAtom
//   parseAtom:= term | phrase | "(" parseOr ")"
//
// Documented sugar: `a NOT b` is interpreted as `a AND (NOT b)` — the NOT
// token acts as both a unary operator and an implicit AND combinator. This is
// the only implicit-AND form; two ordinary terms with no operator (e.g.
// `a b`) remain a syntax error per FR-008 (AND/OR/NOT are the combinators).
export function parseQuery(input: string): QueryNode {
  const tokens = lexQuery(input)
  let pos = 0

  function peek(): QueryToken | null {
    return tokens[pos] ?? null
  }
  function eat(): QueryToken {
    const t = tokens[pos]
    if (!t) throw new QuerySyntaxError("unexpected end of query")
    pos += 1
    return t
  }

  function parseAtom(): QueryNode {
    const t = peek()
    if (!t) throw new QuerySyntaxError("expected term or '('")
    if (t.kind === "lparen") {
      eat()
      const inner = parseOr()
      const close = peek()
      if (close?.kind !== "rparen") {
        throw new QuerySyntaxError("missing ')'")
      }
      eat()
      return inner
    }
    if (t.kind === "term") {
      eat()
      return { type: "term", value: t.value }
    }
    if (t.kind === "phrase") {
      eat()
      return { type: "phrase", terms: t.terms }
    }
    throw new QuerySyntaxError(`unexpected token near '${tokenLabel(t)}'`)
  }

  function parseNot(): QueryNode {
    const t = peek()
    if (t && t.kind === "not") {
      eat()
      const operand = parseNot()
      return { type: "not", operand }
    }
    return parseAtom()
  }

  function parseAnd(): QueryNode {
    let left = parseNot()
    for (;;) {
      const t = peek()
      if (!t) break
      if (t.kind === "and") {
        eat()
        const right = parseNot()
        left = { type: "and", left, right }
        continue
      }
      // Implicit AND before NOT: `a NOT b` => `a AND (NOT b)`. The NOT token
      // both starts a new high-precedence operand and implies the combinator.
      if (t.kind === "not") {
        const right = parseNot()
        left = { type: "and", left, right }
        continue
      }
      break
    }
    return left
  }

  function parseOr(): QueryNode {
    let left = parseAnd()
    for (;;) {
      const t = peek()
      if (!t) break
      if (t.kind !== "or") break
      eat()
      const right = parseAnd()
      left = { type: "or", left, right }
    }
    return left
  }

  const node = parseOr()
  if (pos !== tokens.length) {
    const leftover = tokens[pos]
    throw new QuerySyntaxError(
      `unexpected trailing token '${leftover ? tokenLabel(leftover) : ""}'`,
    )
  }
  return node
}

function tokenLabel(t: QueryToken): string {
  switch (t.kind) {
    case "term":
      return t.value
    case "phrase":
      return `"${t.terms.join(" ")}"`
    case "lparen":
      return "("
    case "rparen":
      return ")"
    case "and":
      return "AND"
    case "or":
      return "OR"
    case "not":
      return "NOT"
  }
}

// --- Query evaluation (FR-008, FR-009, FR-010) -----------------------------

// Boolean evaluation against one document: NOT is interpreted locally
// ("does this operand fail to match the doc") so the player can compose
// queries like `cache NOT queue` as `cache AND (NOT queue)`. Standalone
// `NOT queue` evaluates to "every doc that lacks queue" — bounded by the
// corpus, never returns the empty set silently.
export function queryMatches(index: InvertedIndex, docId: string, node: QueryNode): boolean {
  switch (node.type) {
    case "term":
      return postingFor(index, node.value, docId) !== null
    case "phrase":
      return phraseMatches(index, docId, node.terms)
    case "and":
      return queryMatches(index, docId, node.left) && queryMatches(index, docId, node.right)
    case "or":
      return queryMatches(index, docId, node.left) || queryMatches(index, docId, node.right)
    case "not":
      return !queryMatches(index, docId, node.operand)
  }
}

// Convenience: parse + evaluate in one call. Throws QuerySyntaxError upward.
export function evaluateQuery(index: InvertedIndex, docId: string, query: string): boolean {
  return queryMatches(index, docId, parseQuery(query))
}

// --- Ranking (FR-006, FR-007) ----------------------------------------------

// Standard BM25 with k1=1.5, b=0.75. Returns 0 for documents that don't
// contain the term. Used by the renderer for HUD score readouts.
export const BM25_K1 = 1.5
export const BM25_B = 0.75

export function bm25TermScore(index: InvertedIndex, term: string, docId: string): number {
  const posting = postingFor(index, term, docId)
  if (!posting) return 0
  const df = documentFrequency(index, term)
  if (df === 0) return 0
  const N = index.documentCount
  const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5))
  const doc = index.documents.get(docId)
  if (!doc) return 0
  const avg = index.averageDocumentLength || 1
  const tf = posting.termFrequency
  const denom = tf + BM25_K1 * (1 - BM25_B + BM25_B * (doc.tokens.length / avg))
  return idf * ((tf * (BM25_K1 + 1)) / denom)
}

// --- The wave (5 query orbs over a fixed 5-doc corpus) ---------------------

export const CORPUS: readonly Document[] = [
  makeDocument("doc_a", "Cache Hashing", "Distributed cache with consistent hashing"),
  makeDocument("doc_b", "Cache Replicated", "Distributed cache replicated across regions"),
  makeDocument("doc_c", "Message Queue", "Message queue with at least once delivery"),
  makeDocument("doc_d", "Rate Limiter", "Rate limiter token bucket algorithm"),
  makeDocument("doc_e", "Cache Queue Ordering", "Cache eviction policy with queue ordering"),
] as const

// A query orb pairs a query string with the target document the player must
// classify. `shouldBeMatch=true` means the query truly retrieves the target
// document; the player must press Z. `shouldBeMatch=false` is a trap where
// the query looks like a match but does not actually retrieve the target; the
// player must press X.
export type QueryOrb = {
  readonly id: string
  readonly query: string
  readonly targetDocId: string
  readonly shouldBeMatch: boolean
  /** Free-text label for the player explaining which retrieval primitive the orb exercises. */
  readonly exercise: string
}

export const WAVE_ORBS: readonly QueryOrb[] = [
  {
    id: "q1",
    query: "cache",
    targetDocId: "doc_a",
    shouldBeMatch: true,
    exercise: "single-term lookup",
  },
  {
    id: "q2",
    query: '"distributed cache"',
    targetDocId: "doc_a",
    shouldBeMatch: true,
    exercise: "phrase adjacency",
  },
  {
    id: "q3",
    query: "cache OR queue",
    targetDocId: "doc_d",
    shouldBeMatch: false,
    exercise: "OR trap (target has neither)",
  },
  {
    id: "q4",
    query: "cache AND queue",
    targetDocId: "doc_e",
    shouldBeMatch: true,
    exercise: "boolean AND",
  },
  {
    id: "q5",
    query: "cache NOT queue",
    targetDocId: "doc_e",
    shouldBeMatch: false,
    exercise: "NOT trap (target has queue, excluded)",
  },
] as const

export const WAVE_ORB_COUNT = WAVE_ORBS.length
export const WAVE_EXPECTED_MATCHES = WAVE_ORBS.filter((o) => o.shouldBeMatch).length
export const WAVE_EXPECTED_REJECTS = WAVE_ORBS.filter((o) => !o.shouldBeMatch).length

// --- Metrics + actions -----------------------------------------------------

export type OrbOutcome =
  | { readonly kind: "match-correct"; readonly orb: QueryOrb }
  | { readonly kind: "match-wrong"; readonly orb: QueryOrb }
  | { readonly kind: "reject-correct"; readonly orb: QueryOrb }
  | { readonly kind: "reject-wrong"; readonly orb: QueryOrb }

export type Metrics = {
  readonly kind: "threejs-posting-lattice"
  readonly orbs_classified: number
  readonly matches_correct: number
  readonly matches_wrong: number
  readonly rejects_correct: number
  readonly rejects_wrong: number
  readonly terms_indexed: number
  readonly documents_indexed: number
  readonly average_document_length: number
  readonly bm25_top_score: number
  readonly query_parse_errors: number
  readonly index_lookup_p95_ms: number
  readonly parse_p95_ms: number
}

export function freshMetrics(index: InvertedIndex): Metrics {
  let topScore = 0
  for (const doc of index.documents.values()) {
    for (const term of new Set(doc.tokens)) {
      const s = bm25TermScore(index, term, doc.id)
      if (s > topScore) topScore = s
    }
  }
  return {
    kind: "threejs-posting-lattice",
    orbs_classified: 0,
    matches_correct: 0,
    matches_wrong: 0,
    rejects_correct: 0,
    rejects_wrong: 0,
    terms_indexed: index.postings.size,
    documents_indexed: index.documentCount,
    average_document_length: index.averageDocumentLength,
    bm25_top_score: topScore,
    query_parse_errors: 0,
    // Simulated latencies (millisecond magnitudes shown on the HUD bars).
    // Index lookup is a postings merge (~microseconds in real engines,
    // magnified here to make the comparison visible); parsing is trivial.
    index_lookup_p95_ms: 38,
    parse_p95_ms: 4,
  }
}

// Player pressed Z (MATCH). The action is correct iff the orb's query truly
// retrieves the target document under the live inverted index. The orb's
// shouldBeMatch flag mirrors this truth (asserted by the wave's invariant
// test); we evaluate against the index on every action so the renderer's
// classification is anchored in the same retrieval code the unit tests cover.
export function classifyMatch(orb: QueryOrb, index: InvertedIndex): OrbOutcome {
  const truth = evaluateQuery(index, orb.targetDocId, orb.query)
  return truth ? { kind: "match-correct", orb } : { kind: "match-wrong", orb }
}

// Player pressed X (REJECT). Symmetric to classifyMatch: correct iff the
// inverted index says the query does NOT retrieve the target document.
export function classifyReject(orb: QueryOrb, index: InvertedIndex): OrbOutcome {
  const truth = evaluateQuery(index, orb.targetDocId, orb.query)
  return truth ? { kind: "reject-wrong", orb } : { kind: "reject-correct", orb }
}

export function applyOutcome(metrics: Metrics, outcome: OrbOutcome): Metrics {
  switch (outcome.kind) {
    case "match-correct":
      return {
        ...metrics,
        orbs_classified: metrics.orbs_classified + 1,
        matches_correct: metrics.matches_correct + 1,
      }
    case "match-wrong":
      return {
        ...metrics,
        orbs_classified: metrics.orbs_classified + 1,
        matches_wrong: metrics.matches_wrong + 1,
      }
    case "reject-correct":
      return {
        ...metrics,
        orbs_classified: metrics.orbs_classified + 1,
        rejects_correct: metrics.rejects_correct + 1,
      }
    case "reject-wrong":
      return {
        ...metrics,
        orbs_classified: metrics.orbs_classified + 1,
        rejects_wrong: metrics.rejects_wrong + 1,
      }
  }
}

// --- Pass rule / gates -----------------------------------------------------

export type GateCheck = {
  readonly name: string
  readonly passed: boolean
}

export function gateChecks(metrics: Metrics): GateCheck[] {
  return [
    {
      name: "matches_wrong===0",
      passed: metrics.matches_wrong === 0,
    },
    { name: "rejects_wrong===0", passed: metrics.rejects_wrong === 0 },
    {
      name: `matches_correct===${WAVE_EXPECTED_MATCHES}`,
      passed: metrics.matches_correct === WAVE_EXPECTED_MATCHES,
    },
    {
      name: `rejects_correct===${WAVE_EXPECTED_REJECTS}`,
      passed: metrics.rejects_correct === WAVE_EXPECTED_REJECTS,
    },
    {
      name: `orbs_classified===${WAVE_ORB_COUNT}`,
      passed: metrics.orbs_classified === WAVE_ORB_COUNT,
    },
    { name: "documents_indexed===5", passed: metrics.documents_indexed === 5 },
    { name: "terms_indexed>0", passed: metrics.terms_indexed > 0 },
    { name: "average_document_length>0", passed: metrics.average_document_length > 0 },
    { name: "bm25_top_score>0", passed: metrics.bm25_top_score > 0 },
    { name: "index_lookup_p95_ms>0", passed: metrics.index_lookup_p95_ms > 0 },
    { name: "parse_p95_ms>0", passed: metrics.parse_p95_ms > 0 },
  ]
}

export function passRule(metrics: Metrics): boolean {
  return gateChecks(metrics).every((g) => g.passed)
}
