# Plan — AID-757 (fast path: mudança docs-only, delimitada e sem código)

## Entregas

| # | Arquivo | Mudança |
| --- | --- | --- |
| 1 | `docs/piloto/CRITERIO_O3C2.md` | Linha I2: pendência → decisão registrada (`optional`, card `3c0474e9` Q2) |
| 2 | `docs/piloto/README.md` | Bloco Status: GO `run-now` (card `3c0474e9` Q1) + apontador para o I2 resolvido |
| 3 | `intent/AID-757-p6-founder-decisions/` | intent.md + plan.md (este par) |

RUNBOOK_FACILITADOR.md e FICHA_P6.md não referenciam o GO como pendente — sem
edição (a ordem manda não inventar seção sem pendência).

## Passos

1. Editar 1–3 sobre base `origin/main` @ `b549aea`.
2. Auto-verificação: grep `pendente|founder` em `docs/piloto/` → só
   board-gated (`LEITURA_FUNIL_OPB.md` §0) e papéis; diff revisado.
3. PR único docs-only → ping CEO para merge single-writer → receipt na AID-757
   com diff + rev; comentário-receipt complementar na AID-699 (resume).

## Fora de escopo

Rodar o piloto; alterar PRD (`docs/prioridades/`), gates §8.7, learner state,
verificador, engine code, analytics; criar cards ou issues novas.
