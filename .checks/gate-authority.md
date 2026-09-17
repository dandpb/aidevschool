# Gate authority — juízo sob learner/, barra vinculada ao seam

Sources:

- `.tasks/gate-authority.md` - **binding**: os 8 critérios, Decided rows (fonte da barra, home do juízo, home neutra) e Unresolved 1 (default: unidade > seam)
- `AGENTS.md` (root) - seam declarado `engines/minimaxDojo/config/learner.yaml` (§CODE MAP/CONVENTIONS)
- `engines/minimaxDojo/tests/test_threshold_drift.py` - cerca atual (learner.yaml ↔ learning_state.yaml ↔ SKILL.md)
- `docs/TECH_DEBT_AUDIT_2026-07-08.md` §Phase 1 - precedente da home neutra de primitivas

## Out of scope

- Deduplicar enum Phase coarse/fino (M8) - dono: `.tasks/pipeline-write-authority.md`
- Migrar minimaxDojo `core/` dormente - especificação, não caminho vivo
- Mudar valores de threshold - mover a fonte, não os números

## Landing

Módulo novo `learner/gate/standards.py` (juízo + barra), cirurgia em `curriculum/_shared/evidence.py` (só descoberta/identidade), pacote novo `shared/` (errors/time/fsio). Reusa o `__getattr__` lazy de `learner/gate/__init__.py` (import barato, sem cycle) e o padrão de fences do `test_threshold_drift.py`.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| API da barra | `load_thresholds(config_path=None) -> Thresholds` lê `gates.mutation_score_min`/`cobertura_nucleo_min` por chamada (sem cache); `effective_thresholds(unit_gate, base=None)` sobrepõe chaves `mutation_min`/`min_coverage` | constantes módulo com cache - rebind invisível em processo vivo; staleness silencioso |
| Falha do seam | `ThresholdSeamError(ValueError)` nomeando o caminho; sem FALLBACK | fallback para constantes (padrão `core/config.py` do minimax) - é exatamente o mute que H2 denuncia |
| Propriedade `verified_pass` | mantida em `VerifierVerdict` (agora em learner), lê `load_thresholds()` por chamada; consumers cross-projeto (`statuses`) usam seam default; caminho unit-scoped do gate usa `effective_thresholds(active_unit.empirical_gate)` | thresholds no construtor - quebraria os 6 sites de construção que leem de disco |
| Predicado para curriculum | `verdict_passed(verdict)` / `verdict_blockers(verdict)` exportados de standards; curriculum nunca menciona `verified_pass` (grep do critério 4 do task exige string ausente) | re-export do nome `verified_pass` - viola o grep e cria alias |
| Escopo da cerca | `.py` de produção sob `learner/` e `curriculum/` (exclui `tests/`); continua cobrindo learner.yaml/learning_state.yaml/SKILL.md como hoje | qualquer `.py` incluindo fixtures de teste - falso-positivo em scores legítimos (ex. 0.64 abaixo da barra) |
| Home neutra | `shared/` top-level: `errors.py` (`StateCorruptionError`), `time.py` (`utc_now_iso`), `fsio.py` (`atomic_write_text`, `resolve_contained`); `learner/substrate/fsio.py` e `curriculum/_shared/time.py` deletados; `engines/openclaw/errors.py` fica só com `OpenclawError` | re-exports nos módulos antigos - alias perpetua a home errada (clean cutover) |

- Nothing else in this change is hard to reverse

## Checks

### S1 - A barra numérica vincula · learner/gate/standards.py + verifier_receipt.py + canonical_gate.py + testes · ~34 KB · ~9k

**C1** - Virar o seam (0.65→0.55) inverte o veredito do gate sobre mutation 0.58: FAIL hoje, PASS com seam 0.55 — tanto pelo caminho de receipt (`receipt_violations`) quanto pelo bloco verifier (`independently_verified_pass`)
Proof: `python3 -m pytest learner/gate/tests/test_standards.py::test_seam_flip_flips_enforced_bar learner/gate/tests/test_standards.py::test_default_seam_path_is_the_declared_one`

**C2** - `effective_thresholds` sobrepõe `active_unit.empirical_gate.mutation_min`/`min_coverage` quando presentes e cai no seam quando ausentes
Proof: `python3 -m pytest learner/gate/tests/test_standards.py::test_effective_thresholds_overrides_and_falls_back`

**C3** - Seam ausente/malformado/chave faltando → `ThresholdSeamError` nomeando o caminho, propagado por `receipt_violations` (sem fallback), subclasses `ValueError` (handler existente do CLI do gate: exit 1)
Proof: `python3 -m pytest learner/gate/tests/test_standards.py::test_missing_seam_raises_naming_path learner/gate/tests/test_standards.py::test_malformed_seam_raises learner/gate/tests/test_standards.py::test_receipt_violations_propagates_seam_error`

**C4** - Nenhum literal de threshold em código de produção: `grep -rnE "(MUTATION_MIN|COVERAGE_MIN)[[:space:]]*=[[:space:]]*0\." --include="*.py" --exclude-dir=tests --exclude-dir=__pycache__ learner/ curriculum/ engines/` vazio (fixtures de teste excluídas; a cerca semântica é o drift test)
Proof: `python3 -m pytest "engines/minimaxDojo/tests/test_threshold_drift.py::TestThresholdLiterals::test_no_hardcoded_threshold_literals"` + o grep acima (exit 0, zero linhas)

### S2 - Juízo mora com quem avalia · curriculum/_shared/evidence.py + 9 import sites + testes movidos · ~55 KB · ~14k

**C5** - `grep -rn "verified_pass\|game_metric_violations\|independently_verified_pass" curriculum/_shared/` retorna vazio (clean cutover, sem re-export); juízo (`VerifierVerdict`, rubricas, `check_evidence`, `passes_gate`) mora em `learner/gate/standards.py`; `evidence_rubrics.yaml` movido junto
**C6** - As suítes afetadas verdes com os 9 sites atualizados (`learner/gate/{verifier_receipt,security,canonical_gate}.py`, `learner/gate/tests/test_gate.py`, `learner/substrate/{__init__,dashboard_snapshot}.py`, `engines/openclaw/runner/scheduler.py`, `engines/openclaw/tests/test_scheduler.py`, `curriculum/_shared/tests/test_evidence.py`); testes de `check_evidence`/`passes_gate` movidos para `learner/gate/tests/test_standards.py`; testes de `gate_ready`/`blockers` permanecem em curriculum testando a delegação
Proof: `python3 -m pytest` (testpaths completos do pyproject — inclui engines/openclaw, curriculum/_shared, learner/*)

### S3 - Ciclo de import quebrado · shared/ novo + 12 arquivos de cutover · ~28 KB · ~7k

**C7** - `grep -rnE "from engines\.|import engines\." curriculum/` retorna vazio; primitivas em `shared/` (`StateCorruptionError`, `utc_now_iso`, `atomic_write_text`, `resolve_contained`)
Proof: grep acima (exit 0, zero linhas) + `python3 -m pytest engines/openclaw/tests engines/miniMaxEvolutionEngine/tests engines/minimaxDojo/tests`

**C8** - Ambos os lados do antigo ciclo importam sem erro em processo novo
Proof: `python3 -c "import curriculum._shared.evidence, engines.openclaw.runner.scheduler, learner.gate.standards, shared.errors, shared.time, shared.fsio; print('ok')"`

### S4 - Cerca estendida · engines/minimaxDojo/tests/test_threshold_drift.py · ~7 KB · ~2k

**C9** - A cerca discrimina: dado um `.py` de produção com `(mutation|mutation_score|mutation_min)[^\n]{0,40}(=|:|<|>)\s*0\.6[0-9]`, o drift test falha nomeando o arquivo; árvore limpa hoje passa
Proof: `python3 -m pytest "engines/minimaxDojo/tests/test_threshold_drift.py::TestThresholdLiterals::test_fence_discriminates" "engines/minimaxDojo/tests/test_threshold_drift.py::TestThresholdLiterals::test_no_hardcoded_threshold_literals"`

## Swept

- validation: C3 (seam inválido → erro nomeando caminho, sem fallback)
- failure modes: C3 + C9 (reintrodução falha na cerca)
- idempotency and retry: existing - anti-replay em `learner/gate/canonical_gate.py` (replay_violations)
- authorization: existing - receipt + isolamento de contexto (verifier_receipt / security)
- concurrency and ordering: existing - `atomic_write_text` (agora `shared/fsio.py`) no caminho canônico
- data lifecycle: n/a - nada migrado; valores idênticos já no seam e no `active_unit.empirical_gate`
- external-dependency failure: n/a - filesystem apenas
- state transitions: n/a - máquina de learning state inalterada
- observability: C9 (drift test como sensor permanente no CI)

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| consumidores da barra (5) | `VerifierVerdict.verified_pass` C1 · `receipt_violations` C1+C3 · `challenge_gate_blockers` (delegação, testes em curriculum) C5 · `verdict_passed` (statuses) C5 · `canonical_gate._check_evidence_semantics` (unit-overlay wiring) C2 + `test_gate_receipt_path_uses_unit_overlay_end_to_end` | - |
| import sites do cutover (9) | todos cobertos por C6 (suítes verdes; nenhum site restante — grep C5/C7) | - |
| modos de falha do seam (3) | arquivo ausente C3 · YAML malformado C3 · chave faltando C3 | - |
| primitivas movidas (4) | `StateCorruptionError` C7+C8 · `utc_now_iso` C8 (+ teste movido em shared/tests) · `atomic_write_text` C7+C8 · `resolve_contained` (root-escape, teste movido em test_standards) C5 | - |
| direções do antigo ciclo (2) | curriculum→engines ausente C7 · engines→curriculum→learner importável C8 | - |

- Claims naming a command exit/grep: C4, C5, C7, C8 - each proven by the command itself
- No other check claims more than the single case its proof exercises

## Handoff

Um batch único: S1–S4 somam ~32k de leitura estimada (wc/4 sobre os arquivos tocados), bem abaixo de 150k. Um agente constrói; o Verifier roda sobre `<base>..HEAD` com os 9 checks.
