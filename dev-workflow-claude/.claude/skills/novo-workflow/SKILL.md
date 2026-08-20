---
name: novo-workflow
description: Cria um novo exemplo na biblioteca (workflows/NN-slug) seguindo a convenção — comando genérico + demo executado de verdade + RESULTADO.md com evidência real. Use quando pedirem um novo fluxo de desenvolvimento para a biblioteca.
---

# Criar um novo workflow na biblioteca

Espelhe os fluxos 02–11. Convenção obrigatória em `workflows/NN-slug/`:

1. `.claude/commands/<nome>.md` — o slash command permanente: frontmatter com
   `description`, corpo em pt-BR com passos numerados, `$ARGUMENTS` quando fizer
   sentido. **Genérico**: nada amarrado ao demo.
2. `demo/` — projeto Node mínimo, zero dependências, testes com `node:test`.
   Pode copiar `exemplo-pratico/` como base: remova `.claude/` e `README.md` da
   cópia, renomeie o `name` no package.json e ajuste o `CLAUDE.md` copiado,
   apagando regras que citem `/nova-feature` ou o subagente `verificador` —
   eles não existem dentro do demo.
3. **Execute o fluxo de verdade** no demo e cole as saídas reais no
   `RESULTADO.md`, com exatamente estas seções: `## Problema que resolve`,
   `## O comando`, `## Execução real`, `## Como reproduzir`, `## Valor para o dev`.
4. `## Como reproduzir` = o contrato da regra 2 do `CLAUDE.md` (um bloco bash,
   relativo à raiz, exit 0), provando o resultado do fluxo.
5. **Preserve o "antes"** (lição da primeira auditoria): estado pré-correção em
   commit local do demo, log ou cópia — alegação histórica sem artefato reprova
   na verificação.
6. Valide: `node tools/auditar-workflows.mjs` (o script descobre o fluxo sozinho
   pelo RESULTADO.md).
7. Peça verificação independente via skill `verificar-workflow`. Só depois do
   APROVADO, atualize a página conforme a regra 5 do `CLAUDE.md` (linha na
   tabela + card, com o número real de evidência e a ressalva do verificador).
