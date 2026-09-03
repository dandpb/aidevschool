# Plan — AID-720 (fast path: mudança docs-only, delimitada e sem código)

## Entregas

| # | Arquivo | Papel |
| --- | --- | --- |
| 1 | `docs/piloto/RUNBOOK_FACILITADOR.md` | Runbook de 1 página: conduzir 1–3 alunos na entrada pública LiteracyDojo → primeira lição → retry → retorno |
| 2 | `docs/piloto/FICHA_P6.md` | Checklist objetivo por participante: bloqueios de 1ª jornada, tempo até 1ª conclusão, `completed ≠ mastered`, sinais de ritmo diário |
| 3 | `docs/piloto/LEITURA_FUNIL_OPB.md` | Procedimento de leitura do funil (pré-condições de ativação; export NDJSON; drift monitor; `aggregate_funnel.mjs`; interpretação D1/D2/R1-R21) |
| 4 | `docs/piloto/CRITERIO_O3C2.md` | Gate quantitativo mínimo + assinaturas (QA valida evidência, CEO despacha O3-C2) |
| 5 | `docs/piloto/README.md` | Índice do kit P6 amarrando PRD, kit AID-639 e os 4 artefatos novos |
| 6 | `docs/PILOTO_PERCURSO_CLIENTE.md` | Ponteiro para o kit P6 (edição mínima) |
| 7 | `docs/DOCUMENTATION.md` | Linha do facilitador menciona o kit P6 (edição mínima) |

## Passos

1. Escrever os artefatos 1–7 (base factual: PRD caso-p6, kit AID-639,
   facilitator-guide, ADR-0009/0010, `learner/gate/analytics/README.md`,
   netlify.toml do OS e do literacy, `analyticsSinks.ts`).
2. Auto-verificação: comandos documentados em (3) executados de verdade contra
   a fixture sintética (`learner/gate/tests/fixtures/analytics/synthetic`);
   links relativos conferidos; `scripts/sdlc_guard_check.sh` limpo no diff.
3. PR único → merge → receipt na AID-720.

## Fora de escopo

Ativar transporte/emissão; criar recepção literacy; produzir lições l08–l13;
alterar gates, learner state, verificador ou analytics tooling.
