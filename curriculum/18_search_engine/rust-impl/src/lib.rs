pub fn tokenize(text: &str) -> Vec<String> {
    const STOP_WORDS: &[&str] = &[
        "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
        "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
        "may", "might", "must", "shall", "can", "in", "on", "at", "to", "for", "of",
        "with", "by", "from", "up", "about", "into", "over", "after", "before", "under",
        "it", "its", "this", "that", "these", "those", "i", "you", "he", "she", "we",
    ];

    text.split(|c: char| !c.is_alphanumeric())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_lowercase())
        .filter(|s| !STOP_WORDS.contains(&s.as_str()))
        .collect()
}

#[derive(Clone, Debug)]
struct Posting {
    doc_id: usize,
    term_freq: usize,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SearchResult {
    pub doc_id: usize,
    pub title: String,
    pub score: f64,
}

pub struct InvertedIndex {
    index: std::collections::HashMap<String, Vec<Posting>>,
    documents: std::collections::HashMap<usize, String>,
    doc_count: usize,
    doc_lengths: std::collections::HashMap<usize, usize>,
}

impl InvertedIndex {
    pub fn new() -> Self {
        Self {
            index: std::collections::HashMap::new(),
            documents: std::collections::HashMap::new(),
            doc_count: 0,
            doc_lengths: std::collections::HashMap::new(),
        }
    }

    pub fn add_document(&mut self, title: &str, content: &str) -> usize {
        let doc_id = self.doc_count;
        self.doc_count += 1;
        self.documents.insert(doc_id, title.to_string());

        let tokens = tokenize(content);
        self.doc_lengths.insert(doc_id, tokens.len());

        let mut tf: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
        for token in &tokens {
            *tf.entry(token.clone()).or_insert(0) += 1;
        }

        for (term, freq) in tf {
            self.index.entry(term).or_default().push(Posting { doc_id, term_freq: freq });
        }

        doc_id
    }

    pub fn search(&self, query: &str, limit: usize) -> Vec<SearchResult> {
        let query_terms = tokenize(query);
        if query_terms.is_empty() || self.doc_count == 0 {
            return vec![];
        }

        let n = self.doc_count as f64;
        let mut scores: std::collections::HashMap<usize, f64> = std::collections::HashMap::new();

        for term in &query_terms {
            if let Some(postings) = self.index.get(term) {
                let df = postings.len() as f64;
                let idf = 1.0 + (n / df).ln();

                for p in postings {
                    let doc_len = *self.doc_lengths.get(&p.doc_id).unwrap_or(&1) as f64;
                    let tf = p.term_freq as f64 / doc_len;
                    *scores.entry(p.doc_id).or_insert(0.0) += tf * idf;
                }
            }
        }

        let mut results: Vec<SearchResult> = scores
            .into_iter()
            .map(|(doc_id, score)| SearchResult {
                doc_id,
                title: self.documents.get(&doc_id).cloned().unwrap_or_default(),
                score,
            })
            .collect();

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

        if limit > 0 && results.len() > limit {
            results.truncate(limit);
        }
        results
    }

    pub fn document_count(&self) -> usize {
        self.doc_count
    }
}
