# Evidence: bootstrap help corrigido

Data 2026-10-04, Codex Cloud /workspace/aidevschool, HEAD
b9f77774643b94bfd9fafbd756a1b17482c33e45. Autorização específica registrada em
intent.md e proposta aceita; revisão independente pertence a review.md.
Único runtime alterado: engines/aiDevschoolMvp/aidevschool/install.py.

## Implementação e contrato

_parse_args contém o parser único com definições originais; bootstrap __main__
parseia uma vez antes do import _install_validation. Help e erros de argumento
encerram por argparse nativo. _run_from_args contém o corpo pós-parse original;
main(argv=None) preserva a API e delega. Sem mudança de bytecode flags, dependências,
proteções, validação, instalação, scheduler ou testes.

Confronto AST executado em /tmp/aidevschool-install-help/checks.py:
todos os 11 helpers anteriores fora main iguais; assinatura e retorno main
iguais; quatro statements definindo parser iguais; corpo pós-parse igual,
incluindo resolve fora do try, catches e chamadas. ast-proof.json contém provas
e SHA da versão executada. Os preflights protect-paths/protect-tests com caminho
real install.py retornaram 0, logs *.preflight.json; apply_patch ordinário,
sem negativa/override. Não se alterou docstring histórico fora do escopo.

## Execuções reais

Harness/logs em /tmp/aidevschool-install-help. Duas cópias independentes frias:
targeted e final. Cada uma recebeu engine inteiro, pyproject, learner/init e
cinco módulos gate determinísticos, além da spec referenciada ANTES dos testes.
Manifestos *-input-hashes.json confirmam igualdade com a origem. Sem dados reais
learner state/evidence ou currículo compartilhado; currículo/instrumentos MVP
são fixtures do bundle. Nenhuma dependência instalada/credencial criada.

| Prova | Resultado real | Artefato |
| --- | --- | --- |
| AST dos contratos | PASS, helpers/parser/corpo/main preservados | ast-proof.json |
| Rede pai/filho, targeted e final | exit0; ambos socket EPERM | *-network-probe.log |
| Cold CLI --help, -h e abreviação --he | exit0; help presente; trace -v sem import local; source/digest/home inalterados, sem pyc | api-contracts.log |
| Argumento inválido CLI | exit2 nativo, source/home inalterados | api-contracts.log |
| CLI normal --check | exit0; validação curriculum/manifest, no changes sob allowlist declarada | api-contracts.log |
| Import API/main | exports são os mesmos objetos de _install_validation; main argv explícito/implícito e dispatch deliver sintético preservados | api-contracts.log |
| Testes existentes installer relevantes | exit0; **13 passed in 0.34s** | targeted-installer.log |
| ÚNICA suite MVP completa contra conjunto final | exit0; **67 passed in 3.23s** | mvp-final-full.log |
| Gate integral de complexidade afetado | exit0, stdout/stderr vazios, max8 e baseline integral/five roots | complexity.log |

Comandos efetivos pytest, cwd na respectiva cópia:

```text
/workspace/aidevschool/.venv/bin/python -m pytest -q -p no:cacheprovider --log-file <copy>/tmp/pytest.log engines/aiDevschoolMvp/tests/installer/test_install.py
/workspace/aidevschool/.venv/bin/python -m pytest -q -p no:cacheprovider --log-file <final-copy>/tmp/pytest.log engines/aiDevschoolMvp/tests
```

*-command.json registra comandos completos/cwd/env keys/exits. A suite final
foi executada uma vez somente. A cópia final foi rehashada/fria antes dessa
execução: não herdou caches, mutações ou state dos checks direcionados.
Os 13 casos direcionados são incluídos naturalmente nessa única execução final;
isso foi o fluxo expressamente pedido, não repetição de lanes sem motivo.

Env allowlist: PATH da venv/sistema, LC_ALL, PYTHONPATH guard/cópia,
PYTHONDONTWRITEBYTECODE, PYTEST_DISABLE_PLUGIN_AUTOLOAD, TMPDIR e R3B_GUARD_LOG.
Mesmo seccomp fail-closed anterior bloqueia rede/io_uring e é herdado pelos
filhos. Probes help frios usam HOME/PATH nativos (sem -B/flag/shim/cache semeado);
o filtro kernel permanece herdado embora PYTHONPATH/bytecode env sejam removidos.
Audit Python limita writes a /tmp e impede acesso a originais learner/curriculum;
não se promete sandbox kernel universal de filesystem. API dispatch usa callback
sintético apenas no harness ad hoc; não modifica runtime/testes persistentes.

## Fixture e contagens históricas

Spec docs/plans/ai_devschool_mvp_spec.agent.final.md copiada desde a preparação
para ambas as árvores, 171415 bytes, SHA-256
32c260d7db172405b7b4fcbbaa4d4e7aa2fda5c50f730edf7aee6d05e4dd0b1a.
Arquivo original e assertions dos testes não alterados. Este ensaio final de
67 passes é NOVO, após correção autorizada; não reclassifica o ensaio anterior
65 passes/2 falhas nem o recheck negativo que resultou 66 casos distintos/1
falha legada. Recibos anteriores permanecem íntegros/históricos.

## Preservação, revisão e limites

Snapshot before.json pré-fatia: 6400 arquivos. Rehash após checks: **6399 iguais**,
única diferença preexistente install.py, conforme preservation.json. R5/R7/R9,
R3B runtime/baseline, testes existentes e novo teste congelado, hooks/pins/estado
e pacotes anteriores preservados. Novos arquivos são só os cinco recibos SDLC
desta pasta. Teste congelado mantém
0b8366d4d39c647ad559864261f30aad31ef5c0c1df58e0be77b66eb5d856d61.
Test_install mantém 2b3b04cc7cb21b4ad9e221c403b6000ac6fd1bf4be8f422fc30a846af3eba418.
git diff --check exit0.

Revisor separado confrontará diff/AST/hashes/outputs sem repetir a suite final.
Não afirmar CI GitHub integral, import API zero IO, instalação real em plataforma
remota ou equivalência de todos os ambientes. Help nativo CLI preserva bundle/home;
argumentos válidos mantém fluxo original. Gate complexidade rodou uma vez porque
install.py está incluído nele; checker/max/baseline intactos, sem novo waiver.

Self-test HTTP/precheck EPERM e contexto real SDLC PR continuam pendentes;
nenhum foi reexecutado ou contornado. Não houve Library call/upload novo.
Erro anterior preservado: library upload failed: hosted apps tools/list request
failed: network. Pacotes anteriores e relatório de proposta permanecem intactos;
pacote final atualizado ficará em diretório separado 2026-10-04-install-help.
Sem commit/push/PR/merge/deploy/publicação.
