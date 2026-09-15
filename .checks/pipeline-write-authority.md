# Pipeline write authority — provenance carimbada, uma serialização

Sources:

- `.tasks/pipeline-write-authority.md` - **binding**: os 7 critérios, Decided rows (modelo de verdade dupla com `grade`+`advanced_by`; enum fechado) e Unresolved 1 (default: provenance)
- `engines/openclaw/runner/pipeline_status.py` - `PipelineStatus` (6 campos), `save_status`, `_from_mapping`
- `engines/miniMaxEvolutionEngine/supervisor/autonomous.py:195-240` - `_status_bytes` duplica a serialização do `save_status` (contrato de digest), `_compare_and_advance` grava via `save_status` só após verifier PASS (:325)
- `engines/miniMaxEvolutionEngine/.claude/commands/devschool/phaserunner.md:36-38` - regra 3 (PASS-only) e mandato do helper único
- ADR-0002 - openclaw simulate-grade por design

## Out of scope

- Lock entre writers - detecção via provenance (criterio 6 da task); prevenção é mecanismo novo
- Fusão dos enums Phase coarse/fino (M8) - só o pino do `_PHASE_MAP`
- openclaw preview-only - alternativa rejeitada no Decided (Unresolved 1)

## Landing

`PipelineStatus` ganha `grade` + `advanced_by` com defaults compatíveis; nova `dump_status(status) -> str` em `pipeline_status.py` torna-se a ÚNICA serialização (save_status escreve; o supervisor do MME digere o planejado com ela — mata a duplicação de campo em `autonomous.py:_status_bytes`, que hoje drifteria em silêncio e quebraria todo avanço autônomo se `save_status` mudasse). Stamping nos três writers: scheduler (`simulate`/`openclaw-checklist`), CLI override (`simulate`/`openclaw-cli-override`), supervisor MME (`verified`/`mme-supervisor`, só pós-verifier-PASS). `_PHASE_MAP` sobe de local para módulo em `scheduler.py` para ser pinável.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Enum fechado `grade` | `class Grade(StrEnum): SIMULATE="simulate"; VERIFIED="verified"; UNSPECIFIED="unspecified"`; `_from_mapping` rejeita valor fora do conjunto com `StateCorruptionError` | string livre - consumidores não conseguem rejeitar exaustivamente (Decided da task) |
| Serialização única | `dump_status(status) -> str` exportada de `pipeline_status.py`; `save_status` = `atomic_write_text(yaml_path, dump_status(status))`; `autonomous._status_bytes` = `dump_status(planned).encode("utf-8")` | manter `_status_bytes` com lista própria de campos - o digest previsto e o arquivo gravado divergem em silêncio na próxima mudança de schema |
| Quebra de digests in-flight | requests autônomos com `advancement_authorized` gravado ANTES desta mudança carregam `resulting_pipeline_digest` da serialização de 6 campos e falhariam em `_compare_and_advance` ("did not persist as intended") — falha loud e fail-closed, não silenciosa; sem request pendente hoje (ledger inspecionado), aceite | migração de digests antigos - não há in-flight para migrar |

- Nothing else in this change is hard to reverse

## Checks

### S1 - Provenance no estado · pipeline_status.py + autonomous.py + testes · ~70 KB · ~18k

**C1** - Arquivo legado sem os campos carrega com defaults: `grade == "unspecified"`, `advanced_by == ""`; valor de `grade` fora do conjunto fecha com `StateCorruptionError` nomeando os válidos
Proof: `engines/openclaw/tests/test_pipeline_status.py::test_load_legacy_file_defaults_grade` + `::test_load_rejects_unknown_grade`

**C2** - `Scheduler.step` avançando via checklist grava `grade: "simulate"`, `advanced_by: "openclaw-checklist"` no YAML
Proof: `engines/openclaw/tests/test_scheduler.py::test_step_stamps_simulate_provenance`

**C3** - O avanço do supervisor MME (pós-verifier-PASS) grava `grade: "verified"`, `advanced_by: "mme-supervisor"`; e o digest previsto (`_planned_pipeline_digest`) continua igual ao sha256 do arquivo gravado — mesma serialização por construção
Proof: `engines/miniMaxEvolutionEngine/tests/test_autonomous_provenance.py::test_compare_and_advance_stamps_verified` + `::test_planned_digest_matches_saved_bytes`

### S2 - Escrita única carimbada · __main__.py + scheduler.py + testes · ~30 KB · ~8k

**C4** - `python3 -m engines.openclaw --phase spec-done` (override CLI) grava `grade: "simulate"` via helper carimbado
Proof: `engines/openclaw/tests/test_cli_override.py::test_phase_override_stamps_simulate`

**C5** - `grep -rnE "yaml\.safe_dump|atomic_write_text" engines/openclaw/__main__.py engines/miniMaxEvolutionEngine/supervisor/` retorna vazio para pipeline (nenhuma gravação/serialização fora de `save_status`/`dump_status`)
Proof: grep acima (zero linhas) + `python3 -m pytest engines/openclaw/tests engines/miniMaxEvolutionEngine/tests`

**C6** - Duas gravações em sequência (openclaw depois MME): o arquivo identifica o último writer (`grade`/`advanced_by` do MME); last-writer-wins documentado, não invisível
Proof: `engines/openclaw/tests/test_pipeline_status.py::test_last_writer_identifiable`

### S3 - Verdade documentada + pino do mapa · phaserunner.md + os_adapter + briefing + teste · ~18 KB · ~5k

**C7** - `phaserunner.md` regra 3 nomeia `grade` (PASS → `verified` + `advanced_by: /devschool-<command>`; consumo: transições `simulate` não autorizam trabalho que exige `verified`); `os_adapter` imprime `grade` junto do phase; `_PHASE_MAP` de `scheduler.py` pinado por teste (SPEC_DONE→IMPL, IMPL_DONE→REVIEW, REVIEW_DONE→BENCHMARK, BENCHMARK_DONE→OPTIMIZE, CYCLE_COMPLETE→CYCLE_COMPLETE)
Proof: `engines/openclaw/tests/test_phase_map_pinned.py::test_phase_map_pinned` + `engines/miniMaxEvolutionEngine/tests/test_os_adapter.py::test_workflow_output_includes_grade` + leitura dos dois documentos (grep `grade` em `phaserunner.md` > 0)

## Swept

- validation: C1 (default explícito; enum fechado rejeita desconhecido)
- failure modes: existing - rollback transacional de dois arquivos em `scheduler.step` (mantido); novo: digest in-flight antigo falha loud em `_compare_and_advance` (Landing)
- idempotency and retry: existing - uma transição por step; `save_status` idempotente por rewrite atômico
- authorization: existing - learning gate continua guardando o scheduler; supervisor exige `advancement_authorized` no ledger + verifier PASS (:325)
- concurrency and ordering: C6 (last-writer visível; sem lock — escolha documentada na task)
- data lifecycle: C1 (campo aditivo; arquivos antigos carregam)
- external-dependency failure: n/a - filesystem apenas
- state transitions: máquina de fases inalterada; arestas agora carregam provenance (C2, C3, C4)
- observability: C2, C3, C7 (`grade` é o sensor; briefing/os_adapter o expõem)

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| writers do pipeline (3) | scheduler C2 · CLI override C4 · supervisor MME C3 | - |
| valores de grade (3) | `simulate` C2+C4 · `verified` C3 · `unspecified` (default legado) C1 | - |
| consumers do campo grade (2) | os_adapter/briefing C7 · phaserunner.md (prose contract) C7 | - |
| arestas do `_PHASE_MAP` (6) | todas na tabela do teste pinado C7 | - |
| serializações do status (2→1) | `save_status` usa `dump_status` C3 · `_status_bytes` usa `dump_status` C3 | - |

- Claims naming a command/grep/exit: C4, C5, C7 - each proven by the command itself
- No other check claims more than the single case its proof exercises

## Handoff

Um batch: S1–S3 ≈ 31k de leitura estimada, um agente. Verifier sobre `d723f7b..HEAD` com os 7 checks. Nota de ambiente: montagem lenta — greps via `git grep`, testes direcionados com `-p no:cacheprovider`, venv `.venv-linux`.
