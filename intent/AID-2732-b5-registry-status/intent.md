# Intent: factory B5 — freeze/load_from_registry aceita o registro canônico de main (AID-2732)

Author: Platform & CI (Paperclip AID-2732, ordem AID-2736 §2) · Change-id: AID-2732-b5-registry-status · Status: accepted

> Defeito cluster B5 do `improvements-backlog` (AID-2681), 3 fontes
> independentes na onda 1: AID-2683 F0 (friction-log #10), AID-2684 #3 +
> adendum #17 (repro first-hand), AID-2686 #5/F1. Repro mínima no corpo da
> AID-2732.

## Problem

`factory/contract.py:25` (`PLAN_APPROVED = ^\s*Status:\s*approved\b` com
`re.MULTILINE`) só aceita `Status:` em início de linha, mas o registro
canônico de `main` (`intent/AID-2676-agentic-factory-poc/plan.md`) carrega o
header no formato do template oficial
(`docs/sdlc/templates/plan.md`): `Change-id: <cid> · From: <path> · Status:
approved` — campo mid-line separado por `·`. Resultado: `ContractError` em
`load_from_registry`/`freeze` para o único registro real da fábrica. Os
testes passam porque usam fixture sintético no formato aceito
(`factory/tests/test_factory_poc.py:53`) — a factory nunca rodou contra o
próprio registro.

## Proposed outcome

- `PLAN_APPROVED` aceita `Status:` como campo de header nas duas formas
  canônicas: própria linha e campo mid-line após `·` (separador do
  template). Menções incidentais em prossa (sem ser campo de header) não
  satisfazem a aprovação — contrato permanece estrito.
- Teste de regressão congela o registro REAL `AID-2676-agentic-factory-poc`
  (fail antes do fix, pass depois).
- CI smoke de registry: todo `intent/*/` com `checks.md` (registro de
  fábrica) passa por `load_from_registry` no CI — pega esta classe de defeito
  para qualquer registro futuro; caso negativo (registro inválido) falha.
- Job de CI dedicado para `factory/tests` (hoje nenhum job roda a suíte da
  fábrica — cobertura fixture-only era invisível).

## Affected users and systems

`factory/contract.py` + `factory/tests/` + `.github/workflows/ci.yml`
(factory POC). Sem mudança em produção (`learner/`, `curriculum/`,
`.mavis/`). Runtime `.scratch/factory/` inalterado em formato.

## Constraints

- Não enfraquecer a exigência de aprovação: `Status: approved` tem de ser um
  campo de header de verdade, não texto citado em prosa/backticks.
- Backward compat total: forma em linha própria (fixture AID-2715/AID-2721)
  continua aceita.
- Produtor ≠ verificador; sem hotfix fora do loop; base `origin/main`
  (`ae9db6fc`, contém `c54e12ee` citado na issue).

## Open questions

- Nenhuma no escopo B5. Base pinada (`freeze` sem `--base-sha` recusar HEAD
  destacado — proposta 5/AID-2684) fica para issue própria, como previsto na
  própria AID-2732 (item opcional).
