# Plan: executar somente R3B

Autorização: decisão do responsável no intent. O escopo runtime é fechado:

| Arquivo | Mudança |
| --- | --- |
| engines/aiDevschoolMvp/aidevschool/scripts/replay_fold.py (novo) | Iterador/classificador puro, required_rubric_ids, fold_ledger e erro missing task. |
| engines/aiDevschoolMvp/aidevschool/scripts/replay.py | Wrapper carrega tarefas uma vez e delega; manter main, FIELDS e _rubric_task. |
| engines/aiDevschoolMvp/tests/test_replay_fold.py (novo) | API, pureza, ordem/roles, negativos, wrapper e CLI instalada/scratch. |

Somente documentos deste intent além desses três arquivos. Não editar testes
existentes, instalador, skills, pins, rubricas, curriculum, learner, shared gate,
outputs gerados nem R3A0/A. Review anterior permanece histórico imutável.

## Ordem e gates

1. Baseline SHA-256 em /tmp/aidevschool-r3b/before.json: 6391 arquivos;
   replay original em /tmp/aidevschool-r3b/replay-before.py. HEAD b9f7777.
   Revisor independente avalia novo intent/spec/plan antes de runtime/testes.
2. Preparar harness temporário com allowlist de ambiente, PYTHONDONTWRITEBYTECODE,
   pytest sem plugins externos e PATH da venv original para python3 dos filhos.
   Guard de rede Linux seccomp nega syscalls socket/connect/bind/listen/send/recv,
   e io_uring_setup/enter/register (vias alternativas de rede), herdado por
   filhos e netos; confirmar pai/filho bloqueados antes da suite.
   Namespace de rede unshare indisponível (uid_map read-only); se seccomp falhar,
   não executar suites sem bloqueio: reportar limitação e parar essa prova.
3. Criar teste novo uma vez, após guard checks de protect-tests/protect-paths;
   congelar SHA. Se criação/edição negada, parar sem override/substituto.
   Rodar red focado em cópia baseline sem replay_fold: erro API ausente esperado.
4. Extrair fold; iterador compartilhado preserva roles/curto-circuito. Wrapper
   mantém CLI intacta e lê cada tarefa necessária uma vez. Não mudar thresholds.
5. Copiar engine MVP completo para /tmp/aidevschool-r3b/green/engines/aiDevschoolMvp
   (sem .env, caches/dependências). Preservar layout root e copiar pyproject.toml,
   learner/__init__.py e learner/gate/{__init__,core,engine,state,state_transitions}.py
   como fixtures imutáveis para imports/parity/reschedule existentes; conferir
   seus hashes. Não copiar learner state/evidence nem usar original como fallback
   de PYTHONPATH. Runner aponta cwd/PYTHONPATH para cópia. Nunca instalar
   no host. Executar teste novo e acceptance focada, depois paridade espelhos.
6. Comparar wrapper baseline em sandbox com novo usando fixtures sintéticas
   para todos os seis campos; igualdade AST/main e dados antes/depois.
   Baseline replay pode rodar apenas no sandbox com guard; não há HTTP nesse script.
7. Revisão independente do diff/evidence; corrigir runtime se necessário sem
   editar teste congelado, repetir apenas provas afetadas. Simplificação revisada.
8. Conferir todos hashes preexistentes: só docs intent/spec/plan e replay.py
   podem mudar; novos arquivos são os dois autorizados + evidências/revisões.
   Sem commit/push/PR/merge/deploy.

## Comandos de prova

Harness externo (não produto): /tmp/aidevschool-r3b/run_checks.py, guard em
/tmp/aidevschool-r3b/guard/sitecustomize.py. Cada Python inicia seccomp ou aborta,
via os._exit(97) em falha (exception comum de sitecustomize pode ser ignorada
pelo startup). Registrar pid/ppid em arquivo separado, nunca stdout JSON da CLI,
sem valores de ambiente. Runner inicia processo
com env allowlist, caminhos absolutos e saída em red.log/green.log/parity.log.
Comandos efetivos dentro da cópia são:

```bash
/workspace/aidevschool/.venv/bin/python -m pytest -q -p no:cacheprovider engines/aiDevschoolMvp/tests/test_replay_fold.py
/workspace/aidevschool/.venv/bin/python -m pytest -q -p no:cacheprovider engines/aiDevschoolMvp/tests/test_replay_fold.py engines/aiDevschoolMvp/tests/acceptance/test_full_ledger_replay.py engines/aiDevschoolMvp/tests/acceptance/test_g4.py engines/aiDevschoolMvp/tests/acceptance/test_review_ladder.py engines/aiDevschoolMvp/tests/acceptance/test_review_reschedule_aid2687.py
/workspace/aidevschool/.venv/bin/python -m pytest -q -p no:cacheprovider engines/aiDevschoolMvp/tests/installer/test_runtime_parity.py
```

Runner inclui --log-file apontando para tmp/pytest.log da cópia. Primeiro ensaio
red abortou na infraestrutura (logging tentou write fora de tmp); não conta
como red da API. Após corrigir apenas o harness, red2 registra ModuleNotFoundError.
O teste permaneceu congelado. Comandos/cwd/env keys reais ficam nos JSON de prova.

Esperado: red não-zero por ausência da API; green/parity zero. Os comandos
rodam somente através do runner sanitizado/guardado, nunca direto no checkout.
Novos testes de CLI geram synthetic state/ledger em tmp, observam writes via
instrumentação e verificam bytes inalterados. Import de core ocorre antes da
região zeroIO; a própria região bloqueia open/os IO/Path/env/socket/clock.
Não afirmar zeroIO da CLI, que lê fontes; nenhum julgamento live autorizado.

## Risco e rollback

Risco principal: ordem/roles, rubrica desnecessária carregada ou alteração dos
seis campos. Mitigar com classificador único, fixtures adversas, paridade com
baseline e acceptance existente. Coleta e fold percorrem ledger duas vezes;
inputs devem ser listas estáveis. Não oferecer transação sobre rubricas.

Rollback runtime: restaurar apenas replay.py da snapshot pré-fatia. Novo módulo
não usado e testes congelados podem permanecer; remover testes somente quando
proteções/autorização permitirem. Não reset/clean em R5/R7/R9 ou dados.
R3B conclui somente fold/rubricas/CLI MVP; check substrate legado continua com
efeitos atuais. Transporte R2a permanece bloqueado.

## Bloqueio descoberto nas verificações de CI

.github/workflows/ci.yml executa o gate ratchet de complexidade e inclui MVP/tests
inteiro. A baseline referencia replay.py:replay; o wrapper simplificado deixa
essa entrada stale e fold_ledger CC26 entra sem waiver (original replay CC30).
Gate recortado para engine foi executado no sandbox e falhou com esses dois
diagnósticos. Helpers novos CC8/CC5 estão dentro do limite, sem nova dívida.

Correção mecânica necessária é substituir somente
engines/aiDevschoolMvp/aidevschool/scripts/replay.py:replay por
engines/aiDevschoolMvp/aidevschool/scripts/replay_fold.py:fold_ledger em
scripts/python_complexity_baseline.txt, preservando max8 e demais entradas.
Esse quarto arquivo não foi autorizado; não editar nesta fatia nem contornar
o gate. Provas funcionais podem concluir, mas CI/publicação continuam bloqueadas
até decisão do responsável sobre essa atualização. Ver evidence-r3b.md.

## Recuperação delimitada da CI do PR rascunho #667

Registro posterior à publicação autorizada pelo Dani. Head inicial:
42345a823acaf1c5734d33a0a55b41a4d5200014; run CI 37240094147,
job MVP 111546919070: 65 passed, 2 failed. Os dois casos congelados de CLI
falharam somente na lista de writes: imports locais criam pyc em bundle frio.
As provas locais anteriores usavam PYTHONDONTWRITEBYTECODE; seus resultados
permanecem históricos e não demonstram execução nativa sem essa variável.

Autorização aplicada: corrigir falhas recuperáveis de CI dentro dos mesmos
41 arquivos, sem modificar testes, gates, workflows ou fabricar proveniência.
O contrato scratch-only já está na spec; preservar main byte-identical.

Plano: em replay.py, somente no entrypoint CLI (__name__ == "__main__"),
salvar a política de bytecode do intérprete, impedir cache durante os imports
locais e restaurar a política em finally, inclusive em erro de importação.
Importação como biblioteca conserva a política recebida; não usar flag global
permanente, variável de ambiente, -B, shim ou cache semeado. Não alterar fold,
runtime compartilhado, limiares, testes congelados ou os demais espelhos.

Prova: cópias frias hash-conferidas, rede bloqueada pelo mesmo seccomp, sem
PYTHONDONTWRITEBYTECODE. Casos CLI congelados passam; suite MVP completa passa
uma vez após a correção. Conferir main byte-identical, restauração de política,
testes e demais arquivos preservados; revisão independente antes de novo
commit/push. Anexar evidência e revisão aos registros existentes, preservando
seu conteúdo anterior. Guard do range commitado continua obrigatório.

O countersign-gate do head inicial falhou por produtor sem trailer canônico
genuíno; esse bloqueio é separado e não será corrigido com identificadores
inventados nem mudança de gate.
