# Intent: registro retroativo dos ARIA labels contextuais (PR #228, origem Palette)

> **RETROSPECTIVE RECORD** — criado retroativamente em 2026-09-09 pelo CEO
> sob AID-1136 r2, em resposta ao achado **F1 (Major)** do countersign QA
> AID-1137 (r1): o PR foi merged **sem trilha fast-path do produtor**. A
> substância abaixo (o quê/por quê) são **afirmações do bot Palette no corpo
> do PR #228**, não re-verificadas de forma independente para este retrofit —
> a aceitação da época foi o founder merge no GitHub.

Author: Palette (bot externo, conta `dandpb`, via `google-labs-jules[bot]`) ·
registro retroativo: CEO (AID-1136 r2) · Change-id:
`2026-09-01-aria-labels-palette` · Status: accepted (founder merge GitHub;
retrofit docs-only)

## Problem (claim do produtor)

Screen readers anunciavam textos genéricos de botões ("Ver projeto") fora de
contexto ou não descreviam botões só-de-ícone (close/send), nas superfícies
do codexDojo e do protótipo OS.

## Fix aplicado (claim do produtor)

`aria-label` explícitos + texto/ícones visuais envoltos em
`aria-hidden="true"` para botões genéricos ("Ver projeto", "Concluir etapa",
"Ver agentes", "Avançar ciclo", "Abrir briefing", close/send só-de-ícone).
Diff: `engines/codexDojo/src/render/cycle.ts`, `overview.ts`, `roadmap.ts`,
`render.test.ts`; `engines/codexdojo-os-prototype/src/learning/LearningRail.tsx`;
`docs/product-readiness/README.md` (+3/−3). Mudança estrutural de HTML, sem
efeito visual.

## Merge

PR #228 merged por founder merge GitHub em 2026-09-01 22:58:13Z, merge
commit `f1ec086aa7e54be14430d52a6d666fd2a7d68460`.
