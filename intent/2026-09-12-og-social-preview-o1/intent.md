# Intent: links do funil O1 geram social preview honesto nas 2 superfícies live

Author: Full-Stack Feature Engineer (Paperclip AID-1527 onboarding; slice
proposta ao SM no thread da AID-1527) · Change-id:
`2026-09-12-og-social-preview-o1` · Status: accepted (PR-first; merge só via
review — producer ≠ verifier)

## Problem

O despacho do Canal 2 do funil O1 está em curso (AID-1503: conta TabNews
sendo provista; pack de outreach do G&R mira WhatsApp/Discord/grupo e e-mail
— AID-909 doc `outreach`). Esses canais renderizam preview de link a partir
de tags Open Graph/Twitter. Hoje as 2 superfícies live não têm nenhuma tag
`og:*`/`twitter:*`:

- `engines/literacyDojo/index.html`: só `description` + `title`.
- `engines/codexdojo-os-prototype/index.html`: idem, com descrição
  "Protótipo do codexDojo OS…".

Resultado: o primeiro contato de um candidato O1 com o produto (um link
compartilhado) aparece sem título/descrição/imagem controlados pelo produto —
atrito no topo exato do funil (landing → lição), zero custo de correção.

## Proposed outcome

Observável: ao compartilhar os links públicos
(`https://aidevschool-literacydojo.netlify.app/` e
`https://aidevschool-codexdojo-os.netlify.app/`) em WhatsApp/Discord/Telegram/e-mail,
o preview exibe título, descrição e imagem definidos pelo produto (verificável
por inspeção do HTML servido + any Open Graph debug tool). Zero mudança de
copy/posicionamento: og:title/og:description reutilizam VERBATIM o
`<title>`/`<description>` existentes de cada superfície (decisão de copy fica
com UX/founder). Zero mudança de telemetria, fluxo, estado ou conteúdo.

## Affected users and systems

Candidatos O1 alcançados pelo Canal 2 (topo do funil AID-909). Arquivos de
shell estático das 2 engines (index.html) — nenhum domínio de conteúdo
(`curriculum/`), estado (`learner/`) ou instrumentação (coletor/envelopes).

## Constraints

- Copy 100% verbatim dos metadados existentes — nenhuma alegação nova
  (posicionamento público/marca é decisão do founder; registrado como
  follow-up opcional para UX/G&R).
- Imagens: apenas assets públicos JÁ existentes (`icon-512.png` na literacy;
  `dojo-wallpaper.png` no OS). Nenhum asset novo (design não é meu call).
- Sem novos eventos/PII (ADR-0009/0010 intocados); analytics não é evidência
  de funil (regra AID-909) — este change não toca telemetria.
- PR-first: branch `aid-1527/og-social-preview-o1`, review FPE (onboarding
  AID-1527), merge pela rota canônica (countersign QA + single-writer CEO).

## Open questions

- og:image do OS (`dojo-wallpaper.png`, 1586×992, ~1,8 MB) é pesado para
  unfurl em mensageiros — aceitável como primeira versão? (follow-up: asset
  otimizado 1200×630 via UX Designer)
- Copy dedicada de social card (mais forte que a verbatim) é follow-up de
  UX/G&R com o founder, fora deste escopo.
