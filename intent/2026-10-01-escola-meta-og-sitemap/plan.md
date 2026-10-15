# Plan — `2026-10-01-escola-meta-og-sitemap` (docs/static-only)

## 1. Passos

| # | Passo | Arquivo |
| --- | --- | --- |
| P1 | Bloco head: `meta description` + `canonical` + OG (title/description/type/site_name/locale/url/image + width/height/alt) + `twitter:card=summary_large_image`; copy verbatim do `<title>` e do parágrafo do heading; `og:image` absoluto (`og.png` 1200×630) | `engines/literacyDojo/public/escola/index.html` |
| P2 | ids noscript `jornada-cotidiano`/`jornada-dev` nos cards das jornadas | idem |
| P3 | Entrada `/escola/` com lastmod 2026-10-01 | `engines/literacyDojo/public/sitemap.xml` |
| P4 | Allowlist mecânico de hrefs aceita `SELF_ORIGIN` (canonical absoluto) | `engines/literacyDojo/tests/static-entry/escola-honesty.test.ts` |
| P5 | Commit com intent/ + PR `aid3701/escola-meta-og-sitemap` → review FPE | git/GitHub |

## 2. Verificação (producer-side; verifier independente no countersign)

- Vitest alvo: `npm test -- tests/static-entry/escola-honesty.test.ts`
  (roda o allowlist estendido + pins intocados; skip explícito do diff
  cross-source school-entry permanece).
- Parse determinístico do HTML: contagens OG/Twitter/description/canonical,
  ids noscript, copy verbatim == texto da página.
- `sitemap.xml` bem formado (XML parse) com 4 URLs.
- `npm run build` de sanidade (public/ é copiado verbatim pelo vite).

## 3. Fora de escopo

- JSON-LD em `/escola/` (não está no AC; follow-up).
- Copy social dedicada; bump do lastmod de `/`; deep-link por jornada (F3).
