# Spec: quickstart do loop de docs pela fábrica

Change-id: AID-2698-docs-factory-poc · From: intent/AID-2698-docs-factory-poc/intent.md

## Behavioral requirements

1. `docs/handbook/14_factory_docs_loop.md` existe, em inglês no estilo do
   handbook, com as seções `Prerequisites`, `Step by step` e `Verification`,
   linkando o README da fábrica como fonte canônica dos internals e o loop
   SDLC como fonte do formato de contrato.
2. A página carrega uma linha `Last verified:` com data ISO e fonte
   verificável (run + issue) — regra de ouro do domínio docs: zero claim de
   readiness sem data + fonte no repo.
3. `docs/handbook/README.md` ganha linha de índice apontando para a página
   nova (o índice é o contrato de navegabilidade do handbook).
4. Todos os links relativos `.md` da página nova resolvem para arquivos
   existentes no repo no SHA provado.

## Checks (derivação)

- C1 (cheap): estrutura + claim datada presentes na página.
- C2 (cheap): linha de índice presente no README do handbook.
- C3 (standard): todos os links relativos resolvem — rodado pelo verificador
  em clean-room, prova a independência P2/P3 para diff só-de-docs.

## Non-goals

- Não ensina internals da fábrica (dono: README da fábrica); não altera
  `factory/`, engines, `learner/`, `curriculum/`, `.mavis/`.
- Não publica a field-guide do programa (compilada ao final do AID-2698 com
  os achados de todos os POCs).
