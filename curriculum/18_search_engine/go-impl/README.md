# Search Engine (Go)

A minimal search engine with inverted index, TF-IDF ranking, and stop-word removal.

## Run
```bash
go run .
```

## Test
```bash
go test -v -cover ./...
```

## API
- `POST /index` — Index a document: `{"title": "...", "content": "..."}`
- `POST /search` — Search: `{"query": "...", "limit": 10}`
- `GET /health` — Health check
