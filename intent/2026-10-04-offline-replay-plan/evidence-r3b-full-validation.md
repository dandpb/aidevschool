# Evidência adicional: suite completa MVP e guards/precheck

2026-10-04, Codex Cloud /workspace/aidevschool, HEAD
`b9f77774643b94bfd9fafbd756a1b17482c33e45`. Autorização: completar a validação
pendente de empacotamento/imports sobre R5/R7/R9/R3B, sem editar testes
congelados/existentes, ampliar runtime além de R3B ou afrouxar gate/rede.
Parecer independente pertence a review-r3b-full-validation.md.

## Isolamento e proveniência

Harness e outputs em /tmp/aidevschool-r3b-full-validation. Cópia hash-igual do
engine MVP inteiro, pyproject, cinco módulos determinísticos gate/init, scripts
precheck, sdlc_guard_check, merge_pr e três hooks canônicos. Manifest de fontes
copiadas: 160 inicialmente, 161 após acrescentar a spec de referência ausente.
Sem cópia de learner state/evidence, curriculum compartilhado, ambiente/credenciais,
config Git do usuário ou .git original. Currículo e instrumentos do bundle MVP
são fixtures de distribuição, não registros reais de learner.

Env allowlist contém somente PATH, LC_ALL, PYTHONPATH da cópia/guard,
PYTHONDONTWRITEBYTECODE, PYTEST_DISABLE_PLUGIN_AUTOLOAD, TMPDIR, R3B_GUARD_LOG,
GIT_CONFIG_NOSYSTEM, GIT_CONFIG_GLOBAL=/dev/null e GIT_TERMINAL_PROMPT=0.
Nenhuma credencial real criada/herdada e nenhuma dependência instalada.
O launch Python instala o mesmo seccomp fail-closed anterior antes de executar
pytest, bash ou node; filtro herdado pelo kernel mesmo quando filhos reduzem env.
Probes socket no pai e filho deram EPERM. Node observado: v24.19.0; o job
precheck-baseline da CI configura Node20.
Python e libs vêm da venv existente. Audit Python limita writes a /tmp e bloqueia
árvore canônica original; não é sandbox kernel de filesystem para bash/node.

## Execuções reais

| Check | Resultado | Output |
| --- | --- | --- |
| Probe de rede pai/filho | exit0; ambos EPERM | network-probe.log |
| Suite MVP completa, diretório tests inteiro | exit1; **65 passed, 2 failed** em 3.01s | mvp-full.log |
| Somente negativo progress_card, após fixture faltante | exit0; **1 passed** em 0.08s | spec-fixture-recheck.log |
| Somente negativo installer help, controle HEAD original | exit1; **1 failed** em 0.09s, mesmo pyc | baseline-installer-recheck.log |
| sdlc_guard_check.sh --self-test | exit0; **45 passed, 0 failed** | sdlc-self-test.log |
| merge_pr.sh --self-test | exit0; **26 passed, 0 failed** | merge-door-self-test.log |
| precheck.mjs --self-test | exit1; registro de 72 checks passou, depois **listen EPERM 127.0.0.1** | precheck-self-test.log |
| precheck wave AID-935-65d64bca --dry-run | exit0; 72 checks/ordem/registry válidos, sem chamadas de rede | precheck-dry-run.log |
| guard-no-stray-copies.sh --self-test | exit0; **4 passed, 0 failed** | stray-self-test.log |
| guard-no-stray-copies.sh sobre censo de nomes da cópia | exit0; sem stray novo | stray-diff.log |
| Hooks canônicos sobre snapshot das 33 entregas | exit0; **99 invocações**, 2293 linhas adicionadas examinadas, zero falhas | hooks-diff.log + hooks-diff-results.json |

Comando MVP efetivo, cwd copy, wrapper launch com seccomp já instalado:

```text
/workspace/aidevschool/.venv/bin/python -m pytest -q -p no:cacheprovider --log-file /tmp/aidevschool-r3b-full-validation/copy/tmp/pytest.log engines/aiDevschoolMvp/tests
```

Cada execução tem *-command.json com comando, cwd, env keys e exit reais;
stdout/stderr estão no respectivo log. run.py, diagnose.py e launch.py são
harness temporário, não testes substitutos nem arquivos de produto.
Primeiro probe falhou por string mal escapada antes de qualquer suite; foi
corrigido só o harness. Pós-processamento terminou em NameError copies após
todos os checks; preservation.json foi recalculado separadamente por hashes,
sem repetir os checks. Logs desses erros de infraestrutura foram preservados.

## Diagnóstico, sem alterar produto/testes

1. progress_card falhou antes de executar runtime por FileNotFoundError em
   copy/docs/plans/ai_devschool_mvp_spec.agent.final.md. Copiei essa fixture de
   referência byte a byte da origem, conferi hash e repeti somente esse caso:
   passou. Nenhum teste persistente editado.
2. installer help falhou porque seu subprocesso fornece apenas HOME e PATH,
   descartando PYTHONDONTWRITEBYTECODE e PYTHONPATH. O filtro kernel de rede
   continua herdado, mas o Python normal importa _install_validation e cria
   __pycache__/_install_validation.cpython-312.pyc no source copiado; digest muda.
   Controle em git archive HEAD, sem replay_fold.py nem teste novo, reproduziu
   exatamente essa falha. baseline-control.json registra identidade byte a byte
   de install.py, _install_validation.py e test_install.py com checkout atual.
   É falha preexistente dependente de cache frio/env restrito, não regressão
   atribuível a R3B. Não afirmar que toda CI normal necessariamente falha: seu
   estado de caches pode diferir. Não semear pyc, substituir python3, passar -B
   escondido ou alterar teste para produzir verde.
3. precheck self-test serve fixtures HTTP em loopback. A descrição offline
   significa sem rede externa, mas ele necessita sockets locais. O seccomp
   nega listen, portanto é limitação de infraestrutura sob a política atual,
   não falha de fixture/R3B. Sem liberar localhost ou substituir o self-test.

Resultado fiel: 67 casos completos inicialmente executados; 65 passaram e dois
falharam. Um negativo passou após corrigir somente a cópia: **66 casos distintos
aprovados e 1 falha preexistente**. Não declarar full suite verde. Nenhum caso
verde foi repetido e nenhuma lane não afetada foi executada.
install.py está fora dos dois runtimes R3B autorizados; nenhuma correção foi
aplicada. Corrigir esse comportamento exige fatia/autorização específica, com
o teste existente intacto. Não ampliar escopo silenciosamente.

## Guardrails e limite de CI

O CLI sdlc_guard_check.sh aceita refs commitadas e exige merge-base/log;
não verifica working tree. Não fiz commit das entregas para satisfazer o CLI.
Hooks-diff aplica os três hooks canônicos a cada caminho de inventário real:
M materializado em existence mirror, A ausente, sem override. Isso replica a
semântica de proteção de arquivos novos/existentes e o scan canônico de tokens
em linhas adicionadas. Não substitui countersign/conversa/refs do job CI.

A cópia tem repositório vazio, sem HEAD/commit, usado só para root detection e
índice info-only dos nomes rastreados na base. O stray guard usa git ls-files;
inspeção separada dos 33 caminhos novos/modificados confirmou nenhum padrão
precheck*.mjs fora de scripts/precheck. Não afirmar guard de untracked geral.
Self-tests SDLC/stray nativos criam históricos sintéticos em temp para testar
violações; são internos às fixtures, não commits do patch/checkout. Overrides
sintéticos dos testes do guard não foram usados no diff de entregas.
Snapshot 33 é anterior a estes dois recibos novos. Após evidence/review será
feita somente checagem dos dois novos Markdown, sem repetir os 33 caminhos.

## Preservação e pacote

Inventário before.json contém **6398 arquivos**: rehash após os checks,
diagnóstico e controle confirma todos inalterados. Teste novo permanece SHA-256
`0b8366d4d39c647ad559864261f30aad31ef5c0c1df58e0be77b66eb5d856d61`.
Não houve escrita de runtime/testes no checkout, pins, hooks ou dados canônicos.
As duas únicas adições de entrega são este recibo e a revisão independente.
O pacote anterior de 33 arquivos é mantido íntegro em
/workspace/aidevschool-deliverables/2026-10-04; pacote atualizado terá 35 arquivos,
com os dois recibos, em diretório distinto 2026-10-04-validation.

Library não foi chamada novamente. Erro exato da tentativa anterior, sem URLs:
`library upload failed: hosted apps tools/list request failed: network`.
Sem confirmação de upload/IDs, sem retry/rota alternativa, sem publicação GitHub.

Continuam pendentes: full MVP verde no isolamento atual por help-pyc legado,
precheck self-test completo por loopback bloqueado, SDLC CLI/contexto real de
PR e jobs integrais learner/OpenClaw/MME e demais lanes CI não atestados.
Complexidade final integral já passou e não foi repetida. R3B runtime permanece
com as provas anteriores; esta execução aumenta cobertura, sem remover os
limites ou transformar falha conhecida em aprovação de CI.
