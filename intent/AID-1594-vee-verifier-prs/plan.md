# Plan: VERIFIER WAVE 1 — tripwire de cobertura, avaliadores 11+12, verificador de checklist ADR-0004

Change-id: `AID-1594-vee-verifier-prs` · From: intent/AID-1594-vee-verifier-prs/intent.md · Status: approved

> Aprovação: card CEO `a0a9a93a` (accept formal board-only; registro canônico na
> ORDEM AID-1592/B = AID-1594). Este plan.md documenta o que foi executado —
> todos os passos abaixo já estão abertos como PRs, verdes, aguardando
> single-writer FPE. Recibo de execução: AID-1582 comentário `db8af478`.

## Files that change

**PR1 — #365** `aid-1594/pr1-gate-coverage-tripwire` (base `main`):
- `learner/gate/tests/test_gate_game_coverage.py` (new) — tripwire de cobertura
  bidirecional `voxelDojo/catalog.json` × `GAME_SPECS` × bridge, com allowlist
  explícita `ALLOWED_UNVERIFIED` (9 jogos de dívida) e game-10 pinado ao valor
  exato do `unitId` errado congela a dívida L4 visível até o fix.

**PR2 — #366** `aid-1594/pr2-evaluators-11-12` (base = #365, stacked):
- `learner/gate/teaching_game_bridge.py` — avaliadores AIR TRAFFIC (U11) e
  MISSION CONTROL (U12) com replay independente das regras da engine
  (producer ≠ verifier; métricas forjadas/pass falso rejeitados).
- `learner/gate/game_specs.py` (entradas GAME_SPECS) + 48 testes de
  aceitação/rejeição.
- `learner/gate/tests/test_gate_game_coverage.py` — allowlist 9→7 (única
  edição de teste; trailer `SDLC-ALLOW-TEST-EDIT: AID-1594` no commit).

**PR3 — #367** `aid-1594/pr3-no-code-checklist-verifier` (base `main`, independente):
- `learner/gate/no_code_checklist.py` (new) — verificador estrutural ADR-0004:
  fail-closed, receipt digest-bound (`atomic_write_text`, SHA-256 sobre campos
  estáveis), contrato JSON schema_version 1 fechado.
- `learner/gate/README.md` — seção do verificador + contrato do artifact.
- `learner/gate/tests/` — 17 testes novos.

## Order of work (executada 2026-09-13, ordem imposta pela decisão do CEO)

| # | Passo | Evidência |
| --- | --- | --- |
| 1 | PR1 tripwire primeiro (protege o gate durante a adição) | #365 head `362a603b0c` (+update-branch `d953399be5` pós-#362) |
| 2 | PR2 avaliadores 11+12, stacked no PR1 | #366 head `a96aa78388` (trailer SDLC-ALLOW-TEST-EDIT) |
| 3 | PR3 verificador checklist ADR-0004 | #367 head `4e0f5b90ca` |
| 4 | Recibo na AID-1582 + despacho ao FPE via relay AID-1600 (merge order PR1→PR2→PR3) | comentário `db8af478` (03:31Z); relay AID-1600 ack FPE `0a163ecf` (03:39Z, GO nos 3) |
| 5 | Registro pré-merge da cadeia em `intent/` (este diretório) | AID-1603; na criação: 3 PRs abertas, 0 merged |

## Merge conditions (single-writer FPE, até R1)

1. Merge order #365 → #366 (retarget) → #367; CI verde em cada head.
2. **#367: countersign humano do Promotor registrado no momento do merge**
   (ORDEM AID-1592/B item 3). O verificador declara
   `promoter_countersign_required: true` e `mastery_eligible: false` sempre —
   o registro do countersign é evento humano/board, não tooling.
3. HASH RING (10) permanece de fora até o fix de
   `engines/voxelDojo/catalog.json:48` (Curriculum Platform Engineer).

## Risks

- Merge de #367 sem o countersign registrado → mitigado por esta seção +
  registro no PR #367 + relay AID-1600; residual: disciplina do merger.
- Tripwire vira atrito em churn de catálogo → allowlist explícita e comentada
  é o ponto único de edição consciente (padrão `anchorCheckIds` AID-1556).
- Verificador estrutural aceitar checklist semanticamente oco → aceito por
  design: pisos (≥3 itens, comprimentos mínimos) só rejeitam stubs;
  falsificabilidade semântica é julgamento humano do Prometor (ADR-0004 §3).
- Alternativa considerada e NÃO escolhida: avaliador HASH RING no PR2 junto
  com os outros dois — exigiria editar `catalog.json` (conteúdo de engine,
  fora da minha write-boundary e misturaria producer≠verifier).

## Proof (executada por PR head; recito do db8af478, re-verificável)

- `python3 -m pytest learner/gate/tests -q` → **315 passed** (#365) ·
  **363 passed** (#366) · **327 passed** (#367, branch independente).
- Suites vizinhas sem regressão: `python3 -m pytest learner/substrate/tests
  learner/tests curriculum/_shared/tests curriculum/ai-literacy/tools/tests
  engines/test_engine_contracts.py -q` → **287 passed**.
- CI GitHub nos 3 PRs: **37 pass / 0 fail** cada
  (`gh pr checks 365|366|367 --repo dandpb/aidevschool`).
- Eleição do game-12 cross-checkada Python×Node (`delta@1`, sucessão `beta@2`).

## Verification split

- **FPE (fresh-context, single-writer)**: leu integralmente os 3 diffs,
  re-executou pytest por head (315/363/327), test-merge local sobre
  `origin/main` pós-#362 sem conflitos (380 gate + 287 adjacentes) —
  relay AID-1600 comentário `0a163ecf`, GO nos 3.
- **CEO (board)**: card `a0a9a93a` aprovou escopo e ordem (verdadeiro owner
  da decisão de produto).
