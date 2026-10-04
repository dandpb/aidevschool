# Revisão independente do diff R3B

Data: 2026-10-04. Ambiente: cloud, `/workspace/aidevschool`.
Revisor: `/root/review_replay_fold_diff`, contexto separado do produtor.
Base HEAD: `b9f77774643b94bfd9fafbd756a1b17482c33e45`.

Resultado: testes focados passam, mas o gate técnico permanece pendente por
um finding de compatibilidade com o ratchet de complexidade da CI. Isto é
revisão de agente independente, não aprovação humana nem autorização de
commit, push, PR, merge, deploy ou Library.

## Escopo e versões

Lidos AGENTS.md raiz, engines/AGENTS.md, CLAUDE.md raiz, REVIEW.md, skill local
ai-native-sdlc e skills AI Dev SDLC/AI Dev Review; confrontados intent, spec,
plan, review-r3b-plan e evidence-r3b com fontes, teste congelado e harness.
Nenhuma instrução AGENTS.md/CLAUDE.md adicional existe dentro do engine MVP.
O review.md anterior permanece histórico e inalterado.

Hashes SHA-256 conferidos diretamente:

| Arquivo | SHA-256 |
| --- | --- |
| scripts/replay.py | `94e384f815c736384dddae6e722f2d90d35fd5b7c38c3631cb60b7e1e8b390a1` |
| scripts/replay_fold.py | `dada381a9607c47978e959c825068097018f254bb29de063bcce566c2f26c780` |
| tests/test_replay_fold.py | `0b8366d4d39c647ad559864261f30aad31ef5c0c1df58e0be77b66eb5d856d61` |
| /tmp/aidevschool-r3b/run_checks.py | `2626cf6245d6e29e6b73c8c3b037a1394f4adcd1e52c56698ccb41312aa687bb` |
| /tmp/aidevschool-r3b/guard/sitecustomize.py | `095888fa9b2d83f64f4cba0b723ab640fdf09aa312de01b9d1bb198498bf3f7f` |

Os três primeiros caminhos são relativos a engines/aiDevschoolMvp/aidevschool
para scripts e a engines/aiDevschoolMvp para tests. A revisão não editou
runtime, testes, hooks ou documentos anteriores; sua única escrita no checkout
é este arquivo. O resultado preliminar e, depois, o finding de complexidade
foram devolvidos ao produtor antes da conclusão deste registro. A constatação
da CI foi trazida pelo produtor e confrontada pelo revisor com workflow,
gate, baseline e outputs reais; não é descoberta originalmente deste revisor.

## Finding — Important: extração quebra o ratchet de complexidade da CI

Localização: `.github/workflows/ci.yml:342`,
`scripts/python_complexity_baseline.txt:21` e
`engines/aiDevschoolMvp/aidevschool/scripts/replay_fold.py:57`.

A CI mede funções do engine com máximo 8 e baseline congelada por path:nome.
A entrada replay.py:replay continua na baseline, mas o wrapper simplificado
deixa de ser violação; `check_python_complexity.py:evaluate` rejeita a entrada
stale. Fold foi movido para nome novo sem waiver. Prova do produtor, no engine
isolado com baseline filtrada para o engine, exit 1 em complexity.log:

```text
engines/aiDevschoolMvp/aidevschool/scripts/replay_fold.py:fold_ledger:57:26
stale baseline entry: engines/aiDevschoolMvp/aidevschool/scripts/replay.py:replay
```

Li o output e o gate que gera os dois diagnósticos. Radon do snapshot original
registra replay CC30; a extração reduz fold a CC26, e classificador CC8/coleta
CC5 não violam o limite. Portanto é incompatibilidade mecânica de localização
da dívida existente; testes verdes não tornam esse gate obrigatório verde.

Uma realocação da entrada antiga para o fold depende de avaliação/autorização
específica do responsável para baseline congelada, fora dos dois runtimes e
teste novo autorizados. Alternativa é simplificar as funções novas até o limite
e autorizar a remoção da entrada stale. Não manter complexidade artificial no
wrapper nem acrescentar waivers silenciosos. Baseline não foi alterada. A CI
permanece bloqueada até resolução efetiva e execução do gate corrigido.

## 1. Correção versus plano

`replay_fold.py:17` centraliza classificação ordenada, roles globais por
attempt_id e leitura básica de type/payload antes de ignorar conceito
desconhecido. `required_rubric_ids` e `fold_ledger` usam esse mesmo iterador.
Tentativa posterior não reclassifica verdict anterior; role primary não apaga
teach_back já persistido; role de conceito desconhecido não entra na tabela.
G4 ainda acessa evidence antes do curto-circuito da role persistida.

`replay.py:34` carrega cada ID necessário uma vez, na primeira ordem de uso,
e delega. ID ausente do mapping levanta MissingRubricTaskError, enquanto None
carregado representa rubrica ausente e classificação primary. Rubrica
desnecessária é dispensada. Fold preserva estados, streak G3, IDs perguntados,
flag teach-back, retenção/limite e consumo de next_review_ts. `_blank` continua
reexportado pelo wrapper; sua AST é igual à implementação original.

Conferência própria por leitura/AST: main inteiro byte-identical ao snapshot,
_rubric_task AST igual e seis FIELDS preservados. Import de `_runtime` continua
anterior ao novo import e estabelece scripts_dir; CLI em bundle copiado passa
em subprocesso com cwd externo. O instalador já copia todo o bundle, incluindo
o módulo novo; manifest atual cobre keys/rubrics. Não há mudança de protocolo
de avaliação ou de shared gate que exija edição de espelhos ou MANIFEST.md.

## 2. Testes e evidência

Executei independentemente somente o harness autorizado:

```text
python3 /tmp/aidevschool-r3b/run_checks.py verify
.......................... [100%]
26 passed in 1.22s
proof: verify exit: 0 copy: /tmp/aidevschool-r3b/verify
```

`verify-command.json` registra Python absoluto, comando pytest, cwd da cópia,
sete nomes da allowlist e exit 0. `verify-probe.log` confirma socket negado
por EPERM no pai e filho; verify-guard.log tem 29 inicializações. Inspeção do
guard confirma seccomp para socket/network e io_uring, rejeição de arquitetura
incompatível/x32 e os._exit(97) se startup falhar. Audit adicional limita writes
a /tmp e bloqueia a árvore canônica original; nenhuma suite foi executada
diretamente no checkout ou com ambiente de credenciais herdado.

Os 19 casos novos cobrem pureza após import com chave sintética, imutabilidade,
seis campos, roles/ordem/IDs globais, missing versus None, primeira necessidade,
JSON necessário inválido/desnecessário dispensado, fail G3, revisões e eventos
desconhecidos/malformados. Os dois casos CLI observam mkdir, escrita temporária
e rename real, stdout JSON e exits 0/2, além dos bytes de fontes/state/ledger.
Os sete acceptance existentes também passaram nesta execução independente.

Li o código e as saídas reais do produtor: red2 dá 19 ModuleNotFoundError por
API ausente; green dá 26 passed; parity dá 8 passed; differential compara 73
ledgers sintéticos com baseline, todos concepts/seis campos iguais e inputs
não mutados. Parity e differential não foram reexecutados por este revisor.
O primeiro red falhou na infraestrutura de logging e não é prova red da API.

## 3. Convenções e preservação

Recalculei todos os 6.391 hashes de before.json: nenhum arquivo ausente;
somente replay.py e intent/spec/plan diferem, exatamente quatro arquivos.
Os outros 6.387 permanecem iguais, inclusive testes existentes, R5/R7/R9,
review.md histórico, dados canônicos, hooks e pins. O teste novo conserva o
hash congelado fornecido. Novos arquivos runtime/teste e documentos desta
fatia estão dentro do escopo registrado. `git diff --check` retornou 0.

Fixtures learner/gate vivem somente na cópia de prova em /tmp, com hashes
conferidos pelo runner; nenhum estado compartilhado foi duplicado no engine.
R3A0/A não foram implementadas e transporte R2a segue bloqueado.

## 4. Segurança, higiene e simplificação

O novo módulo importa somente typing; funções recebem valores em memória,
sem callbacks/provider/Path/clock/env. A chave de teste é sentinela sintética.
Logs examinados não expõem valores de credenciais. A fronteira IO fica no
wrapper/CLI existente e a prova executada confirma efeitos scratch previstos.

Passe de simplificação proporcional: classificador compartilhado evita
duplicar precedência e coleta/fold; loader explícito mantém missing distinto
de None; _blank extraído evita segunda implementação. A extração já reduz
CC30 para CC26 no fold, mas não satisfaz o ratchet por nome/path, como registra
o finding. Não proponho fragmentação artificial nem alteração do teste
congelado para ocultar a falha.

## Limitações e recomendação

Os passes não provam ausência de outros bugs. A suite completa do engine não
foi executada; as provas cobrem a fatia e acceptance selecionada. Pureza é
verificada após imports, não uma declaração zero IO de import/CLI. O probe
dinâmico testa socket; cobertura dos demais syscalls foi conferida no filtro.
Audit Python de filesystem não equivale a sandbox kernel de filesystem.

Dois percursos pressupõem ledger/curriculum estáveis; leitura única captura
tarefa por ID e não promete snapshot transacional de rubricas mutáveis.
Red prova disponibilidade da nova API, não defeito anterior no check legado.
Check/--check do substrate seguem legados e não são certificados offline por
esta revisão. R3A aditiva é futura. R3B fica como resultado local testado, com
o gate de review pendente pela CI de complexidade. Qualquer publicação
continua fora da autorização.
