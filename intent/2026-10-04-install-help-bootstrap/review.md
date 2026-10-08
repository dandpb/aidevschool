# Revisão independente: bootstrap help do instalador

Data: 2026-10-04. Ambiente cloud, `/workspace/aidevschool`.
Revisor: `/root/review_replay_fold_diff`, separado do produtor.
Base: b9f77774643b94bfd9fafbd756a1b17482c33e45.
Autorização específica: implementar a proposta separada somente em install.py,
com todos os testes intactos e validação final em cópia fria/offline.

Resultado: **nenhum finding substantivo identificado**. A falha legada de help
em cache frio foi corrigida e a nova suite final MVP passou integralmente.
Recomendo considerar atendidos os critérios técnicos locais desta fatia, nos
limites abaixo. Revisão de agente não é aprovação humana nem autorização de
commit, push, PR, merge, deploy, Library ou publicação.

## 1. Correção versus proposta e contrato

Confrontei intent/spec/plan/evidence, proposta aceita, diff, snapshot original,
fontes, teste existente e harness temporário. install.py:27–49 contém o único
parser, com prog, descrição, tipos, flags, defaults e textos originais. O
bootstrap :53–54 parseia uma vez antes do import local :60. Help encerra por
SystemExit(0) nativo; argumento inválido por SystemExit(2), sem detecção manual
de flag ou segundo parser. Isso evita carregar _install_validation no help.

_run_from_args conserva o corpo pós-parse: resolve fora do try, validação,
manifest, --check, install, mensagens e catches. main(argv=None) preserva a
assinatura/retorno e seleciona argv como antes. Na importação por importlib,
InstallError e helpers continuam disponíveis com as dependências globais
originais. Argumentos válidos seguem pelo mesmo corpo após import local.
Antecipar help/erro de parsing na execução CLI é a mudança intencional aceita.

Li checks.py e ast-proof.json: os 11 helpers anteriores fora main permanecem
iguais por AST; assinatura/retorno main, quatro statements que definem parser
e corpo pós-parse também. O diff confirma que nenhuma lógica de instalação,
validação, detecção ou scheduler foi reescrita. Simplificação proporcional:
separação parser/corpo/adaptador mantém uma definição de cada contrato; não
há flag global de bytecode, shim, cache semeado ou fragmentação artificial.

## 2. Testes e proveniência

Examinei outputs reais, comandos/cwd/env keys e código de probes; não executei
nem repeti checks, suites, lanes ou hooks do produtor nesta revisão.
Artefatos em /tmp/aidevschool-install-help:

| Prova | Resultado real |
| --- | --- |
| targeted/final network-probe | exit 0, socket EPERM no pai e filho em ambas as cópias |
| api-contracts | exit 0: help/-h/--he, erro 2, --check, exports/API/main e deliver |
| targeted-installer | exit 0: 13 passed in 0.34s |
| mvp-final-full | exit 0: 67 passed in 3.23s; stdout 99 bytes, stderr vazio |
| complexity | gate completo dos cinco roots, max 8/baseline integral; exit 0, stdout/stderr vazios |

Probes help usam cache frio, HOME/PATH mínimos e Python normal com trace -v;
observam help/exit 0, ausência de import local, digest do bundle igual, nenhum
pyc e HOME ausente. Erro CLI mantém source/home; --check conserva fluxo normal
sob a allowlist declarada. Probes de API conferem identidade de InstallError,
validate_curriculum/verify_manifest, main argv explícito/implícito e dispatch
deliver sintético. O callback sintético está somente no harness.

A suite final executa o diretório tests inteiro uma vez, em árvore independente
da targeted, fria e hash-conferida antes da execução. Fixture documental está
presente desde o início em ambas: 171415 bytes, SHA-256
32c260d7db172405b7b4fcbbaa4d4e7aa2fda5c50f730edf7aee6d05e4dd0b1a.
Os 13 testes direcionados são incluídos nessa execução final conforme o plano.
Este novo resultado 67/67 não reclassifica os históricos 65/2 e 66 casos
distintos/1 falha; recibos anteriores permanecem corretos e intactos.

## 3. Preservação e convenções

Recalculei por leitura os 6400 hashes da snapshot: nenhuma ausência;
única alteração preexistente é install.py. Os outros 6399 arquivos são iguais.
Conferi os 144 inputs de cada cópia targeted/final com origem e cópia: todos
iguais. Runtime revisado e executado SHA-256:
`80b1169bc1fb5e1716aafbf38d3b1325abcf6fc72c5e2052ea7e1252aef08d1f`.

Hashes intactos dos testes:

- test_install.py: `2b3b04cc7cb21b4ad9e221c403b6000ac6fd1bf4be8f422fc30a846af3eba418`
- test_replay_fold.py congelado: `0b8366d4d39c647ad559864261f30aad31ef5c0c1df58e0be77b66eb5d856d61`

R3B runtime/baseline, R5/R7/R9, dados, testes anteriores, históricos, hooks,
pins e pacotes anteriores permanecem preservados. Não há alteração de contrato
de gate/prompts que peça modificação de manifest. Preflights reais nos dois
*.preflight.json retornam 0, output vazio e caminho install.py; não houve
override ou negativa. A checagem final dos seis caminhos desta fatia será
feita pelo produtor após este recibo; não afirmo sua execução antecipadamente.

## 4. Segurança e limites

Harness usa env allowlist, sem credenciais reais ou instalação de dependências.
Seccomp fail-closed bloqueia rede/io_uring e é herdado pelos filhos, inclusive
quando o probe help remove PYTHONPATH e PYTHONDONTWRITEBYTECODE. Audit Python
de filesystem não é sandbox kernel universal de bash/filhos; não afirmo
import API zero IO ou ausência de leituras do Python para help.

Nenhuma instalação em plataforma remota ou operação Git/publicação foi feita.
Self-test HTTP/precheck segue com limite loopback EPERM anterior, e contexto
real de refs/PR/CI GitHub não foi verificado. Esta revisão não certifica todas
as lanes ou ambientes. Não houve retry Library nem transporte R2a; R3A aditiva
permanece futura. Sem blocker restante identificado nesta fatia local.
