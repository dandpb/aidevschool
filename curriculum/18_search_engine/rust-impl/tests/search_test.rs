use search_engine::{tokenize, InvertedIndex};

#[test]
fn test_tokenize_basic() {
    let tokens = tokenize("Hello, World! This is a test.");
    assert_eq!(tokens, vec!["hello", "world", "test"]);
}

#[test]
fn test_tokenize_stop_words() {
    let tokens = tokenize("the quick brown fox jumps over the lazy dog");
    assert!(!tokens.contains(&"the".to_string()));
    assert!(!tokens.contains(&"over".to_string()));
    assert_eq!(tokens.len(), 6);
}

#[test]
fn test_tokenize_empty() {
    let tokens = tokenize("");
    assert!(tokens.is_empty());
}

#[test]
fn test_tokenize_numbers_preserved() {
    let tokens = tokenize("test123 word456");
    assert_eq!(tokens.len(), 2);
    assert_eq!(tokens[0], "test123");
}

#[test]
fn test_index_and_search() {
    let mut idx = InvertedIndex::new();
    idx.add_document("Go Guide", "Go is a programming language designed for concurrency");
    idx.add_document("Rust Guide", "Rust is a systems programming language focused on safety");
    idx.add_document("Python Guide", "Python is a versatile programming language");

    let results = idx.search("programming language", 10);
    assert_eq!(results.len(), 3);
}

#[test]
fn test_search_ranking() {
    let mut idx = InvertedIndex::new();
    idx.add_document("Doc A", "rust rust rust programming");
    idx.add_document("Doc B", "rust programming");

    let results = idx.search("rust", 10);
    assert_eq!(results.len(), 2);
    assert_eq!(results[0].title, "Doc A"); // more occurrences → higher score
}

#[test]
fn test_search_not_found() {
    let mut idx = InvertedIndex::new();
    idx.add_document("Doc", "hello world");
    let results = idx.search("nonexistent", 10);
    assert!(results.is_empty());
}

#[test]
fn test_search_empty_query() {
    let mut idx = InvertedIndex::new();
    idx.add_document("Doc", "hello world");
    let results = idx.search("", 10);
    assert!(results.is_empty());
}

#[test]
fn test_search_limit() {
    let mut idx = InvertedIndex::new();
    for _ in 0..10 {
        idx.add_document("Doc", "common word here");
    }
    let results = idx.search("common", 3);
    assert_eq!(results.len(), 3);
}

#[test]
fn test_document_count() {
    let idx = InvertedIndex::new();
    assert_eq!(idx.document_count(), 0);
}
