# Revisão independente: manutenção factual da baseline R3B

Data: 2026-10-04. Ambiente cloud, `/workspace/aidevschool`.
Revisor: `/root/review_replay_fold_diff`, separado do produtor.
Escopo desta revisão: somente a realocação explicitamente autorizada pelo
responsável de replay.py:replay para replay_fold.py:fold_ledger na baseline.

Resultado: **Important histórico de complexidade resolvido localmente**.
Nenhum novo finding substantivo identificado nesta manutenção. O gate
afetado completo passou em execução independente. Isto não representa
aprovação humana de publicação, execução integral da CI ou autorização de
commit, push, PR, merge, deploy ou Library.

## 1. Correspondência e contrato

Confrontei o diff com baseline-before.txt, checker, workflow CI, fontes R3B,
evidence-r3b-baseline.md e os relatórios radon anteriores. Verifiquei por bytes
que a versão atual é exatamente uma substituição da identidade antiga pela
nova, com ocorrência única:

```diff
-engines/aiDevschoolMvp/aidevschool/scripts/replay.py:replay
+engines/aiDevschoolMvp/aidevschool/scripts/replay_fold.py:fold_ledger
```

Baseline contém 106 entradas antes e depois; todos os demais bytes, inclusive
comentários, são iguais. O formato path:function não registra um número de
complexidade. Os relatórios anteriores registram replay original CC30 e fold
extraído CC26; _classified_events CC8 e required_rubric_ids CC5 não precisam
waivers. Os hashes runtime conservados vinculam essas medidas à mesma versão
revisada. A função extraída projeta os mesmos seis campos e sua equivalência
com baseline já foi examinada na revisão anterior.

O comentário frozen orienta follow-ups somente remover. A autorização atual
do responsável é específica para realocar a identidade da mesma lógica após
extração; prevalece neste caso e não autoriza novas exceções, alteração de
limite ou flexibilização geral dessa regra. O gate continua --max 8, com as
mesmas regras de rejeição de violação nova e entrada stale.

## 2. Prova independente do gate afetado

Conferi por hashes todos os arquivos da cópia de prova com as fontes atuais:
nenhuma diferença. Reexecutei somente o gate de complexidade com baseline
integral e os cinco roots do workflow, sem recorte de entradas:

```text
/workspace/aidevschool/.venv/bin/python scripts/check_python_complexity.py --max 8 --baseline scripts/python_complexity_baseline.txt learner engines/minimaxDojo engines/openclaw engines/miniMaxEvolutionEngine engines/aiDevschoolMvp
cwd: /tmp/aidevschool-r3b-baseline/copy
exit: 0; stdout: 0 bytes; stderr: 0 bytes
```

Evidências próprias em /tmp/aidevschool-r3b-baseline:
verify-command.json, verify-gate.log e verify-guard.log. O comando usa env
allowlist e PYTHONPATH do guard previamente revisado; guard.log independente
registra duas inicializações seccomp, checker e filho radon. A instalação é
fail-closed, bloqueia rede/io_uring e o audit restringe writes a /tmp. Nenhum
runtime foi importado pelo gate, que analisa fontes com radon. Nenhuma suite
de testes aprovada foi repetida nesta etapa.

## 3. Preservação e proteções

Recalculei os 6.396 hashes de before.json desta etapa: nenhuma ausência;
única alteração preexistente é scripts/python_complexity_baseline.txt.
Os outros 6.395 arquivos estão iguais, incluindo checker, workflow, hooks,
review histórico, testes anteriores, dados e R5/R7/R9. Os hashes dos dois
runtimes e teste congelado continuam exatamente os da revisão R3B:

- replay.py: `94e384f815c736384dddae6e722f2d90d35fd5b7c38c3631cb60b7e1e8b390a1`
- replay_fold.py: `dada381a9607c47978e959c825068097018f254bb29de063bcce566c2f26c780`
- test_replay_fold.py: `0b8366d4d39c647ad559864261f30aad31ef5c0c1df58e0be77b66eb5d856d61`

Baseline atual SHA-256:
`4b5ab03f19a4365dfcee3a8c745f54a98f8016b266f7f4808d4d9aa96d906b7e`.
O produtor forneceu a resposta real da ferramenta nesta etapa:
`protect-paths.sh exit 0`, `protect-tests.sh exit 0` e
`Stage baseline: 6396 files; guards allow ordinary edit, no override`.
O payload dos hooks foi tool_name Edit e caminho absoluto da baseline;
apply_patch posterior retornou `{}` sem rejeição. Esse preflight não tem
arquivo separado persistido: é evidência do produtor apoiada na resposta da
ferramenta, não execução independente minha. Não houve override ou negativa
de auto-review. Esta revisão não repetiu hooks; conferiu preservação dos seus
bytes e a mudança autorizada.
`git diff --check` retornou 0. Minha única escrita no checkout é este arquivo.

## 4. Higiene, simplificação e limites

A manutenção resolve diretamente a identidade stale; nenhuma complexidade
artificial foi acrescentada ao wrapper, nenhum helper ganhou waiver e nenhum
teste foi enfraquecido. Não há simplificação adicional necessária nesta linha.
review-r3b-diff.md permanece histórico, com o finding correto para a versão
anterior da baseline; este parecer registra sua resolução e a prova nova.

Recomendo encerrar esse finding no resultado local R3B, mantendo as limitações
da revisão anterior: nenhum julgamento sobre toda CI/GitHub, pureza de imports,
snapshot transacional de rubricas ou check legado do substrate. R3A aditiva
permanece futura; transporte R2a continua bloqueado. Não há blocker restante
identificado dentro desta manutenção factual, nem publicação realizada.
