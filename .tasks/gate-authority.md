# Autoridade do gate: juízo mora com quem avalia, barra numérica vincula

> Build this with **tlc-implement**.
> Every criterion below becomes a check with a proof, referenced by its number. Nothing under
> `Unresolved` gets settled while building.

## Intent

A regra central da escola — "completion certainty never lives in the LLM" — é aplicada por um
juízo que não mora onde deveria e por uma barra numérica que não vincula:

- O juízo de veredito (`VerifierVerdict.verified_pass`, `independently_verified_pass`,
  `game_metric_violations`, rubricas de jogo) vive em `curriculum/_shared/evidence.py` —
  tooling de um contexto Supporting — enquanto o gate vivo (`learner/gate/*`) **importa a
  própria barra de fora**: `verifier_receipt.py:11` importa `COVERAGE_MIN, MUTATION_MIN`,
  `security.py:11` importa `independently_verified_pass`, `canonical_gate.py:14` importa
  `game_metric_violations`, e `learner/substrate/__init__.py:453` importa `check_evidence`
  dentro do próprio `validate()`.
- A barra é hardcoded em `curriculum/_shared/evidence.py:38-39`
  (`MUTATION_MIN = 0.65`, `COVERAGE_MIN = 0.80`); o seam declarado
  (`engines/minimaxDojo/config/learner.yaml`, per AGENTS.md e o docstring de
  `test_threshold_drift.py`) **não é lido pelo gate**. Três cópias não vinculadas; a cerca
  cobre 2 de 3 (learner.yaml ↔ learning_state.yaml ↔ SKILL.md); o drift 0.60-vs-0.65 já
  aconteceu uma vez (`docs/DOMAIN_ANALYSIS_2026-07-08.md:493`), e o audit de julho deu o
  seam como sadio verificando existência, não vínculo.
- `curriculum/_shared/evidence.py` importa `engines.openclaw.errors.StateCorruptionError`
  (linhas 213/223/254/397/474) enquanto `engines/openclaw/runner/scheduler.py:11-13` importa
  `curriculum._shared.evidence` — ciclo de import entre contextos.

Quem paga: qualquer mudança no gate (inclusive o trabalho de instâncias múltiplas
`learner/new_instance.py`, em flight) edita tooling de curriculum; e uma mudança no seam
declarado muda o comportamento de **nada** — miscertificação silenciosa de mastery, o único
erro que esta arquitetura existe para impedir.

A mudança: o juízo (veredito, elegibilidade, thresholds, rubricas) passa a morar em módulo sob
`learner/`; `curriculum/_shared` fica com identidade e descoberta de artefatos; a barra vive
de uma fonte load-bearing (unidade > seam, com falha loud); o ciclo de import quebra via home
neutra de primitivas; a cerca de drift cobre qualquer reintrodução de literal.

8 critérios em 4 slices · 2 one-way doors · 1 aberta

## Criteria

### Slice 1 — A barra numérica vincula

1. Given `engines/minimaxDojo/config/learner.yaml` com `gates.mutation_score_min: 0.55`
   (fixture de teste), when `python3 -m learner.gate` avalia evidência com
   `mutation_score: 0.60` (coverage ≥ mínimo e `context_isolated: true`), then o veredito é
   FAIL e o blocker cita `0.60 < 0.55` — a mesma evidência que passa hoje (0.60 < 0.65 é
   FAIL hoje; a prova é a inversão com 0.55: um 0.58 passa) reprova/aprova conforme o seam.
2. When o arquivo do seam não existe ou não parseia como YAML mapping, then
   `python3 -m learner.gate` termina com exit ≠ 0 e mensagem nomeando o caminho do seam —
   sem fallback silencioso (os `FALLBACK_*` de `engines/minimaxDojo/core/config.py` não
   participam do caminho do gate vivo).
3. Always, `grep -rnE "(MUTATION_MIN|COVERAGE_MIN)\s*=\s*0\.[0-9]+" learner/ curriculum/
   engines/` retorna vazio — nenhum literal de threshold em código; os valores vivem no
   seam (e, espelhados por unidade, em `learning_state.yaml`, cercados pelo drift test).

### Slice 2 — Juízo mora com quem avalia

4. When `grep -rn "verified_pass\|game_metric_violations\|independently_verified_pass"
   curriculum/_shared/`, then vazio — clean cutover, sem re-export ou alias: os símbolos de
   juízo (`VerifierVerdict`, `verified_pass`, `independently_verified_pass`,
   `game_metric_violations`, `check_evidence`, grading de rubricas) moram em módulo sob
   `learner/`.
5. When as suítes afetadas rodam (`make test`, `python3 -m pytest engines/openclaw/tests/
   curriculum/_shared/tests/`), then verde — os 9 import sites atualizados:
   `learner/gate/{canonical_gate.py:14, security.py:11, verifier_receipt.py:11}`,
   `learner/gate/tests/test_gate.py:14`, `learner/substrate/{__init__.py:453,
   dashboard_snapshot.py:29}`, `engines/openclaw/runner/scheduler.py:11-13`,
   `engines/openclaw/tests/test_scheduler.py:9`, `curriculum/_shared/tests/test_evidence.py:15`.

### Slice 3 — Ciclo de import quebrado

6. When `grep -rnE "from engines\.|import engines\." curriculum/`, then vazio —
   `StateCorruptionError`, `utc_now_iso` e `atomic_write_text` moram em home neutra
   (a Phase 1 do `docs/TECH_DEBT_AUDIT_2026-07-08.md` já mandava: "extract `fsio` to a
   top-level `shared/`").
7. Given o repo pós-mudança, when `python3 -c "import curriculum._shared.evidence;
   import engines.openclaw.runner.scheduler"`, then ambos importam (o ciclo
   curriculum⇄engines não existe mais em nenhum sentido).

### Slice 4 — Cerca estendida

8. When um PR reintroduz `mutation` hardcoded (`0.6[0-9]` ou `6[0-9]\s*%`) em qualquer
   `.py` sob `learner/` ou `curriculum/`, then o drift test estendido
   (`engines/minimaxDojo/tests/test_threshold_drift.py`) falha nomeando o arquivo.

## Out of scope

- Deduplicar o enum `Phase` coarse de `curriculum/_shared/evidence.py` vs o enum fino do
  openclaw (issue M8) — é do pipeline, não do gate; dono é a task
  `.tasks/pipeline-write-authority.md`.
- Migrar o `core/` dormente do minimaxDojo para ler o novo home — é referência de
  especificação, não caminho vivo.
- Mudar valores de threshold — o trabalho move a fonte, não os números.

## Observable

| Surface | Decision | Landing |
| --- | --- | --- |
| command `python3 -m learner.gate` | exit codes e output quando falha no meio | 1, 2 |
| command `python3 -m learner.gate` | o que imprime com seam ausente/corrompido | 2 |
| command `python3 -m learner.substrate` | output de sync inalterado (validate continua verde) | 5 |
| documento `engines/minimaxDojo/config/learner.yaml` | continua sendo o seam declarado (AGENTS.md inalterado) | existing |

## Swept

- validation: 2 (seam inválido → falha loud, não fallback)
- failure modes: 2 (arquivo ausente/malformado nomeia o caminho) e 8 (reintrodução falha na cerca)
- idempotency and retry: existing — anti-replay em `learner/gate/canonical_gate.py`
- authorization: existing — receipt + isolamento de contexto do verificador
- concurrency and ordering: existing — `atomic_write_text` no caminho canônico
- data lifecycle: n/a — nada a migrar; os valores já existem no seam e em `learning_state.yaml`
- external-dependency failure: n/a — filesystem apenas
- state transitions: n/a — a máquina de learning state não muda
- observability: 8 (drift test é o sensor)

## Impact

| Front | What changes |
|---|---|
| domain | new term: home neutra de primitivas (`shared/` top-level: `StateCorruptionError`, `utc_now_iso`, `atomic_write_text`) - vivia espalhada em engines.openclaw/curriculum |
| domain | existing term: `VerifierVerdict.verified_pass` meant "juízo em curriculum tooling", now means "juízo em learner" - quem importa hoje: os 9 sites do critério 5 |
| domain | existing term: `MUTATION_MIN`/`COVERAGE_MIN` (globais em evidence.py) deixam de existir como constantes - quem importa: `learner/gate/verifier_receipt.py:11` |
| stored data | nothing to migrate - valores idênticos já no seam e no `active_unit.empirical_gate` |

## Decided

| Decision | Shape | Alternative rejected |
|---|---|---|
| Fonte load-bearing da barra | `mutation_min = active_unit.empirical_gate.mutation_min ?? seam.gates.mutation_score_min` (per-unidade quando presente; seam como default; falha loud se o seam sumir) | Seam-only — ignora o dado por-unidade que já existe cercado no estado canônico (unidades no_code/jogo precisam de barra própria) |
| Home do juízo | módulo sob `learner/` (extensão do padrão existente `learner/gate/`) | Manter em `curriculum/_shared` + apenas vincular a fonte — deixaria Core logic em contexto Supporting, a divergência H1 inteira |
| Home neutra de primitivas | `shared/` top-level (precedente: Phase 1 do audit 2026-07-08) | `learner/substrate` como home — acoplararia openclaw/curriculum ao contexto Journey |

## Sources

- Análise de domínio desta sessão (chat 2026-09-13, sem endereço) — H1+H2: evidência
  literal citada no Intent (`evidence.py:38-39`, os 9 imports, o ciclo)
- `AGENTS.md` §CODE MAP/CONVENTIONS — seam declarado em `engines/minimaxDojo/config/learner.yaml`
- `engines/minimaxDojo/tests/test_threshold_drift.py` — cerca atual (docstring: "single
  numeric source") e a lacuna: não cobre `evidence.py`
- `docs/TECH_DEBT_AUDIT_2026-07-08.md` §Phase 1 — precedente da home neutra de `fsio`
- `docs/DOMAIN_ANALYSIS_2026-07-08.md:493` — drift histórico 0.60-vs-0.65

## Unresolved

| # | Kind | Question | Until answered |
|---|---|---|---|
| 1 | open | A barra viva deve ler o seam `learner.yaml` (default escrito no Decided) ou o estado canônico deveria se tornar a única fonte e o AGENTS.md emendado? | Default: unidade > seam (Decided linha 1). Se a resposta for "canonical-only", teardown: a linha 1 do Decided e o critério 1 mudam de fixture (o 0.55 passa a ser editado em `learning_state.yaml`) |
