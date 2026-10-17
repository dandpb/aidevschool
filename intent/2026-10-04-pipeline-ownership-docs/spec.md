# Spec: mapa documental do pipeline

Origem e autorização: [intent.md](intent.md). Fluxo proporcional: documentação
local reversível, com revisão independente. Sem mudança de contrato executável.

## Critérios observáveis

1. Uma página do handbook distingue `learner/pipeline_status.yaml` (estado),
   seu Markdown (narrativa), OpenClaw (implementação do helper e checklist),
   MME (ciclo interativo/supervisor) e learner substrate (outra autoridade de estado).
2. Callers de escrita e consumers citados têm links para fontes existentes.
   Contratos em prompts são identificados como instruções, separados de código.
3. `simulate`, `verified`, `unspecified` e `advanced_by` são explicados sem
   atribuir autenticação, exclusão global ou mastery aos campos de procedência.
4. A página descreve atomicidade por arquivo, rollback local do scheduler e
   compare-and-advance do supervisor sem prometer transação/lock entre todos os writers.
5. O índice do handbook liga a nova página. Nenhum runtime, estado ou teste muda.

## Fontes e política

`AGENTS.md`, `CLAUDE.md`, `docs/AGENTS.md`, `docs/DOCUMENTATION.md`, `REVIEW.md`,
`.claude/skills/ai-native-sdlc/SKILL.md`, `.tasks/context-authority.md` e
`docs/design/adr/0002-openclaw-role.md`, no HEAD registrado em intent.md.
O pedido atual autoriza a fatia documental e proíbe commits/publicação; os
artefatos ficam registrados no working tree. Não há mudança de prompts,
roadmap, gates, memória ou cobertura de entregáveis: MANIFEST não muda.

## Limites e questão pendente

Mover o helper para `learner/`, alterar imports, schema, fases, locks ou a política
de verificação exige plano próprio delimitado e revisão. A autorização de testes
de R2a continua pendente com Dani; esta fatia não depende dela.
