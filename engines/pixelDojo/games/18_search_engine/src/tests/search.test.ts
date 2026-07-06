import { describe, expect, it } from "vitest"
import { buildEvidence, emitEvidence, validateEvidenceRecord } from "../game/evidence"
import {
  applyOutcome,
  bm25TermScore,
  buildIndex,
  CORPUS,
  classifyMatch,
  classifyReject,
  documentFrequency,
  evaluateQuery,
  freshMetrics,
  gateChecks,
  makeDocument,
  parseQuery,
  phraseMatches,
  postingFor,
  type QueryNode,
  tokenize,
  WAVE_EXPECTED_MATCHES,
  WAVE_EXPECTED_REJECTS,
  WAVE_ORB_COUNT,
  WAVE_ORBS,
} from "../game/search"

describe("tokenize (FR-002)", () => {
  it("lowercases, strips punctuation, splits on whitespace", () => {
    expect(tokenize("Distributed Cache, with Consistent-Hashing!")).toEqual([
      "distributed",
      "cache",
      "consistent",
      "hashing",
    ])
  })

  it("drops stop words but keeps meaningful tokens", () => {
    expect(tokenize("the cache with a queue")).toEqual(["cache", "queue"])
  })

  it("returns an empty array for whitespace-only or all-stop-word input", () => {
    expect(tokenize("")).toEqual([])
    expect(tokenize("the and or")).toEqual([])
  })

  it("splits hyphenated identifiers into separate tokens deterministically (stop words still drop)", () => {
    // "at" is a stop word, so the hyphenated form drops it along the way.
    expect(tokenize("at-least-once")).toEqual(["least", "once"])
    // A hyphenated form with no stop words survives intact.
    expect(tokenize("rate-limiter")).toEqual(["rate", "limiter"])
  })
})

describe("buildIndex + postings (FR-004, FR-005)", () => {
  const index = buildIndex(CORPUS)

  it("indexes every document and exposes the document count", () => {
    expect(index.documentCount).toBe(5)
    expect(index.documents.get("doc_a")?.tokens).toContain("cache")
  })

  it("stores positional postings sorted by document id", () => {
    const cachePostings = index.postings.get("cache")
    expect(cachePostings).toBeDefined()
    expect(cachePostings?.map((p) => p.docId)).toEqual(["doc_a", "doc_b", "doc_e"])
    const docA = postingFor(index, "cache", "doc_a")
    expect(docA?.positions).toEqual([1])
    expect(docA?.termFrequency).toBe(1)
  })

  it("documentFrequency reports the postings-list length", () => {
    expect(documentFrequency(index, "cache")).toBe(3)
    expect(documentFrequency(index, "nonexistent")).toBe(0)
  })

  it("averageDocumentLength is the corpus mean of token counts", () => {
    expect(index.averageDocumentLength).toBeGreaterThan(0)
    const total = CORPUS.map((d) => d.tokens.length).reduce((a, b) => a + b, 0)
    expect(index.averageDocumentLength).toBeCloseTo(total / CORPUS.length, 5)
  })
})

describe("phraseMatches (FR-010)", () => {
  const index = buildIndex(CORPUS)

  it("matches when the phrase terms appear adjacent and ordered", () => {
    expect(phraseMatches(index, "doc_a", ["distributed", "cache"])).toBe(true)
    expect(phraseMatches(index, "doc_b", ["distributed", "cache"])).toBe(true)
  })

  it("does not match when the terms are present but non-adjacent", () => {
    // doc_e has cache and queue but not adjacent.
    expect(phraseMatches(index, "doc_e", ["cache", "queue"])).toBe(false)
  })

  it("returns false for an empty phrase and degrades a single-term phrase to term presence", () => {
    expect(phraseMatches(index, "doc_a", [])).toBe(false)
    expect(phraseMatches(index, "doc_a", ["cache"])).toBe(true)
    expect(phraseMatches(index, "doc_d", ["cache"])).toBe(false)
  })
})

describe("parseQuery precedence (FR-009: parens > NOT > AND > OR)", () => {
  it("parses a single term", () => {
    const node = parseQuery("cache") as Extract<QueryNode, { type: "term" }>
    expect(node.type).toBe("term")
    expect(node.value).toBe("cache")
  })

  it("parses a quoted phrase into a phrase node with normalized terms", () => {
    const node = parseQuery('"distributed cache"') as Extract<QueryNode, { type: "phrase" }>
    expect(node.type).toBe("phrase")
    expect(node.terms).toEqual(["distributed", "cache"])
  })

  it("binds AND tighter than OR", () => {
    // cache OR queue AND eviction  ==>  cache OR (queue AND eviction)
    const node = parseQuery("cache OR queue AND eviction") as Extract<QueryNode, { type: "or" }>
    expect(node.type).toBe("or")
    expect(node.left.type).toBe("term")
    expect(node.right.type).toBe("and")
  })

  it("binds NOT tighter than AND", () => {
    // cache AND NOT queue  ==>  cache AND (NOT queue)
    const node = parseQuery("cache AND NOT queue") as Extract<QueryNode, { type: "and" }>
    expect(node.type).toBe("and")
    expect(node.right.type).toBe("not")
  })

  it("documents the `a NOT b` sugar as `a AND (NOT b)`", () => {
    const node = parseQuery("cache NOT queue") as Extract<QueryNode, { type: "and" }>
    expect(node.type).toBe("and")
    expect(node.left.type).toBe("term")
    expect(node.right.type).toBe("not")
  })

  it("parentheses override default precedence", () => {
    // (cache OR queue) AND eviction  ==>  AND(OR(cache, queue), eviction)
    const node = parseQuery("(cache OR queue) AND eviction") as Extract<QueryNode, { type: "and" }>
    expect(node.type).toBe("and")
    expect(node.left.type).toBe("or")
    expect(node.right.type).toBe("term")
  })

  it("rejects unmatched parenthesis", () => {
    expect(() => parseQuery("(cache OR queue")).toThrow()
  })

  it("rejects unterminated phrase quote", () => {
    expect(() => parseQuery('"distributed cache')).toThrow()
  })

  it("rejects two adjacent atoms with no operator (implicit AND forbidden)", () => {
    expect(() => parseQuery("cache queue")).toThrow()
  })
})

describe("queryMatches evaluation (FR-008)", () => {
  const index = buildIndex(CORPUS)

  it("single term matches any doc containing the term", () => {
    expect(evaluateQuery(index, "doc_a", "cache")).toBe(true)
    expect(evaluateQuery(index, "doc_d", "cache")).toBe(false)
  })

  it("AND requires both operands", () => {
    expect(evaluateQuery(index, "doc_e", "cache AND queue")).toBe(true)
    expect(evaluateQuery(index, "doc_a", "cache AND queue")).toBe(false)
  })

  it("OR requires at least one operand", () => {
    expect(evaluateQuery(index, "doc_a", "cache OR queue")).toBe(true)
    expect(evaluateQuery(index, "doc_d", "cache OR queue")).toBe(false)
  })

  it("NOT excludes docs containing the negated term", () => {
    expect(evaluateQuery(index, "doc_a", "cache NOT queue")).toBe(true)
    expect(evaluateQuery(index, "doc_e", "cache NOT queue")).toBe(false)
  })

  it("parentheses change the result set: cache AND (queue OR eviction) vs cache AND queue OR eviction", () => {
    // doc_e has cache + queue + eviction. Both forms match doc_e.
    expect(evaluateQuery(index, "doc_e", "cache AND (queue OR eviction)")).toBe(true)
    // The unparenthesized form parses as (cache AND queue) OR eviction —
    // still matches doc_e, but for a different reason. The precedence test
    // is structural (parseQuery) above.
    expect(evaluateQuery(index, "doc_e", "cache AND queue OR eviction")).toBe(true)
    // doc_a has cache but neither queue nor eviction: AND-of-both-forms false.
    expect(evaluateQuery(index, "doc_a", "cache AND (queue OR eviction)")).toBe(false)
  })
})

describe("bm25TermScore (FR-006)", () => {
  const index = buildIndex(CORPUS)

  it("returns 0 for documents that lack the term", () => {
    expect(bm25TermScore(index, "cache", "doc_d")).toBe(0)
  })

  it("returns a positive score for documents that contain the term", () => {
    expect(bm25TermScore(index, "cache", "doc_a")).toBeGreaterThan(0)
  })

  it("rarer terms score higher than common terms in the same document length band", () => {
    // "cache" appears in 3 docs; "rate" appears in 1. The rare term should
    // out-score the common one for a same-length single-occurrence doc.
    const cache = bm25TermScore(index, "cache", "doc_a")
    const rate = bm25TermScore(index, "rate", "doc_d")
    expect(rate).toBeGreaterThan(cache)
  })
})

describe("the wave (5 query orbs over the fixed corpus)", () => {
  const index = buildIndex(CORPUS)

  it("has 5 orbs: 3 matches and 2 rejects", () => {
    expect(WAVE_ORB_COUNT).toBe(5)
    expect(WAVE_EXPECTED_MATCHES).toBe(3)
    expect(WAVE_EXPECTED_REJECTS).toBe(2)
  })

  it("every orb's shouldBeMatch flag agrees with the inverted-index ground truth", () => {
    for (const orb of WAVE_ORBS) {
      const truth = evaluateQuery(index, orb.targetDocId, orb.query)
      expect(truth).toBe(orb.shouldBeMatch)
    }
  })

  it("classifyMatch returns match-correct iff the query truly retrieves the target", () => {
    const correct = classifyMatch(WAVE_ORBS[0] as never, index)
    expect(correct.kind).toBe("match-correct")
    // The third orb is the OR trap; classifying it as MATCH is wrong.
    const wrong = classifyMatch(WAVE_ORBS[2] as never, index)
    expect(wrong.kind).toBe("match-wrong")
  })

  it("classifyReject returns reject-correct iff the query truly does NOT retrieve the target", () => {
    const correct = classifyReject(WAVE_ORBS[2] as never, index)
    expect(correct.kind).toBe("reject-correct")
    // The first orb is a true match; rejecting it is wrong.
    const wrong = classifyReject(WAVE_ORBS[0] as never, index)
    expect(wrong.kind).toBe("reject-wrong")
  })
})

describe("applyOutcome + passRule (the gate)", () => {
  const index = buildIndex(CORPUS)

  it("passes when the wave is played perfectly (Z Z X Z X)", () => {
    let metrics = freshMetrics(index)
    const actions: Array<"Z" | "X"> = ["Z", "Z", "X", "Z", "X"]
    WAVE_ORBS.forEach((orb, i) => {
      const action = actions[i]
      if (!action) return
      const outcome = action === "Z" ? classifyMatch(orb, index) : classifyReject(orb, index)
      metrics = applyOutcome(metrics, outcome)
    })
    expect(metrics.orbs_classified).toBe(5)
    expect(metrics.matches_correct).toBe(3)
    expect(metrics.rejects_correct).toBe(2)
    expect(metrics.matches_wrong).toBe(0)
    expect(metrics.rejects_wrong).toBe(0)
    const failing = gateChecks(metrics).filter((g) => !g.passed)
    expect(failing).toEqual([])
  })

  it("fails when the player leaks the OR trap (Z instead of X on orb 3)", () => {
    let metrics = freshMetrics(index)
    metrics = applyOutcome(metrics, classifyMatch(WAVE_ORBS[2] as never, index))
    expect(metrics.matches_wrong).toBe(1)
    const leak = gateChecks(metrics).find((g) => g.name === "matches_wrong===0")
    expect(leak?.passed).toBe(false)
  })

  it("fails when the player rejects a true match (X instead of Z on orb 1)", () => {
    let metrics = freshMetrics(index)
    metrics = applyOutcome(metrics, classifyReject(WAVE_ORBS[0] as never, index))
    expect(metrics.rejects_wrong).toBe(1)
    const gate = gateChecks(metrics).find((g) => g.name === "rejects_wrong===0")
    expect(gate?.passed).toBe(false)
  })
})

describe("evidence emission", () => {
  const index = buildIndex(CORPUS)

  it("builds a valid record when passRule holds, and validateEvidenceRecord accepts it", () => {
    let metrics = freshMetrics(index)
    const actions: Array<"Z" | "X"> = ["Z", "Z", "X", "Z", "X"]
    WAVE_ORBS.forEach((orb, i) => {
      const action = actions[i]
      if (!action) return
      metrics = applyOutcome(
        metrics,
        action === "Z" ? classifyMatch(orb, index) : classifyReject(orb, index),
      )
    })
    const record = buildEvidence(metrics, new Date("2026-07-05T12:00:00.000Z"))
    expect(record.pass).toBe(true)
    expect(record.schema).toBe("18_search_engine-v1")
    expect(record.source).toBe("postinglattice")
    expect(record.unit_id).toBe("18_search_engine")
    expect(record.project).toBe("18_search_engine")
    expect(record.encounter_id).toBe("posting-lattice-01")
    expect(record.game).toBe("Posting Lattice")
    expect(record.metrics.kind).toBe("threejs-posting-lattice")
    expect(record.metrics.documents_indexed).toBe(5)
    expect(record.metrics.terms_indexed).toBeGreaterThan(0)
    expect(record.gates.length).toBeGreaterThan(0)
    expect(() => validateEvidenceRecord(record)).not.toThrow()
  })

  it("validateEvidenceRecord rejects records with the wrong source literal", () => {
    let metrics = freshMetrics(index)
    metrics = applyOutcome(metrics, classifyMatch(WAVE_ORBS[0] as never, index))
    const record = buildEvidence(metrics, new Date())
    const tampered = { ...record, source: "pixelquest" as const }
    expect(() => validateEvidenceRecord(tampered)).toThrow()
  })

  it("validateEvidenceRecord rejects records with a negative metric", () => {
    const record = buildEvidence(freshMetrics(index), new Date())
    const tampered = {
      ...record,
      metrics: { ...record.metrics, matches_wrong: -1 },
    }
    expect(() => validateEvidenceRecord(tampered)).toThrow()
  })

  it("emitEvidence publishes the record and returns it", () => {
    const record = buildEvidence(freshMetrics(index), new Date())
    expect(() => emitEvidence(record)).not.toThrow()
  })

  it("indexes an arbitrary document deterministically", () => {
    const doc = makeDocument("x", "X", "Hello, world! Hello again.")
    const idx = buildIndex([doc])
    expect(doc.tokens).toEqual(["hello", "world", "hello", "again"])
    expect(postingFor(idx, "hello", "x")?.positions).toEqual([0, 2])
  })
})
