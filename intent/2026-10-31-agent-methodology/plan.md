# Plan: metodologia para agentes do AIDevSchool

Change-id: 2026-10-31-agent-methodology · From: spec.md · Status: draft

## Files and order

1. Registrar intent, spec e plano neste diretório.
2. Criar `docs/sdlc/agent-methodology.md` com adaptação, limites e adoção.
3. Referenciar a orientação em `AGENTS.md`, `CLAUDE.md` e
   `engines/codexDojo/ecosystem/MANIFEST.md`.
4. Verificar diff, integridade dos links locais e referências de fontes; relatar
   resultados e limitações sem instalar código externo.
5. Registrar em `intent/2026-10-31-agent-methodology/rollout.md` os alvos
   identificáveis, o piloto isolado proposto e as provas ainda necessárias.
6. Registrar a revisão independente e seus limites em `review.md`.

## Risks and proof

A disponibilidade dos arquivos não garante carregamento ou conformidade de
cada agente. Sem inventário de alvos não há rollout comprovado. Verificar
`git diff --check`, estado Git e existência dos arquivos locais referenciados;
inspecionar o diff contra spec e regras existentes. Não há alteração executável
que justifique executar os testes das aplicações.

## Verification split

Verificador independente em contexto novo revisa o diff contra este plano,
spec, autorização, fontes fixadas e gates. O relatório dessa revisão é parcial
quando não alcança as fontes, a instalação ou alterações feitas depois dela;
não substitui aceite nem countersign de merge.
