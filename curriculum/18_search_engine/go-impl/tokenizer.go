package main

import (
	"strings"
	"unicode"
)

var stopWords = map[string]bool{
	"the": true, "a": true, "an": true, "and": true, "or": true, "but": true,
	"is": true, "are": true, "was": true, "were": true, "be": true, "been": true,
	"have": true, "has": true, "had": true, "do": true, "does": true, "did": true,
	"will": true, "would": true, "could": true, "should": true, "may": true,
	"might": true, "must": true, "shall": true, "can": true, "need": true,
	"in": true, "on": true, "at": true, "to": true, "for": true, "of": true,
	"with": true, "by": true, "from": true, "up": true, "about": true, "into": true,
	"over": true, "after": true, "before": true, "under": true, "again": true,
	"it": true, "its": true, "this": true, "that": true, "these": true, "those": true,
	"i": true, "you": true, "he": true, "she": true, "we": true, "they": true,
}

// Tokenize splits text into normalized tokens (lowercase, no punctuation, no stop words).
func Tokenize(text string) []string {
	var tokens []string
	var builder strings.Builder

	for _, r := range text {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			builder.WriteRune(unicode.ToLower(r))
		} else if builder.Len() > 0 {
			word := builder.String()
			if !stopWords[word] {
				tokens = append(tokens, word)
			}
			builder.Reset()
		}
	}
	if builder.Len() > 0 {
		word := builder.String()
		if !stopWords[word] {
			tokens = append(tokens, word)
		}
	}
	return tokens
}
