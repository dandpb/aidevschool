package main

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestTokenizeBasic(t *testing.T) {
	tokens := Tokenize("Hello, World! This is a test.")
	expected := []string{"hello", "world", "test"}
	if len(tokens) != len(expected) {
		t.Fatalf("expected %d tokens, got %d: %v", len(expected), len(tokens), tokens)
	}
	for i, tok := range tokens {
		if tok != expected[i] {
			t.Errorf("token[%d]: expected %q, got %q", i, expected[i], tok)
		}
	}
}

func TestTokenizeStopWords(t *testing.T) {
	tokens := Tokenize("the quick brown fox jumps over the lazy dog")
	for _, tok := range tokens {
		if tok == "the" || tok == "over" {
			t.Errorf("stop word %q should be removed", tok)
		}
	}
	if len(tokens) != 6 {
		t.Errorf("expected 6 tokens (no stop words), got %d", len(tokens))
	}
}

func TestTokenizeEmpty(t *testing.T) {
	tokens := Tokenize("")
	if len(tokens) != 0 {
		t.Errorf("expected 0 tokens for empty string, got %d", len(tokens))
	}
}

func TestTokenizeNumbersPreserved(t *testing.T) {
	tokens := Tokenize("test123 word456")
	if len(tokens) != 2 {
		t.Fatalf("expected 2 tokens, got %d", len(tokens))
	}
}

func TestIndexAndSearch(t *testing.T) {
	idx := NewInvertedIndex()
	idx.AddDocument("Go Guide", "Go is a programming language designed for concurrency")
	idx.AddDocument("Rust Guide", "Rust is a systems programming language focused on safety")
	idx.AddDocument("Python Guide", "Python is a versatile programming language")
	results := idx.Search("programming language", 10)
	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}
}

func TestSearchRanking(t *testing.T) {
	idx := NewInvertedIndex()
	idx.AddDocument("Doc A", "rust rust rust programming")
	idx.AddDocument("Doc B", "rust programming")
	results := idx.Search("rust", 10)
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
	if results[0].Title != "Doc A" {
		t.Errorf("expected Doc A first, got %q", results[0].Title)
	}
}

func TestSearchNotFound(t *testing.T) {
	idx := NewInvertedIndex()
	idx.AddDocument("Doc", "hello world")
	results := idx.Search("nonexistent", 10)
	if len(results) != 0 {
		t.Errorf("expected 0 results, got %d", len(results))
	}
}

func TestSearchEmptyQuery(t *testing.T) {
	idx := NewInvertedIndex()
	idx.AddDocument("Doc", "hello world")
	results := idx.Search("", 10)
	if results != nil {
		t.Errorf("expected nil for empty query")
	}
}

func TestSearchLimit(t *testing.T) {
	idx := NewInvertedIndex()
	for i := 0; i < 10; i++ {
		idx.AddDocument("Doc", "common word here")
	}
	results := idx.Search("common", 3)
	if len(results) != 3 {
		t.Errorf("expected limit=3, got %d", len(results))
	}
}

func TestDocumentCount(t *testing.T) {
	idx := NewInvertedIndex()
	if idx.DocumentCount() != 0 {
		t.Errorf("expected 0 docs")
	}
	idx.AddDocument("A", "content a")
	idx.AddDocument("B", "content b")
	if idx.DocumentCount() != 2 {
		t.Errorf("expected 2 docs")
	}
}

func TestHTTPHealth(t *testing.T) {
	idx := NewInvertedIndex()
	mux := buildMux(idx)
	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Errorf("health: expected 200, got %d", w.Code)
	}
}

func TestHTTPIndexAndSearch(t *testing.T) {
	idx := NewInvertedIndex()
	mux := buildMux(idx)

	body := `{"title":"Go","content":"Go programming language"}`
	req := httptest.NewRequest("POST", "/index", strings.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != 201 {
		t.Errorf("index: expected 201, got %d", w.Code)
	}

	searchBody := `{"query":"go programming","limit":5}`
	req2 := httptest.NewRequest("POST", "/search", strings.NewReader(searchBody))
	w2 := httptest.NewRecorder()
	mux.ServeHTTP(w2, req2)
	if w2.Code != 200 {
		t.Errorf("search: expected 200, got %d", w2.Code)
	}
}

func TestHTTPIndexMissingContent(t *testing.T) {
	idx := NewInvertedIndex()
	mux := buildMux(idx)
	body := `{"title":"Empty"}`
	req := httptest.NewRequest("POST", "/index", strings.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Errorf("expected 400 for missing content, got %d", w.Code)
	}
}

func TestHTTPIndexBadJSON(t *testing.T) {
	idx := NewInvertedIndex()
	mux := buildMux(idx)
	req := httptest.NewRequest("POST", "/index", strings.NewReader("not json"))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Errorf("expected 400 for bad json, got %d", w.Code)
	}
}

func TestHTTPSearchEmpty(t *testing.T) {
	idx := NewInvertedIndex()
	mux := buildMux(idx)
	body := `{"query":"","limit":5}`
	req := httptest.NewRequest("POST", "/search", strings.NewReader(body))
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Errorf("expected 200 for empty search, got %d", w.Code)
	}
}
