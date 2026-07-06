import { describe, expect, it } from "vitest"
import { type Doc, df, idf, index, query, rank, search, tokenize, tokenizeQuery } from "./index"

const CORPUS: Doc[] = [
  { id: "doc-a", text: "the quick brown fox" },
  { id: "doc-b", text: "the lazy dog sleeps" },
  { id: "doc-c", text: "the quick dog and the lazy fox" },
]

describe("indexing builds correct posting lists", () => {
  it("each term maps to exactly the documents that contain it, with the right term frequency", () => {
    const { inverted, n } = index(CORPUS)
    expect(n).toBe(3)

    // "quick" appears in doc-a (1×) and doc-c (1×).
    const quick = inverted.get("quick") ?? []
    expect(quick).toEqual([
      { docId: "doc-a", tf: 1 },
      { docId: "doc-c", tf: 1 },
    ])

    // "the" appears in all three; doc-c has it twice (tf=2).
    const the = inverted.get("the") ?? []
    expect(the).toEqual([
      { docId: "doc-a", tf: 1 },
      { docId: "doc-b", tf: 1 },
      { docId: "doc-c", tf: 2 },
    ])

    // "fox" appears in doc-a and doc-c.
    expect((inverted.get("fox") ?? []).map((p) => p.docId)).toEqual(["doc-a", "doc-c"])
    // "sleeps" only in doc-b.
    expect((inverted.get("sleeps") ?? []).map((p) => p.docId)).toEqual(["doc-b"])
  })

  it("posting lists are sorted by docId so snapshots are deterministic", () => {
    const reversed: Doc[] = [...CORPUS].reverse()
    const a = index(CORPUS).inverted
    const b = index(reversed).inverted
    expect([...(a.get("the") ?? [])]).toEqual([...(b.get("the") ?? [])])
    expect([...(a.get("fox") ?? [])]).toEqual([...(b.get("fox") ?? [])])
  })

  it("df / idf: rare terms weigh more; omnipresent terms weigh ~0", () => {
    const { inverted, n } = index(CORPUS)
    expect(df(inverted, "the")).toBe(3)
    expect(df(inverted, "quick")).toBe(2)
    expect(df(inverted, "sleeps")).toBe(1)
    // idf of an omnipresent term is log(3/3) = 0; a unique term is log(3/1) > 0.
    expect(idf(inverted, "the", n)).toBe(0)
    expect(idf(inverted, "sleeps", n)).toBeCloseTo(Math.log(3), 6)
  })

  it("a token is absent from the index has df 0 and idf 0 (no crash)", () => {
    const { inverted, n } = index(CORPUS)
    expect(df(inverted, "missing")).toBe(0)
    expect(idf(inverted, "missing", n)).toBe(0)
  })
})

describe("a single-term query ranks matching docs by tf * idf", () => {
  it("'fox' returns doc-a and doc-c, ranked by score (here equal tf/idf → tie-broken by docId)", () => {
    const ranked = search(CORPUS, ["fox"])
    const ids = ranked.map((r) => r.docId)
    expect(ids).toContain("doc-a")
    expect(ids).toContain("doc-c")
    expect(ids).not.toContain("doc-b")
    // equal scores → docId ascending tie-break → doc-a before doc-c
    expect(ranked[0]?.docId).toBe("doc-a")
    expect(ranked[1]?.docId).toBe("doc-c")
    expect(ranked[0]?.score).toBeCloseTo(ranked[1]?.score ?? -1, 6)
  })

  it("'the' scores doc-c highest because it has tf=2 (more occurrences) despite idf=0... but idf=0 ⇒ no contribution ⇒ empty ranking", () => {
    // idf of an omnipresent term is 0, so every posting contributes 0 ⇒ the docs are NOT returned.
    const ranked = search(CORPUS, ["the"])
    expect(ranked).toHaveLength(0)
  })

  it("a term with tf>1 in one doc ranks that doc above a doc with tf=1 (idf shared, tf breaks tie)", () => {
    const docs: Doc[] = [
      { id: "once", text: "cat cat cat" }, // tf(cat)=3
      { id: "twice", text: "cat dog" }, // tf(cat)=1
      { id: "never", text: "dog dog" }, // tf(cat)=0
    ]
    const ranked = search(docs, ["cat"])
    expect(ranked.map((r) => r.docId)).toEqual(["once", "twice"])
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0)
  })
})

describe("a two-term query ranks docs-with-both above docs-with-one", () => {
  it("'dog fox' ranks doc-c (has both) above doc-a and doc-b (have one each)", () => {
    const ranked = search(CORPUS, ["dog", "fox"])
    const ids = ranked.map((r) => r.docId)
    expect(ids[0]).toBe("doc-c") // contains both dog and fox → sum of two contributions
    // doc-a has fox only; doc-b has dog only; both rank below doc-c
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0)
    expect(ids).toContain("doc-a")
    expect(ids).toContain("doc-b")
  })

  it("scores are additive: the both-terms doc's score equals the sum of its single-term scores", () => {
    const { inverted, n } = index(CORPUS)
    const dogFox = query(inverted, ["dog", "fox"], n).get("doc-c") ?? 0
    const dog = query(inverted, ["dog"], n).get("doc-c") ?? 0
    const fox = query(inverted, ["fox"], n).get("doc-c") ?? 0
    expect(dogFox).toBeCloseTo(dog + fox, 6)
  })
})

describe("rank() returns full deterministic order with tie-breaks", () => {
  it("multi-term query yields a stable, deterministic order across repeated calls", () => {
    const a = search(CORPUS, ["quick", "dog", "fox"])
    const b = search(CORPUS, ["quick", "dog", "fox"])
    expect(a).toEqual(b)
  })

  it("rank sorts strictly descending by score", () => {
    const scores = new Map<string, number>([
      ["x", 1.5],
      ["y", 3.0],
      ["z", 0.5],
    ])
    const ranked = rank(scores)
    expect(ranked.map((r) => r.docId)).toEqual(["y", "x", "z"])
    expect(ranked.map((r) => r.score)).toEqual([3.0, 1.5, 0.5])
  })

  it("ties break by docId ascending so identical scores never produce ambiguous order", () => {
    const scores = new Map<string, number>([
      ["b", 2],
      ["a", 2],
      ["c", 2],
    ])
    expect(rank(scores).map((r) => r.docId)).toEqual(["a", "b", "c"])
  })
})

describe("tokenize", () => {
  it("lowercases and splits on non-word characters, dropping empties", () => {
    expect(tokenize("Hello, WORLD!")).toEqual(["hello", "world"])
    expect(tokenize("The    QUICK-brown  ")).toEqual(["the", "quick", "brown"])
    expect(tokenize("")).toEqual([])
    expect(tokenizeQuery("Cat DOG fish")).toEqual(["cat", "dog", "fish"])
  })
})
