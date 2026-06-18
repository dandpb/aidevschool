import { describe, it, expect } from "vitest";
import { tokenize, InvertedIndex } from "../src/search.js";

describe("tokenize", () => {
  it("tokenizes basic text", () => {
    const tokens = tokenize("Hello, World! This is a test.");
    expect(tokens).toEqual(["hello", "world", "test"]);
  });

  it("removes stop words", () => {
    const tokens = tokenize("the quick brown fox jumps over the lazy dog");
    expect(tokens).not.toContain("the");
    expect(tokens).not.toContain("over");
    expect(tokens).toHaveLength(6);
  });

  it("handles empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("preserves numbers", () => {
    const tokens = tokenize("test123 word456");
    expect(tokens).toEqual(["test123", "word456"]);
  });
});

describe("InvertedIndex", () => {
  it("indexes and searches documents", () => {
    const idx = new InvertedIndex();
    idx.addDocument("Go Guide", "Go is a programming language designed for concurrency");
    idx.addDocument("Rust Guide", "Rust is a systems programming language focused on safety");
    idx.addDocument("Python Guide", "Python is a versatile programming language");

    const results = idx.search("programming language", 10);
    expect(results).toHaveLength(3);
  });

  it("ranks by TF-IDF (more occurrences = higher score)", () => {
    const idx = new InvertedIndex();
    idx.addDocument("Doc A", "rust rust rust programming");
    idx.addDocument("Doc B", "rust programming");

    const results = idx.search("rust", 10);
    expect(results).toHaveLength(2);
    expect(results[0].title).toBe("Doc A");
  });

  it("returns empty for non-matching query", () => {
    const idx = new InvertedIndex();
    idx.addDocument("Doc", "hello world");
    expect(idx.search("nonexistent", 10)).toEqual([]);
  });

  it("returns empty for empty query", () => {
    const idx = new InvertedIndex();
    idx.addDocument("Doc", "hello world");
    expect(idx.search("", 10)).toEqual([]);
  });

  it("respects limit", () => {
    const idx = new InvertedIndex();
    for (let i = 0; i < 10; i++) {
      idx.addDocument("Doc", "common word here");
    }
    const results = idx.search("common", 3);
    expect(results).toHaveLength(3);
  });

  it("tracks document count", () => {
    const idx = new InvertedIndex();
    expect(idx.documentCount).toBe(0);
    idx.addDocument("A", "content a");
    idx.addDocument("B", "content b");
    expect(idx.documentCount).toBe(2);
  });
});
