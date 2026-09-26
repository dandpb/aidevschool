# Intent: JSON-LD estruturado (WebSite + Organization) nas 2 superfícies públicas O1

Author: Growth Web Engineer (Paperclip `5cf7ace9`) · Change-id:
`AID-2696-jsonld-o1-surfaces` · Status: accepted

> Origem: issue **AID-2696** (FACTORY-STRESS, POC de estresse da fábrica
> agente — "1 mudança real do site growth pela fábrica"). GO do programa:
> PR #527 merged 2026-09-26T02:10:50Z + flip desta issue para execução.
> Cita e não reescreve (one source of truth).

## Problem

As 2 superfícies públicas do funil O1
(`https://aidevschool-literacydojo.netlify.app/` e
`https://aidevschool-codexdojo-os.netlify.app/`) já servem robots.txt,
sitemap.xml, canonical, OG/Twitter completos e headers de segurança (ondas
AID-1593/PR #362-364, og-social-preview PR #352), mas **não expõem nenhum
dado estruturado schema.org** (`application/ld+json`): verificado por
`git grep -c 'ld+json' 7a8bc262 -- engines/literacyDojo
engines/codexdojo-os-prototype` → sem ocorrências. Sem JSON-LD, o crawler
não tem entidade `WebSite`/`Organization` verificável (nome do site, idioma,
editor), perdendo elegibilidade a rich results e reduzindo a semântica do
topo do funil.

## Proposed outcome

Observável nas 2 superfícies, sem deploy por conta desta mudança (merge e
deploy seguem o fluxo normal single-writer FPE):

1. Cada `index.html` passa a servir exatamente 1 bloco
   `<script type="application/ld+json">` com `@graph` contendo `WebSite` +
   `Organization`.
2. As strings do JSON-LD reutilizam **verbatim** o copy já publicado
   (`meta[name=description]`, `og:site_name`, `og:url`, canonical) — zero
   copy nova de marca (sem dependência de Content Designer).
3. O contrato de verificação é de superfície de marketing (estrutura JSON-LD
   + consistência com meta existente + fence de escopo do diff), não checks
   de produto (build/test do app não mudam).

## Affected users and systems

Engines `engines/literacyDojo/` e `engines/codexdojo-os-prototype/`
( apenas `index.html` de cada), registro versionado
`intent/AID-2696-jsonld-o1-surfaces/`. Sem mudança em `learner/`,
`curriculum/`, `.mavis/` ou runtime de app.

## Constraints

- Meta-only: nenhum JS/runtime novo, nenhum asset novo, nenhum request novo.
- Zero claims de readiness (matriz product-readiness intocada): os tipos
  usados descrevem site/organização, não status de produto ou de curso.
- Sem PII, zero custo externo, sem tocar DNS/alias/produção.
- Via fábrica: worktree novo na base `7a8bc262` (origin/main no momento do
  branch, verificado via GitHub API 06:38Z), produtor ≠ verificador.
