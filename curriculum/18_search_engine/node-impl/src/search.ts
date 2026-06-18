const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "must", "shall", "can", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "up", "about", "into", "over", "after", "before", "under",
  "it", "its", "this", "that", "these", "those", "i", "you", "he", "she", "we",
]);

export function tokenize(text: string): string[] {
  return text
    .split(/[^a-zA-Z0-9]+/)
    .filter((s) => s.length > 0)
    .map((s) => s.toLowerCase())
    .filter((s) => !STOP_WORDS.has(s));
}

interface Posting {
  docId: number;
  termFreq: number;
}

export interface SearchResult {
  doc_id: number;
  title: string;
  score: number;
}

export class InvertedIndex {
  private index = new Map<string, Posting[]>();
  private documents = new Map<number, string>();
  private docCount = 0;
  private docLengths = new Map<number, number>();

  addDocument(title: string, content: string): number {
    const docId = this.docCount++;
    this.documents.set(docId, title);

    const tokens = tokenize(content);
    this.docLengths.set(docId, tokens.length);

    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    for (const [term, freq] of tf) {
      const postings = this.index.get(term) ?? [];
      postings.push({ docId, termFreq: freq });
      this.index.set(term, postings);
    }

    return docId;
  }

  search(query: string, limit: number): SearchResult[] {
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0 || this.docCount === 0) return [];

    const N = this.docCount;
    const scores = new Map<number, number>();

    for (const term of queryTerms) {
      const postings = this.index.get(term);
      if (!postings) continue;

      const df = postings.length;
      const idf = 1 + Math.log(N / df);

      for (const p of postings) {
        const docLen = this.docLengths.get(p.docId) ?? 1;
        const tf = p.termFreq / docLen;
        scores.set(p.docId, (scores.get(p.docId) ?? 0) + tf * idf);
      }
    }

    const results: SearchResult[] = [];
    for (const [docId, score] of scores) {
      results.push({
        doc_id: docId,
        title: this.documents.get(docId) ?? "",
        score,
      });
    }

    results.sort((a, b) => b.score - a.score);

    if (limit > 0 && results.length > limit) {
      return results.slice(0, limit);
    }
    return results;
  }

  get documentCount(): number {
    return this.docCount;
  }
}
