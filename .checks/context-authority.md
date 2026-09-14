# Context authority

Sources: `.tasks/context-authority.md` (binding); aceite do usuário em
2026-09-14: “do the recomendations actoin and than tlc-implement”.
Profile: light (default); handoff: on. Feature base: d723f7bb53d00401d3c9d6bf3be13d9fc670e971.

## Out of scope

Convergência/migração MVP, novos critérios de mastery, split de pacotes, lock
global, mudanças de fase, autonomia além de spec, push/deploy/dados reais.

## Landing

Reutilizar PipelineStatus/save_status, Scheduler e autorização durável do
supervisor. Mesma serialização para o digest previsto e a escrita. Documentar
as autoridades em mapas/glossários existentes, sem alterar o runtime MVP.

| One-way door | Literal shape | Alternative rejected |
| --- | --- | --- |
| Procedência persistida | grade: simulate/verified/unspecified; advanced_by string; legado unspecified/empty; nomes openclaw-checklist, openclaw-cli, devschool-spec | Proibir simulate: contrário à decisão aceita |

## Checks

### S1 — Avanços identificáveis · 6 arquivos-base · 72.164 bytes · ~18.041 tokens

Todos os comandos abaixo usam `python -m pytest`; o executável disponível será
registrado no recibo. Arquivo O = engines/openclaw/tests/test_provenance.py;
arquivo M = engines/miniMaxEvolutionEngine/tests/test_context_authority.py.

**C1** — Legado carrega unspecified/empty sem escrita (critério 1).
Proof: O::test_legacy_provenance_is_read_only

**C2** — Os cinco avanços checklist carimbam simulate/openclaw-checklist e
preservam os espelhos impl/review/benchmark/optimize/cycle-complete (critério 2).
Proof: O::test_checklist_advances_with_provenance

**C3** — Override CLI sem steps grava simulate/openclaw-cli (critério 3).
Proof: O::test_cli_override_reports_simulated_provenance

**C4** — PASS autônomo grava verified/devschool-spec e o digest autorizado é
o dos bytes gravados (critério 4).
Proof: M::test_supervisor_pass_stamps_authorized_bytes

**C5** — Última gravação vence, com grade/writer preservados (critério 5).
Proof: O::test_sequential_writers_preserve_latest_provenance

**C6** — Grade inválido e writer vazio para grade declarado são rejeitados
em leitura/escrita; falha de escrita não substitui o arquivo (critério 5).
Proof: O::test_invalid_provenance_is_rejected

**C7** — FAIL independente deixa fase/procedência intactas (critério 8).
Proof: M::test_supervisor_fail_keeps_provenance

### S2 — Operador informado · 3 arquivos-base · 8.445 bytes · ~2.112 tokens

**C8** — CLI normal apresenta grade e advanced_by (critério 6).
Proof: O::test_cli_override_reports_simulated_provenance

**C9** — Hook real SessionStart mostra procedência e regra de consumo sem
escrever estado, para simulate/verified/unspecified (critério 6).
Proof: M::test_briefing_exposes_provenance_read_only

**C10** — PhaseRunner e instruções de escrita condicionam verified ao PASS
independente; producers não avançam sozinhos (critério 7).
Proof: M::test_phase_runner_provenance_contract

**C11** — Preview real permanece somente leitura (Observable/existing).
Proof: O::test_cli_preview_preserves_provenance

### S3 — Fronteira MVP · 3 arquivos-base · 14.481 bytes · ~3.621 tokens

**C12** — Mapa possui colisões explícitas MASTERED, G1–G4 e gap-ladder/FSRS/
revisão local, com README e glossários ligados ao MANIFEST (critérios 9, 10).
Proof: M::test_mvp_authority_documented

## Swept

- validation: C1, C6.
- failure modes: C7; existing Scheduler.step restaura pipeline/espelho se escrita falha.
- idempotency and retry: existing ledger/outbox e escrita atômica; C4 cobre digest.
- authorization: C4, C7, C10; existing check_gate e políticas autônomas.
- concurrency and ordering: C5 sequência; lock global fora de escopo;
  existing compare-and-advance e lease preservados.
- data lifecycle: C1; runtime/ledger MVP não alterados.
- external-dependency failure: existing executor, timeout e budget; sem serviço novo.
- state transitions: C2, C3, C4, C7.
- observability: C8, C9, C12.

## Coverage

| Set | Member -> proof | Unproven |
| --- | --- | --- |
| Grades (3) | unspecified C1/C9; simulate C2/C3/C9; verified C4/C9 | - |
| Writers (3) | checklist C2; CLI C3; supervisor C4 | Instruções humanas provadas como contrato C10, não execução de agentes reais |
| Avanços checklist (5) | spec-done, impl-done, review-done, benchmark-done, cycle-complete: C2 parametrizado | - |
| Fronteiras MVP (3) | mastery, gate, review: C12 | Sem migração solicitada |

Claims de saída CLI/hook: C3, C8, C9, C11 atravessam main/hook. Perfil light:
sem fault injection; testes parametrizados e suíte existente são a prova disponível.

## Handoff

S1–S3: 95.090 bytes/4 ≈23.773 tokens de leitura-base; com testes/docs adicionais
estimados, abaixo de 50k, cabem em um batch sob 150k. Sem handoff de build;
verificador independente obrigatório após o último commit da feature.
