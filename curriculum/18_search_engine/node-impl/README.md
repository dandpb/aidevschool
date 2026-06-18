# Search Engine (Node/TypeScript)

Inverted index search engine with TF-IDF ranking.

## Run
```bash
npm install
npm run dev
```

## Test
```bash
npm test
```

## API
- `POST /index` — `{"title":"...","content":"..."}`
- `POST /search` — `{"query":"...","limit":10}`
- `GET /health`
