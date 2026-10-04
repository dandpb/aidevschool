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

## Recuperação de CI do PR rascunho #667 — bootstrap nativo do replay

O head publicado 42345a823acaf1c5734d33a0a55b41a4d5200014 falhou
no run 37240094147/job 111546919070: 65 passed, 2 failed. Casos novos
congelados CLI chegaram a JSON/exit/scratch corretos, mas observaram pyc
durante imports. A prova histórica 67/67 usava PYTHONDONTWRITEBYTECODE;
essa diferença de ambiente ocultou a violação de writes scratch-only.

Correção autorizada como falha recuperável dentro dos mesmos 41 caminhos:
replay.py aplica política temporária de não criar bytecode somente durante
bootstrap CLI, antes dos imports stdlib/locais, restaurando o valor recebido
em finally. Import como biblioteca mantém política recebida; main permanece
byte-identical. Fold, avaliador, dados, testes congelados, hooks, workflows
e baseline não foram alterados nesta recuperação. Plano atualizado por apêndice.

Nova prova em /tmp/aidevschool-publication-evidence, produzida no clone
isolado /tmp/aidevschool-publication, ainda antes do segundo commit/push:

| Check | Resultado |
| --- | --- |
| Frozen CLI success/divergence, sem flag de bytecode | 2 passed in 0.12s, exit0 |
| Import API políticas False/True + falha sintética de import CLI | política preservada/restaurada, exit0 |
| Suite MVP completa em segunda cópia fria | 67 passed in 2.69s, exit0, uma execução |
| Probes antes de targeted/full | native bytecode enabled; socket EPERM no pai e filho, exit0 |
| Preservação antes deste apêndice | só replay.py + plan.md alterados na snapshot41; main byte-identical, teste frozen hash intacto |

Cada cópia recebe 144 arquivos hash-conferidos, sem pyc ou cache semeado;
a full começa fria e separada da targeted. Usa a venv existente e fixture
documental do repositório desde o início, sem instalar dependências.
Allowlist: PATH, LC_ALL, PYTHONPATH, PYTEST_DISABLE_PLUGIN_AUTOLOAD, TMPDIR,
R3B_GUARD_LOG; PYTHONDONTWRITEBYTECODE está ausente e o probe confirma
sys.dont_write_bytecode False. Mesmo guard seccomp original, sem alteração,
com rede/io_uring negados e audit Python de writes em /tmp. Esse audit não é
controle kernel universal de filesystem. Não há alteração de tests/env/workflows
para tornar a lane verde. Resultados anteriores continuam históricos.

Runtime replay.py SHA-256: `1e3c20cd595ec755c9203d74fed7168fc76f0eb79a07385e8a1912d5f7381c01`.
Frozen test_replay_fold.py SHA-256: `0b8366d4d39c647ad559864261f30aad31ef5c0c1df58e0be77b66eb5d856d61`.

Provas externas: hashes conferíveis neste executor; arquivos temporários não entram no PR.

| Artefato | SHA-256 |
| --- | --- |
| verify-recovery.py | `08a7126c2e20dabfdc15f2731b0a85f9658949d45e6c0116a33bd81554a00b4f` |
| recovery-before.json | `51b1a330e8c5dc6cbb84617cef3b182fb515cdabe2cdd53322cbb8712da1fdea` |
| recovery-cli.log | `570d6eca2cee31278223b2b6adcac2ab615ae9199c8a0c16418279c36414f36e` |
| recovery-api.log | `b143f81467938f5819ccf8c52c40498e8afb37c9f57c92886377962027ffa14c` |
| recovery-full-suite.log | `782233f935f1585f587a1bd546e2aa12c86ce391d844c2f2dfdcc05ea84c3ab5` |
| recovery-targeted-network.log | `2daf3b0321485198ce130a564e2eb38ce9166a9af538a303c99a4a9ab4494260` |
| recovery-full-network.log | `2daf3b0321485198ce130a564e2eb38ce9166a9af538a303c99a4a9ab4494260` |
| recovery-preservation.json | `53d5f43c5a7e3760260aea2ea116615e911a5d52d58b401f00cc0d215ff51b7e` |
| recovery-full-inputs.json | `4d04dbcf70f9d99f1c17d4741e801377072bf7cad55c92b13496ec5027fdcbdc` |
| recovery-targeted-inputs.json | `4d04dbcf70f9d99f1c17d4741e801377072bf7cad55c92b13496ec5027fdcbdc` |
| recovery-full-suite-command.json | `a0730d6e70fdfe5e24a58c6a0c574e4804387f5b9b1a5746c6eb999ef6b04e1a` |
| independent-ci-diagnosis.md | `e697a9d64921b4734ea905bf1816e23a23d0638fbba6d50f79ba4d2b69d67678` |

Revisão independente e CI do próximo head ainda pendentes no momento deste
recibo. Countersign do primeiro head falhou por produtor sem trailer
genuíno; não houve fabricação de task/run/session, merge, deploy ou auto-merge.
