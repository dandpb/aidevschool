# Plan: docs pela fábrica — quickstart do loop de documentação

Change-id: AID-2698-docs-factory-poc · From: intent/AID-2698-docs-factory-poc/spec.md · Status: approved

Aprovação: a própria issue AID-2698 (FACTORY-STRESS, programa umbrella
AID-2681) designa o Docs & Readiness Engineer para rodar 1 mudança de
documentação pela fábrica; escopo e aceite do POC são o GO do programa
(flip `backlog→todo` + comentário de base na issue).

## Files that change

- `docs/handbook/14_factory_docs_loop.md` (new) — quickstart do autor de docs.
- `docs/handbook/README.md` — linha de índice 14.
- `intent/AID-2698-docs-factory-poc/{intent,spec,plan,checks}.md` (new) —
  registro versionado deste contrato (dogfooding, como o piloto AID-2676).

## Order of work

1. Congelar este contrato a partir do registro versionado (freeze ANTES do
   build; digest lock).
2. Build: autor (contexto distinto) escreve página + índice em worktree
   isolado no SHA da base e produz commit único.
3. Prove: verificador roda C1–C3 em clean-room no build SHA.
4. Gate com `--pr-head` = head do branch; PR pequeno para decisão humana
   (FPE single-writer até R1).
