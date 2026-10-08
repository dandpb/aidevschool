# Intent: /escola/ com metadados sociais, canonical, sitemap e âncoras noscript (AID-3701)

Author: Growth Web Engineer (Paperclip AID-3701; findings F2+F5 da lente L11
da QA-ROUND AID-3685, evidência
`/paperclip/aid3685-evidence/2026-10-01-l11-growth-web-entrada-links.md`
matriz linhas 11 e 13) · Change-id: `2026-10-01-escola-meta-og-sitemap` ·
Status: implemented (PR-first; merge só via single-writer FPE + countersign)

## Problem

A porta pública `/escola/` (entrada da escola, AID-3453/PR #616) não tem
nenhum metadado de descoberta: 0 tags OG/Twitter, sem `meta description`, sem
`canonical`, e está fora do `sitemap.xml` (confirmado no live: 0 menções a
`escola` em `https://aidevschool-literacydojo.netlify.app/sitemap.xml`).
Compartilhamento social (WhatsApp/Discord/e-mail — Canal 2 do funil O1)
renderiza bare title/URL. Adicionalmente (F5), as âncoras
`#jornada-cotidiano`/`#jornada-dev` da versão em texto do mapa não existem no
HTML estático (são criadas por `escola.js` via `renderJourneys`) — noscript
torna esses links no-op.

## Proposed outcome

- `/escola/` com `meta description`, `canonical`, bloco OG
  (`og:title/description/type/site_name/locale/url/image` +
  `og:image:width/height/alt`) e `twitter:card`, no padrão
  og-social-preview (PR #352) evoluído da raiz (`og.png` 1200×630,
  `summary_large_image`).
- `public/sitemap.xml` inclui `/escola/` (3→4 URLs).
- Cards noscript das jornadas ganham `id="jornada-cotidiano"` /
  `id="jornada-dev"` — âncoras do mapa textual funcionam sem JS (sem colisão:
  com JS, `renderJourneys` faz `replaceChildren` e recria os mesmos ids).
- Mensurável: OG/Twitter 0→11, description 0→1, canonical 0→1, sitemap 3→4
  URLs, ids noscript 0→2.

## Constraints

- Copy 100% verbatim de texto já publicado na própria página (parágrafo do
  heading e `<title>`) — nenhuma copy de marca nova; pass de description com
  Content Designer registrado como follow-up.
- og:image = asset público já existente (`og.png`, 1200×630, 60 kB), URL
  absoluta (precedente F1/AID-1537).
- Edição de teste (allowlist mecânico de hrefs em `escola-honesty.test.ts`):
  única extensão é a própria origem do site (`SELF_ORIGIN`), exigida pelo
  `canonical` absoluto do AC — registrada aqui e na PR para o countersign.
- Sem telemetria, fluxo, estado ou conteúdo; sem deploy/alias/produção
  (merge e promoção são do FPE). lastmod de `/escola/` = 2026-10-01 (data do
  commit que altera o arquivo — se o merge escorregar de data, o FPE deve
  bumpar).

## Open questions

- Copy dedicada de social card (mais forte que a verbatim) — follow-up
  Content Designer + Growth, fora deste escopo.
- lastmod de `/` no sitemap está 2026-09-12 mas o último commit da raiz
  `index.html` é 76a2cd5a (2026-09-26) — observação para follow-up de
  higiene, fora desta PR.
