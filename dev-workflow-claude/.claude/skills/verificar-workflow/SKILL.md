---
name: verificar-workflow
description: Verificação adversarial e independente de um fluxo da biblioteca (ou do exemplo-pratico). Use após criar ou consertar um workflow, ou quando pedirem um veredito produtor ≠ verificador.
---

# Verificar um workflow (adversarial)

Você audita; não conserta. Em caso de dúvida, seja cético.

1. Leia o `RESULTADO.md` e o comando em `.claude/commands/` do fluxo.
2. Reexecute o bloco `## Como reproduzir` a partir de `dev-workflow-claude/`;
   capture o exit code final.
3. Confronte números afirmados × observados: contagens de testes, ms, crashes,
   versões, tags. Divergência relevante = evidência reprovada.
4. Cheque se o comando é genérico (funcionaria em outro projeto) e se o estado
   "antes" está preservado em artefato (commit, log, cópia).
5. Veredito **APROVADO** exige as três coisas: reprodução com exit 0 + evidência
   conferida + comando genérico. Liste TODAS as ressalvas encontradas, mesmo nas
   aprovações, numa tabela fluxo × checagem × resultado.
6. Entregue o veredito a quem pediu. Correções são trabalho do produtor — se você
   corrigir, seu veredito deixa de valer.
