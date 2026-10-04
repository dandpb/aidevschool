# Evidence: R3B local, sem publicação

Base HEAD: b9f77774643b94bfd9fafbd756a1b17482c33e45. Autorização do responsável:
R3B somente, após [revisão pré-código](review-r3b-plan.md). R3A estratégia aditiva
posterior; nenhum runtime dela criado/modificado. Teste novo criado uma vez,
antes do runtime, após protect-tests e protect-paths retornarem 0; não override.

## Execução real

| Prova | Resultado | Saída local |
| --- | --- | --- |
| Guard pai/filho antes de cada suite | socket negado por EPERM nos dois processos | /tmp/aidevschool-r3b/green-probe.log e parity-probe.log |
| Primeiro red | exit 3, erro de logging fora de tmp; infraestrutura, não red da API | /tmp/aidevschool-r3b/red.log |
| Red2, teste congelado contra baseline sem core | exit 1, 19 errors: ModuleNotFoundError replay_fold | /tmp/aidevschool-r3b/red2.log |
| Green: 19 novos + 7 acceptance existentes | exit 0, 26 passed in 1.43s | /tmp/aidevschool-r3b/green.log |
| Paridade dos quatro espelhos e contratos core | exit 0, 8 passed in 0.05s | /tmp/aidevschool-r3b/parity.log |
| Diferencial replay original vs novo | exit 0, 73 ledgers sintéticos, todos concepts/seis campos idênticos; inputs não mutados | /tmp/aidevschool-r3b/differential.log |
| Main CLI e loader | main byte-identical, _rubric_task AST igual, FIELDS igual | mesma prova diferencial |
| Preservação | baseline R3B 6391 arquivos: somente 3 docs autorizados e replay.py mudaram; 6387 bytes inalterados | /tmp/aidevschool-r3b/before.json |
| Whitespace/escopo | git diff --check exit 0; módulos/teste novos sem trailing whitespace | sessão produtora |
| Gate CI de complexidade, recorte engine com baseline correspondente | exit 1: fold_ledger CC26 sem entrada, replay.py:replay obsoleta | /tmp/aidevschool-r3b/complexity.log |

Comandos efetivos, cwd e nomes (não valores) das variáveis da allowlist:
/tmp/aidevschool-r3b/{red2,green,parity}-command.json. Runner invocado:

```bash
python3 /tmp/aidevschool-r3b/run_checks.py red2
python3 /tmp/aidevschool-r3b/run_checks.py green
python3 /tmp/aidevschool-r3b/run_checks.py parity
```

Differential foi executado por /workspace/aidevschool/.venv/bin/python
/tmp/aidevschool-r3b/differential.py, cwd green e mesma allowlist/guard, saída
capturada pelo harness da sessão. Casos: journey, seis cenários de roles,
duas rubricas, 64 ledgers com seed 3104/24 eventos cada. Não é nota de qualidade.

## Isolamento e observáveis

Cópias em /tmp/aidevschool-r3b/{red2,green,parity}/engines/aiDevschoolMvp;
fixtures canônicas limitadas a learner package/gate módulos determinísticos e
pyproject, conferidas por hashes. Sem learner state/evidence/substrate/analytics
nessas cópias. PYTHONPATH usa guard/cópia e PATH usa venv para filhos python3.
Env contém apenas PATH, LC_ALL, PYTHONPATH, PYTHONDONTWRITEBYTECODE,
PYTEST_DISABLE_PLUGIN_AUTOLOAD, TMPDIR e R3B_GUARD_LOG. Não herda credenciais.

Unshare não disponível (uid_map read-only). Sitecustomize instala Linux x86_64
seccomp antes dos testes; nega socket/network syscalls e io_uring, herdado por
filhos. Falha aborta com os._exit(97). Log guard separado de stdout JSON.
Audit extra admite writes somente em tmp e bloqueia acesso à árvore canônica
original learner/curriculum. Logging pytest usa --log-file dentro tmp.
Guard logs: green 29 inicializações; números correspondem a processos, não
chamadas HTTP. Testes e differential importam somente runtimes copiados.

Teste de core carrega imports/fixtures antes da região instrumentada; nesta
região proíbe open/os IO/Path/env/socket/clock, com TYPESAFE_API_KEY sentinela
sintética instalada antes. required_rubric_ids e fold executam repetidamente,
retornos iguais, inputs iguais. Isso prova funções, não ausência de IO do import.

Teste CLI roda main real em cópia do bundle, cwd externo, com stdout JSON intacto.
Em sucesso e drift observa exatamente mkdir do state_dir, open scratch.json.tmp,
rename tmp→scratch; confirma tmp removido e curriculum/ledger/state bytes iguais.
Sem instalação host, comandos online ou writes de dados reais.

Negativos: ordem das roles, global attempt_id/reuso sem reset, conceito
 desconhecido, task faltante vs None, JSON necessário inválido e desnecessário
não lido, fail G3, revisão pass/fail/limite atual, curriculum vazio, evento
malformado sem reparo, exit 2 em divergência. Leitura de tarefa por ID uma vez.

## Identidade dos arquivos entregues

- `engines/aiDevschoolMvp/aidevschool/scripts/replay.py`: `94e384f815c736384dddae6e722f2d90d35fd5b7c38c3631cb60b7e1e8b390a1`
- `engines/aiDevschoolMvp/aidevschool/scripts/replay_fold.py`: `dada381a9607c47978e959c825068097018f254bb29de063bcce566c2f26c780`
- `engines/aiDevschoolMvp/tests/test_replay_fold.py`: `0b8366d4d39c647ad559864261f30aad31ef5c0c1df58e0be77b66eb5d856d61`

O hash do teste coincide antes/depois de todos os checks. Testes existentes,
R5/R7/R9, histórico review.md, dados, hooks e pins permanecem inalterados.
A revisão independente do diff/provas será registrada em review-r3b-diff.md.

Bloqueio CI descoberto ao conferir .github/workflows/ci.yml:342 e :816:
CI MVP inclui o teste novo pelo diretório tests; make test genérico não inclui
esse arquivo pelo testpaths atual. O gate Python usa baseline por path:function.
Rodamos check_python_complexity.py max8 no engine isolado, com cópia filtrada
das entradas desse engine (não alteração da baseline original). Resultado real
exit1: fold_ledger CC26 nova e antiga replay.py:replay stale. Classificador CC8
e required_rubric_ids CC5 não violam limite. Para preservar a dívida existente
na localização nova, seria necessária atualização mecânica de uma entrada em
scripts/python_complexity_baseline.txt, fora do escopo autorizado. Não foi feita;
não aumentar complexidade artificialmente no wrapper nem enfraquecer gate.
Não afirmar CI aprovada ou pronto para publicação enquanto esse gate falhar.
Original replay medido com mesmo radon: CC30; o novo fold CC26. A ação proposta
é uma única troca de path:function na baseline, sem elevar limite nem adicionar
waiver para helper. Ainda não autorizada/aplicada.

Limite: R3B conclui fold/rubricas/CLI MVP; não garante snapshot transacional de
rubricas mutáveis durante leitura nem modifica check legado do substrate.
Transporte R2a segue bloqueado; sem commit/push/PR/merge/deploy.
