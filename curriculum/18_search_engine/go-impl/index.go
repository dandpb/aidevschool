package main

import (
	"fmt"
	"math"
	"sort"
	"sync"
)

// Posting represents a term occurrence in a document.
type Posting struct {
	DocID    int
	TermFreq int
}

// InvertedIndex maps terms to their posting lists.
type InvertedIndex struct {
	mu         sync.RWMutex
	index      map[string][]Posting
	documents  map[int]string
	docCount   int
	docLengths map[int]int
}

func NewInvertedIndex() *InvertedIndex {
	return &InvertedIndex{
		index:      make(map[string][]Posting),
		documents:  make(map[int]string),
		docLengths: make(map[int]int),
	}
}

func (idx *InvertedIndex) AddDocument(title, content string) int {
	idx.mu.Lock()
	defer idx.mu.Unlock()

	docID := idx.docCount
	idx.docCount++
	idx.documents[docID] = title

	tokens := Tokenize(content)
	idx.docLengths[docID] = len(tokens)

	tfMap := make(map[string]int)
	for _, token := range tokens {
		tfMap[token]++
	}

	for term, freq := range tfMap {
		idx.index[term] = append(idx.index[term], Posting{DocID: docID, TermFreq: freq})
	}

	return docID
}

func (idx *InvertedIndex) Search(query string, limit int) []SearchResult {
	idx.mu.RLock()
	defer idx.mu.RUnlock()

	queryTerms := Tokenize(query)
	if len(queryTerms) == 0 {
		return nil
	}

	scores := make(map[int]float64)
	N := idx.docCount
	if N == 0 {
		return nil
	}

	for _, term := range queryTerms {
		postings, exists := idx.index[term]
		if !exists {
			continue
		}

		df := len(postings)
		idf := 1.0 + math.Log(float64(N)/float64(df))

		for _, p := range postings {
			docLen := idx.docLengths[p.DocID]
			if docLen == 0 {
				continue
			}
			tf := float64(p.TermFreq) / float64(docLen)
			scores[p.DocID] += tf * idf
		}
	}

	results := make([]SearchResult, 0, len(scores))
	for docID, score := range scores {
		results = append(results, SearchResult{
			DocID:  docID,
			Title:  idx.documents[docID],
			Score:  score,
		})
	}
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	if limit > 0 && len(results) > limit {
		results = results[:limit]
	}

	return results
}

func (idx *InvertedIndex) DocumentCount() int {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	return idx.docCount
}

type SearchResult struct {
	DocID int     `json:"doc_id"`
	Title string  `json:"title"`
	Score float64 `json:"score"`
}

func (r SearchResult) String() string {
	return fmt.Sprintf("{doc:%d, title:%q, score:%.4f}", r.DocID, r.Title, r.Score)
}
