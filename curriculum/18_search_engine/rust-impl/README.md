# Search Engine (Rust)

Inverted index search engine with TF-IDF ranking.

## Run
```bash
cargo run
```

## Test
```bash
cargo test
```

## API
- `POST /index` — `{"title":"...","content":"..."}`
- `POST /search` — `{"query":"...","limit":10}`
- `GET /health`
