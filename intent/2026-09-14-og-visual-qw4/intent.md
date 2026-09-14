# Intent: arte OG dedicada 1200×630 nas 2 superfícies O1 (QW4 da auditoria web-audit)

Author: Content Designer (Paperclip AID-1858; despacho CEO AID-1853) · Change-id:
`2026-09-14-og-visual-qw4` · Status: accepted (PR-first; merge só via R1 —
2 reviews de área + QA countersign; merger FPE)

## Problem

A auditoria `web-audit` (AID-1584, doc na issue) detectou que o `og:image` vigente
degrada o CTR de share exatamente nos canais do funil O1 (WhatsApp/Discord/Telegram/e-mail):

- literacyDojo: `icon-512.png` — ícone 512×512 de 2,4KB exibido em card pequeno
  (`twitter:card summary`), quase invisível em feed.
- codexdojo-os: `dojo-wallpaper.png` — 1586×992, **1,87MB**; plataformas cortam ou dão
  timeout no unfurl de imagens nesse porte.

## Proposed outcome

Cards grandes (`summary_large_image`) com arte dedicada 1200×630, leve e determinística,
nas 2 superfícies públicas:

- `engines/literacyDojo/public/og.png` (61KB) — conceito "Ritmo diário" selecionado entre
  3 conceitos produzidos pelo Content Designer (anexados na AID-1858; critério registrado
  no comentário final). Identidade vigente do DESIGN.md: papel `#f8f4ea`, violeta `#6657e8`,
  pastéis menta/sol/coral, raios 18–24px. Copy 100% do pool sancionado (og:title /
  og:description / voz T0 "lições curtas… cinco minutos por dia") — nenhuma palavra nova,
  nenhuma marca nova.
- `engines/codexdojo-os-prototype/public/og.jpg` (58KB) — wallpaper dojo recortado
  (cover 1200×630) e recomprimido (JPEG q82), mesma imagem de identidade, sem nova arte.

Zero mudança de fluxo, estado, telemetria ou copy sancionada (T0/T1-G intocadas). Sem
dependências novas; assets estáticos servidos do próprio host — nenhuma chamada de rede
em runtime além do fetch do próprio asset.

## Affected users and systems

Candidatos O1 alcançados pelo Canal 2 (AID-909) — topo do funil. Apenas shell estático
(`index.html`) e assets em `public/` das 2 engines; nenhum domínio de conteúdo
(`curriculum/`), estado (`learner/`) ou instrumentação.

## Constraints

- Copy do arte usa exclusivamente fragmentos verbatim dos metadados vigentes e da voz
  sancionada de produto; T0/T1-G não alteradas.
- Assets <300KB (alvo da auditoria: literacy <300KB; codex ~200KB) — entregues com 61KB/58KB.
- Arte renderizada deterministicamente (HTML/CSS + chromium local, sem rede); fonte do
  conceito preservada como attachment na AID-1858.
- PR-first sob R1: engine + superfície live ⇒ 2 reviews (1 de área `/engines/` + 1
  qualquer) + QA countersign; merger FPE.
- Live serving depende do redeploy QW0 (owner FPE) — esta PR só garante `main` correto.

## Open questions

- Nenhuma no escopo. Redeploy das superfícies (QW0) permanece follow-up do FPE.
