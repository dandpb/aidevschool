# Spec: JSON-LD estruturado (WebSite + Organization) nas 2 superfícies públicas O1

Change-id: `AID-2696-jsonld-o1-surfaces` · From:
intent/AID-2696-jsonld-o1-surfaces/intent.md · Status: accepted

## Requirements

1. `engines/literacyDojo/index.html` e
   `engines/codexdojo-os-prototype/index.html` servem exatamente 1 bloco
   `application/ld+json` válido (JSON parseável, `@context`
   `https://schema.org`).
2. O `@graph` de cada superfície contém 1 nó `WebSite` e 1 nó
   `Organization`, ligados por `publisher.@id`.
3. Consistência com meta existente (anti-drift): `WebSite.url` == canonical
   == `og:url`; `WebSite.description` == `meta[name=description]`;
   `Organization.name` == `og:site_name`; `WebSite.inLanguage` == `pt-BR`
   == atributo `lang` do `<html>`; todo `@id` ancorado na origem canonical.
4. Sem regressão de ondas anteriores: canonical, `og:title`, `og:image`,
   `twitter:card` seguem presentes nos 2 `index.html`.
5. Fence de escopo: o diff da mudança (base `7a8bc262` → head) toca apenas
   os 2 `index.html` e `intent/AID-2696-jsonld-o1-surfaces/`.
6. Verificação determinística e offline (stdlib Python), executável pela
   estação prove da fábrica em worktree limpo.

## Design

- Inserção do bloco `<script type="application/ld+json">` imediatamente
  após a linha `twitter:card` do `<head>` de cada superfície (âncora estável
  presente nas duas); recuo de 4 espaços conforme o arquivo.
- `Organization` em vez de `EducationalOrganization`/`Course`: descreve a
  entidade editora sem claim educacional/curso que dependa da matriz
  product-readiness. `logo` aponta para o maior raster público de cada
  superfície (`icon-512.png` no literacyDojo; `og.jpg` no codexdojo-os,
  que não tem ícone ≥112px).
- Validador `validate_jsonld.py` (no próprio registro versionado) cobre
  R1–R5; `--strict` adiciona o fence de escopo R5/R6 via
  `git diff --name-only <base>..HEAD`.
- Nenhum arquivo de produto além dos 2 `index.html`; nenhum asset novo.

## Policy applied

- SDLC fast path (`docs/sdlc/README.md`): registro em `intent/<change-id>/`
  com intent/spec/plan/checks antes do código; factory freeze (AID-2676)
  congela o contrato antes do build.
- AGENTS.md: merges só via `scripts/merge_pr.sh` + countersign (AID-2768) —
  fora do escopo desta mudança (PR para decisão humana).
- Boundaries GWE: sem copy nova de marca (strings verbatim), sem
  deploy/alias/produção, sem serviço pago.

## Flagged concerns

- `og.jpg` (1200×630) como `logo` do codexdojo-os não é quadrado —
  aceitável paraOrganization rich-result (recomendado ≥112px); se o
  UX Designer publicar um ícone maior, trocar o `logo`. Owner: UX Designer
  (follow-up opcional, não bloqueante).
- Google Search Console/rich results exigem reindexação pós-deploy para
  efeito observável fora do repo — medir CTR/impressions é tarefa
  pós-merge (fora desta POC), owner GWE.
