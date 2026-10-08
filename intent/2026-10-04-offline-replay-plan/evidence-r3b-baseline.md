# Evidence: manutenção factual da baseline R3B

Autorização específica do responsável em 2026-10-04: realocar somente a entrada
obsoleta, sem elevar tolerâncias/desativar gate/editar outras entradas. Baseline
não armazena valor numérico: formato path:function; CC26 fica neste registro.
Regra local/scripts/check_python_complexity.py: novos excessos falham e entradas
stale falham. Comentário frozen orienta follow-ups somente remover; a autorização
atual é específica para realocar a identidade da mesma função extraída.

## Correspondência e diff exato

```diff
-engines/aiDevschoolMvp/aidevschool/scripts/replay.py:replay
+engines/aiDevschoolMvp/aidevschool/scripts/replay_fold.py:fold_ledger
```

Original replay tinha a projeção de ledger, com leitura de rubrica no fold;
fold_ledger é essa projeção extraída, usando tarefas carregadas pelo wrapper.
Classificador/roles compartilhados preservam ordem; wrapper mantém a assinatura,
loader e main. A prova anterior comparou 73 ledgers sintéticos com resultados
iguais; runtime não mudou depois dela. Medidas radon anteriores, vinculadas aos
mesmos hashes: replay original CC30, fold_ledger CC26, classificador CC8 e coleta
CC5. Nenhum waiver novo para helpers ou tolerância numérica aumentada.

## Proteção e preservação

protect-paths.sh e protect-tests.sh, com tool_name Edit e caminho real da
baseline, ambos exit0. Aplicação ordinária do patch permitida; nenhum override.
Antes/after bytes: after == before.replace(old_identity,new_identity), ocorrência
única. Todas as demais linhas/comentários inalterados; 106 entradas
antes e depois. Checker, --max 8, hooks e workflow não alterados.

Inventário /tmp/aidevschool-r3b-baseline/before.json: 6396 arquivos. Recontagem:
6395 bytes inalterados; única alteração preexistente é baseline. SHA dos dois
runtimes e teste congelado coincide com a [evidência R3B](evidence-r3b.md).
R5/R7/R9, dados, testes anteriores e limites R2a preservados.

## Gate afetado, execução real

Cópia isolada de 116 arquivos .py não-testes nos cinco roots da CI, mais checker
e baseline integral, conferida por hashes; nenhuma importação/execução de
runtimes ou cópia de dados canônicos. Env allowlist, PYTHONDONTWRITEBYTECODE,
guard seccomp herdado por radon (rede/io_uring bloqueados, falha aborta processo).

```bash
/workspace/aidevschool/.venv/bin/python scripts/check_python_complexity.py --max 8 --baseline scripts/python_complexity_baseline.txt learner engines/minimaxDojo engines/openclaw engines/miniMaxEvolutionEngine engines/aiDevschoolMvp
```

cwd: /tmp/aidevschool-r3b-baseline/copy.
Resultado: **exit 0**, stdout/stderr vazios. Baseline completa, sem recorte.
Command/cwd/env keys/exit em /tmp/aidevschool-r3b-baseline/command.json;
output em gate.log e registros separados em guard.log.

Somente esse gate foi repetido. Nenhuma suite aprovada repetida, runtime/teste
alterado, dependência instalada ou execução online. git diff --check exit0.
O Important de complexidade no review-r3b-diff.md é registro histórico anterior;
sua resolução será revisada em review-r3b-baseline.md, sem reescrever o histórico.

Não afirmar execução de toda CI/GitHub: apenas o gate afetado passou localmente.
Sem commit/push/PR/merge/deploy/publicação. R3B conclui fronteira MVP; R3A aditiva
permanece futura e check legado do substrate não foi modificado.
