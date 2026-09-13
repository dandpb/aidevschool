# Intent — AID-1593 QW1-QW3: quick wins SEO/segurança das 2 superfícies públicas O1

> **RETROSPECTIVE RECORD (retrofit) para QW1-QW3.** Criado
> em 2026-09-13 sob **AID-1602** (achado **F1** da auditoria SDLC AID-1597,
> recibo `5f5e93cd` 03:39:33Z): a onda foi executada e merged **sem o registro
> do produtor em `intent/`**, exigido pela política (`docs/sdlc/README.md`
> § PRs automatizados — fast path canônico; retrofit prontamente quando o
> registro escorrega, precedente PR #262 →
> `intent/2026-09-03-xss-dojotoday-sentinel/`). Estado no nascimento deste
> registro: QW1 (PR #362, merge `35a757f2` 03:27:25Z) e QW2 (PR #363, merge
> `c1b7b5b8` 03:41:58Z — ~2,4 min após o recibo da auditoria) já em `main`.
> **Correção factual (FPE, AID-1614/AID-1615):** QW3 (PR #364)
> também acabou merged antes deste registro alcançar `main` — merge
> `2c5f77dd` 03:50:57Z executado por um **run duplicado da PRE** sob a
> identidade GitHub compartilhada `dandpb` (conta do CEO) — atribuição
> canônica: disposição CEO `756777fd` ("onda 100% escrita pela PRE") +
> incidente AID-1612 ("executor: run duplicado do PRE") + ruling CEO
> `3c28583a` (#364 MANTER) — enquanto este registro
> estava aberto como PR #371 (03:47:08Z, CI verde) mas ainda não merged. A
> condição pré-merge-em-`main` (AID-1604 item 3) não foi satisfeita e o merge
> não seguiu o single-writer FPE (writer-identity → issue irmã F4). CI
> pós-merge verde no head de `main` `2c5f77dd` (37 SUCCESS + 7 SKIPPED, incl.
> SDLC guardrails). A falha alimenta a auditoria AID-1597. A lacuna de
> evidência do veredito citado nas mensagens de merge ("FPE review GO
> AID-1595" com relay sem comentários) é o achado irmão **F3 → AID-1604**
> (owner FPE), deliberadamente fora do escopo deste registro.

Author: Growth Web Engineer (Paperclip `5cf7ace9`; onboarding AID-1584) ·
Change-id: `AID-1593-gwe-qw1-qw3-o1-quick-wins` · Status: accepted

> **Fonte canônica da decisão de gate:** ORDEM **AID-1593** (despacho do sweep
> AID-1592, CEO, 2026-09-13 ~03:0xZ). O card `69726372`
> (`request_confirmation` em AID-1584) foi **aprovado pelo CEO** — o accept
> formal do card é rota board-only para agentes (403 verificado no despacho),
> então a ORDEM é o registro canônico da decisão. Este arquivo **cita e não
> reescreve** (regra § Mapping, one source of truth).

## Problem

A auditoria das superfícies públicas (web-audit AID-1584, onboarding GWE ≤72h;
sweep AID-1592) encontrou na zona "quick win" do topo do funil O1 — as 2
superfícies live (`https://aidevschool-literacydojo.netlify.app/` e
`https://aidevschool-codexdojo-os.netlify.app/`):

- **QW1** — nenhum `robots.txt`/`sitemap.xml` real: o SPA fallback do
  `netlify.toml` (`/* -> /index.html`) servia **HTML** como robots.txt nas 2
  superfícies; crawlers sem sitemap/lastmod verificáveis.
- **QW2** — `engines/literacyDojo/netlify.toml` sem **nenhum header de
  segurança** (Referrer-Policy, X-Content-Type-Options, Permissions-Policy,
  CSP), enquanto `engines/codexdojo-os-prototype/netlify.toml` já os tinha:
  paridade quebrada na superfície com mais tráfego O1.
- **QW3** — `<link rel="canonical">` ausente nas 2 superfícies (risco de
  conteúdo duplicado para o crawler) e sem favicon no codexdojo-os.

## Proposed outcome

Observável nas 2 superfícies públicas, **sem deploy por conta desta onda**
(QW0 é apartado, ver Constraints):

1. `robots.txt` e `sitemap.xml` reais servidos como arquivos (precedência de
   `public/` sobre o redirect), com `lastmod` derivado do git log —
   verificável por `curl`/Search Console.
2. literacyDojo respondendo a mesma política de headers do codexdojo-os
   (verificável por `curl -I`), com 1 delta justificado (`worker-src 'self'`
   no CSP: o literacyDojo registra service worker em produção —
   `src/main.tsx` → `navigator.serviceWorker.register`, `public/sw.js`).
3. `canonical` apontando para a URL canônica de cada superfície + favicon
   (assets existentes na literacy; no OS, `icon-64.png` 8,1 KB derivado
   deterministicamente do asset existente — crop central + box-average; não
   o wallpaper de 1,87 MB).

Zero mudança de copy/marca, zero telemetria nova, zero DNS/alias/produção.

## Affected users and systems

- Candidatos O1 no topo do funil (descoberta via buscadores/social — Canal 2,
  AID-909) e qualquer visitante das 2 superfícies.
- `engines/literacyDojo/` (`public/robots.txt`, `public/sitemap.xml`,
  `netlify.toml`, `index.html`) e `engines/codexdojo-os-prototype/`
  (`public/robots.txt`, `public/sitemap.xml`, `index.html`,
  `public/icon-64.png`).
- Nenhum domínio de conteúdo (`curriculum/`), estado (`learner/`) ou
  instrumentação (coletor/envelopes).

## Constraints

- **PR-first, sem merge pelo produtor:** branches próprios, 1 PR por QW;
  single-writer **FPE** até R1 (regra AID-1521). GWE não mergeia nem deploya.
- **QW0 (redeploy da onda #352/#362/#363) NÃO faz parte da ordem**: deploy
  exige autorização founder (invariante da política R1 draft); fica com o
  FPE avaliar/despachar.
- **QW4 (og:image dedicada) fora desta onda**: só após arte do Content
  Designer.
- Assets: apenas públicos/existentes ou derivados determinísticos; nenhuma
  copy nova (Content Designer não envolvido na onda).
- Headers QW2 = paridade com o OS exceto o delta `worker-src` (justificado
  acima); CSP mantém `style-src 'unsafe-inline'` existente (parity, não
  endurecimento — endurecimento é follow-up de engine).

## Open questions

- Og:image dedicada 1200×630 (QW4) — bloqueada em arte do Content Designer
  (carried de `intent/2026-09-12-og-social-preview-o1/`).
- Endurecimento adicional de CSP (remover `unsafe-inline` de style) — não é
  quick win (risco de quebra de render), follow-up de engine se o board
  quiser.
