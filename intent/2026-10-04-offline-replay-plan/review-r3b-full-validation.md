# Revisão independente da validação ampliada R3B

Data: 2026-10-04. Ambiente cloud, `/workspace/aidevschool`.
Revisor: `/root/review_replay_fold_diff`, separado do produtor.
Autorização desta etapa: suite MVP completa e guardrails/precheck relevantes
em cópia isolada; preservar runtime/testes, bloqueio de rede, ambiente sanitizado
e proibição de publicação. Minha única escrita no checkout é este parecer.

Resultado: evidências ampliadas confirmam cobertura adicional sem regressão
R3B identificada, mas **não demonstram suite completa verde**. Permanece uma
falha legada de `install.py --help` em cache frio, reproduzida na baseline.
Precheck self-test também permanece sem conclusão funcional por listen EPERM
no isolamento exigido. Nenhuma dessas pendências foi ocultada ou contornada.
Este é parecer de agente; não é aprovação humana de release ou CI inteira.

## 1. Contrato, harness e isolamento

Revisei evidence-r3b-full-validation.md, run.py, launch.py, diagnose.py,
comandos JSON, outputs completos e fontes canônicas de hooks/SDLC/merge/precheck.
A evidência distingue corretamente falha em cache frio de CI usual e audit
Python de sandbox kernel de filesystem. A suite recebe todo o diretório
engines/aiDevschoolMvp/tests, equivalente ao alvo da CI específica do engine.
PYTEST_DISABLE_PLUGIN_AUTOLOAD, ausência de cacheprovider e log em /tmp ficam
explícitos. Não instalei dependências nem reexecutei suites, lanes ou hooks.

Env allowlist não herda credenciais; launch Python instala o guard seccomp
antes de criar bash/node/Python filhos. network-probe.log confirma socket
EPERM no pai e filho. O guard mantém bloqueio de rede/io_uring, aborta startup
se instalação falhar e adiciona audit de filesystem nos processos Python que
o carregam. Kernel seccomp continua herdado mesmo quando um teste substitui
o ambiente do subprocesso. Não afirmo audit Python universal em filhos que
removem PYTHONPATH, nem sandbox kernel de filesystem.

## 2. Suite completa e diagnóstico dos negativos

Artefatos em /tmp/aidevschool-r3b-full-validation:

| Prova examinada | Resultado real |
| --- | --- |
| mvp-full.log / mvp-full-command.json | exit 1: 65 passed, 2 failed, 3.01s |
| spec-fixture-recheck.log / command.json correspondente | exit 0: 1 passed, 0.08s |
| baseline-installer-recheck.log / command.json correspondente | exit 1: mesma falha help-pyc, 0.09s |

A falha de progress card ocorre antes do runtime: faltava na cópia
docs/plans/ai_devschool_mvp_spec.agent.final.md. Diagnose copia somente essa
fixture, confere bytes e repete só o caso que falhou; ele passa. Conferi sua
origem/cópia por SHA. Isso corrige a infraestrutura da prova, não o produto.

**Important — validação completa continua não verde por falha legada.**
Localização: tests/installer/test_install.py:51–69 e aidevschool/install.py:30,
relativos ao engine MVP. O caso `test_help_is_read_only_and_does_not_require_a_platform`
limpa o ambiente do filho para HOME/PATH, descartando PYTHONDONTWRITEBYTECODE;
o import de _install_validation ao iniciar `--help` cria um .pyc no source
temporário. A assertion de bytes imutáveis falha. O stdout/help e exit 0 do
comando passam; a violação é a escrita de bytecode em cache frio.

baseline-control.json e diagnose.py mostram controle extraído por git archive
do HEAD b9f77774643b94bfd9fafbd756a1b17482c33e45, sem replay_fold/teste novo.
Conferi hashes de install.py, _install_validation.py e test_install.py iguais
entre controle e checkout. O mesmo caso falha pelo mesmo .pyc no controle.
Isso confirma origem anterior a R3B, sem afirmar falha de toda CI/GitHub: o
resultado depende da condição de cache/ambiente. Correção está fora dos dois
runtimes autorizados; não foi feita e o teste não foi modificado.

Contagem fiel após diagnóstico: 66 casos únicos passaram em duas execuções,
um caso permanece falhando. Não houve nova suite completa verde; os 65 casos
verdes iniciais não foram repetidos.

## 3. Guardrails e precheck

Outputs e exit codes conferidos diretamente:

- SDLC self-test: 45 passed, 0 failed; exit 0.
- Merge door self-test: 26 passed, 0 failed; exit 0, sem operação real de merge.
- Stray-copy self-test: 4 passed, 0 failed; exit 0.
- Stray census: exit 0. Índice sintético info-only reproduz nomes rastreados,
  sem copiar .git original ou criar commit das entregas. Esse censo não é scan
  geral de untracked; também conferi que o inventário não adiciona candidato
  precheck-*.mjs fora da árvore canônica.
- Hooks do inventário: 33 caminhos, 99 invocações (33 por hook), 2.293 linhas
  adicionadas examinadas, nenhuma falha. Hooks copiados conservam SHA original;
  M materializado/A ausente preserva a regra de teste novo versus existente.
- Precheck dry-run: exit 0, config/registry de 72 checks conferidos, sem execução
  de superfícies produtivas ou chamadas de rede.

**Limitação de infraestrutura — precheck self-test não concluído.**
O registry inicial de 72 checks passa; depois o servidor sintético tenta listen
127.0.0.1 e recebe EPERM, exit 1. O README chama esse fluxo offline com loopback,
mas o isolamento autorizado proíbe sockets também locais. Não é evidência de
falha de predicates nem de sucesso dos 25 cenários: eles não foram executados.
Não houve relaxamento de seccomp, shim, substituição de teste ou bypass. Node
observado é 24.19.0, enquanto o job precheck da CI usa Node 20; não afirmo
paridade integral desse ambiente.

sdlc_guard_check opera refs commitadas. A prova local chama hooks canônicos
diretamente sobre o inventário/mirror e linhas adicionadas; não a apresento
como countersign, pre-merge gate ou check de uma PR. Os 33 caminhos correspondem
ao inventário anterior aos dois recibos novos desta etapa; não são afirmação
de que o diff final de 35 caminhos já foi inteiramente verificado por essa lane.

## 4. Preservação, higiene e recomendação

Recalculei independentemente os 6.398 hashes de before.json: todos preservados,
nenhuma ausência/alteração preexistente. Verifiquei os 161 inputs copiados após
acréscimo da fixture documental, iguais à origem e à cópia. preservation.json
registra 160 inputs da preparação inicial; o manifesto final registra 161.
O primeiro pós-processamento falhou com NameError copies ao gerar o recibo;
preservação foi recalculada depois, sem repetir suites/lanes. Isso não invalida
outputs individuais já gravados e não conta como execução verde do harness.

Hashes runtime/teste seguem os das revisões anteriores:

- replay.py: `94e384f815c736384dddae6e722f2d90d35fd5b7c38c3631cb60b7e1e8b390a1`
- replay_fold.py: `dada381a9607c47978e959c825068097018f254bb29de063bcce566c2f26c780`
- teste congelado: `0b8366d4d39c647ad559864261f30aad31ef5c0c1df58e0be77b66eb5d856d61`

Históricos, testes existentes, R5/R7/R9, hooks, tolerâncias e dados permanecem
inalterados. Nenhuma fragmentação artificial, enfraquecimento ou exceção de
transporte foi introduzida. A manutenção factual de complexidade resolvida
na revisão anterior conserva sua prova; não foi repetida aqui.

Recomendo entregar o resultado local R3B com estes limites e manter explícitas
as pendências de validação global: help-pyc legado e self-test de precheck
incompatível com bloqueio total de sockets. R3A aditiva segue futura, check
legado do substrate não foi certificado offline e R2a continua bloqueado.
Nenhum commit, push, PR, merge, deploy ou publicação foi realizado por mim.
