<!-- issue: AID-1584 | key: web-audit | doc_id: 2a3ea9fb-ce3f-4e44-96a4-840f37822332 | updated: 2026-09-13 02:10:40.626+00 -->

# web-audit — Auditoria das superfícies públicas O1 (LiteracyDojo + CodexDojo OS), baseline main@6ec26544

(AID-1584)

# web-audit — Auditoria das superfícies públicas (AID-1584)

**Autor:** Growth Web Engineer (5cf7ace9) · **Data:** 2026-09-13 (heartbeat 1) · **Baseline:** `main@6ec26544` (PR #352 mergeado), probes live 2026-09-13 ~02:0x–02:1xZ (read-only, curl/HTTP lab).

## 0. Escopo e método

Superfícies auditadas (as 2 rotas públicas de browser do O1, conforme README.md):

| Superfície | URL live | Engine (repo) |
| --- | --- | --- |
| LiteracyDojo | https://aidevschool-literacydojo.netlify.app | `engines/literacyDojo/` |
| CodexDojo OS | https://aidevschool-codexdojo-os.netlify.app/?track=dev | `engines/codexdojo-os-prototype/` |

Método: probes HTTP determinísticos (curl; headers, content-type, TTFB 3 amostras, tamanhos wire/raw), leitura de código (`index.html`, `netlify.toml`, `vite.config.ts`, fontes `src/`), e git (`main` vs live). **Lighthouse via PageSpeed Insights API: quota anônima exaurida** (`Quota exceeded ... pagespeedonline.googleapis.com`); sem contas/serviços pagos (regra da issue), e sem Chrome/Lighthouse local no sandbox. Scores Lighthouse ficam **pendentes de tooling**; este doc entrega métricas lab equivalentes medidas first-hand e checagens estáticas — nenhuma afirmação de score sem medição.

## 1. Achado bloqueador de funil (fora do meu domínio de write): deploys stale

PR #352 (og-social-preview-o1) está **mergeado em `main`** (merge 6ec26544, commit de conteúdo 10dec49c) com OG/Twitter metadata para as 2 superfícies, mas o HTML servido **live** em ambas **não contém nenhuma tag OG** (evidência: curl dos HTMLs live abaixo vs `git show main:engines/literacyDojo/index.html`):

- live literacyDojo (762B): sem `og:*`, sem `twitter:*`; `<title>` e `meta description` presentes.
- live codexdojo-os (608B): idem.
- `main`: `engines/literacyDojo/index.html` e `engines/codexdojo-os-prototype/index.html` com og:title/og:description/og:type/og:site_name/og:locale/og:url/og:image + twitter:card.

Impacto: **todo share O1 (WhatsApp/Discord/e-mail — AID-909/AID-1503) hoje renderiza sem preview controlado pelo produto**, anulando o propósito do PR #352. Deploy/produção é do FPE (boundário meu). **Ação pedida: redeploy das 2 superfícies a partir do `main`** (zero código novo).

## 2. SEO técnico

| Checagem | LiteracyDojo live | CodexDojo OS live | Evidência |
| --- | --- | --- | --- |
| `lang` | `pt-BR` ✓ | `pt-BR` ✓ | HTML live |
| `<title>` único/descritivo | ✓ | ✓ ("codexDojo OS" curto) | HTML live |
| `meta description` | ✓ | ✓ (diz "Protótipo" — alinhado ao readiness `stale`; não alterar sem Content Designer) | HTML live |
| `robots.txt` real | **✗ — SPA fallback**: retorna o `index.html` com `content-type: text/html` e 200 | **✗ idem** | `curl -I .../robots.txt` |
| `sitemap.xml` real | **✗ — idem (HTML)** | **✗ idem** | `curl -I .../sitemap.xml` |
| `canonical` | **✗ ausente** (tb ausente no `main`) | **✗ ausente** | HTML live + `git show main:` |
| Indexabilidade | Sem `noindex`; JS-rendered (shell vazio) — Google renderiza, outros crawlers veem só o shell | idem | HTML live |
| Favicon | `/favicon.ico` 200 mas **sem `<link rel="icon">`** no HTML | idem | probes + HTML |

Causa-raiz dos ✗ de robots/sitemap: `[[redirects]] from = "/*" to = "/index.html" status = 200` em ambos `netlify.toml` (`engines/literacyDojo/netlify.toml`, `engines/codexdojo-os-prototype/netlify.toml`) sem arquivos reais em `public/`. Crawler que respeita sitemap declarado não encontra sinal algum; o HTML-para-robots.txt é ruído.

## 3. OG / social preview

No `main` (pós-#352) a metadata está correta em sintaxe; o problema é **qualidade/vaso da imagem**:

| Campo | LiteracyDojo (`main`) | CodexDojo OS (`main`) | Problema |
| --- | --- | --- | --- |
| og:image | `/icon-512.png` — **512×512, 2,4KB** (ícone de app) | `/dojo-wallpaper.png` — **1586×992, 1,87MB** | literacy: ícone pequeno quase invisível em feed; codexdojo: **1,87MB é pesado demais** ( plataformas cortam/timeoutam pré-visualizações; recomendo <300KB, 1200×630) |
| twitter:card | `summary` | `summary_large_image` | literacy perde o card grande mesmo tendo imagem |

Estimativa de impacto (benchmark de mercado, não medição própria): card grande com imagem legível é o maior driver de CTR em shares; trocar ícone→imagem 1200×630 e comprimir o wallpaper são os dois maiores ganhos de CTR de share disponíveis hoje.

## 4. Performance (lab, medido)

| Métrica | LiteracyDojo | CodexDojo OS |
| --- | --- | --- |
| TTFB (3 amostras) | 81 / 46 / 65 ms | 67 / 70 / 46 ms |
| HTML transferido | 762B | 608B |
| JS principal (raw → gzip) | 503.372B → **142.025B** (`index-CuSADLOW.js`) | 394.957B → **111.058B** (`index-C8ZxuCba.js`) |
| CSS (wire) | 7.879B | 11.303B |
| Requests críticos | 3 (html+js+css), zero third-party no shell | 3, zero third-party |
| Service worker | `sw.js` 200 (3.045B) | não tem (por design, redirect 404) |
| Bundle | único chunk (sem code-split por rota; react-dom production incluso) | único chunk |

Leitura: shell excelente (mini-HTML, sem blocking de terceiros, TTFB ótimo no Netlify edge); o peso é o bundle único — 142KB/111KB gzip é aceitável para SPA educacional, mas é o único alvo material de otimização futura (code-split por rota) — **não é quick win**, fica em backlog.

## 5. Acessibilidade básica

| Checagem | Evidência |
| --- | --- |
| `lang`, viewport, charset | ✓ nas 2 (HTML live) |
| H1 por tela + focus management | literacyDojo: `h1` com `id`+`tabIndex={-1}`+`headingRef` em todas as screens (`src/screens/LessonScreen.tsx:294`, `OnboardingScreen.tsx:129`, `CheckpointScreen.tsx:175`) — padrão bom |
| aria-labels | codexdojo-os: 37 ocorrências em `src/**/*.tsx`; literacyDojo: 0 `<img>` no source (UI sem imagens raster) |
| Skip-link no shell | ✗ ausente nas 2 |
| Contraste / navegação por teclado completa | requer browser — pendente de tooling Lighthouse (ver §0) |

## 6. Headers de segurança (afeta confiança/B2B e Best Practices)

- codexdojo-os: CSP + `X-Content-Type-Options` + `Referrer-Policy` + `Permissions-Policy` ✓ (`netlify.toml [[headers]]`).
- literacyDojo: **nenhum deles** (`engines/literacyDojo/netlify.tom` não tem bloco `[[headers]]`). HSTS ✓ nas 2 (Netlify).

## 7. Pipeline de quick wins (≤72h, PR pequenas e reversíveis, priorizadas por impacto no funil O1)

| # | Quick win | Repo/file | Antes→Depois mensurável | Owner/dependência |
| --- | --- | --- | --- | --- |
| QW0 | **Redeploy das 2 superfícies a partir do `main`** (coloca OG do #352 live) | — (operação) | shares: sem preview → com preview controlado (verificável: `curl -s <url> \| grep og:`) | **FPE** (produção é dele; zero código) |
| QW1 | `robots.txt` + `sitemap.xml` reais nos dois `public/` (+ diretiva `Sitemap:`) | `engines/*/public/` | `curl -I /robots.txt`: `text/html` 200 → `text/plain` 200 com diretivas | eu (PR) |
| QW2 | Paridade de headers de segurança no literacyDojo (`[[headers]]` copiando codexdojo-os) | `engines/literacyDojo/netlify.toml` | `curl -I` literacy: 0 → 4 headers de segurança | eu (PR) |
| QW3 | `<link rel="canonical">` + `<link rel="icon">` nos 2 `index.html` | `engines/*/index.html` | HTML: 0 → canonical+icon; remove ambiguidade de URL canônica p/ crawlers | eu (PR) |
| QW4 | og:image dedicada 1200×630 (<300KB) p/ literacyDojo + `twitter:card=summary_large_image`; re-comprimir `dojo-wallpaper.png` p/ OG (~200KB) | `engines/*/public/` + `index.html` | literacy: card 512px ícone → card grande; codexdojo: 1,87MB → ~0,2MB no og:image | eu (PR) **após Content Designer aprovar arte** (copy/marca dele) |

Backlog (não-quick): code-split por rota nos 2 bundles; skip-link; Lighthouse CI quando houver runner com Chrome.

## 8. Regras respeitadas

Sem DNS/alias/produção tocados (read-only probes); sem contas/serviços pagos; nenhuma copy alterada (QW4 sinalizado p/ Content Designer); nenhum claim de readiness além da matriz (description "Protótipo" preservada); PR-first — nada disto entra em `main` sem PR + single-writer (FPE).
