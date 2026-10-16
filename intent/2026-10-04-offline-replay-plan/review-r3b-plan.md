# Revisão independente pré-código: corte R3B

Data: 2026-10-04. Revisor: `/root/review_offline_replay_plan`, contexto
separado do produtor. Base: `b9f77774643b94bfd9fafbd756a1b17482c33e45`.

Resultado: corte coerente após correções; nenhum impedimento técnico
substantivo permanece nesta revisão do plano. A implementação R3B já
autorizada pelo responsável pode seguir os gates documentados, sem nova
solicitação de autorização para esse mesmo escopo. Este resultado não atesta
código, testes ou eficácia executada do harness: todos continuam por verificar.

## Escopo e proveniência

Aplicados os passes pertinentes de REVIEW.md e da etapa de revisão do skill
local ai-native-sdlc. Confrontados intent/spec/plan com replay.py, _core.py,
_runtime.py, instalador/manifest, testes de acceptance/paridade e guards locais.
Também lidos, sem execução, os dois arquivos do harness temporário.

Runtime e novo teste ainda não apresentam mudanças no status inspecionado.
Não executei runtime, CLI, suite, network probe, guard ou provider. A única
escrita desta revisão é este arquivo; review.md anterior permanece histórico.
Baseline de 6391 hashes e snapshot do replay são evidência fornecida pelo
produtor em /tmp/aidevschool-r3b; sua contagem integral não foi reexecutada
por este revisor.

Versões SHA-256 revisadas:

- intent.md: `0c9625c4ab22fd52eca14109fb45c48f8e30ed3b159bd88a1c194fcd5eab697d`
- spec.md: `b83881e6742452d260a2541b939fe05bd02d5554a533934f28fc366795fdb31c`
- plan.md: `4ae6f6297c3cd06233cc53fbb0744c6a40b29486b6df682dab17c2464d6bfefa`
- guard/sitecustomize.py: `095888fa9b2d83f64f4cba0b723ab640fdf09aa312de01b9d1bb198498bf3f7f`
- run_checks.py: `def83b4bda360692cc541cf6a3605d59382e413d56df199bd3f60d2ea0483e58`

Os dois últimos arquivos ficam somente em /tmp/aidevschool-r3b e pertencem à
prova, não ao produto.

## Findings devolvidos antes da correção

1. **Important — cópia isolada incompleta para comandos selecionados.**
   test_runtime_parity.py deriva REPO_ROOT por parents[4] e lê os quatro módulos
   em learner/gate. test_review_reschedule_aid2687.py também importa
   learner.gate.engine. Copiar apenas engine MVP tornava a prova inviável ou
   favorecia import acidental do checkout original. Plano corrigido mantém
   layout green/engines/aiDevschoolMvp e inclui pyproject, os dois __init__ e
   quatro módulos gate como fixtures imutáveis com hashes conferidos. Não
   copia estado/evidência learner nem amplia escopo de edição.

2. **Important — falha do guard precisa abortar efetivamente.**
   Exception ordinária em sitecustomize pode deixar o startup continuar;
   anúncio genérico de falha não garante isolamento. Plano/harness agora usam
   os._exit(97), fazem probe de pai/filho antes da suite e registram guard em
   arquivo separado, preservando stdout JSON da CLI. Falha de seccomp exige
   parar essa prova, sem fallback para execução com rede disponível.

3. **Important — filtro clássico deixava via alternativa de rede.**
   Bloquear socket/connect/send/recv não cobre operações submetidas por
   io_uring. Harness/plano agora também negam setup/enter/register, syscalls
   425/426/427 no Linux x86_64, além do filtro de arquitetura/x32. Conferência
   feita somente por leitura; instalação e herança do filtro aguardam probes.

## Contrato avaliado

As APIs fold_ledger e required_rubric_ids recebem valores em memória. Um
iterador único reproduz roles na ordem, tabela global por attempt_id e
curto-circuito. A especificação preserva acesso básico type/payload mesmo nos
eventos ignorados e leitura de evidence G4 antes de dispensar a tarefa da
rubrica. Isso corresponde ao replay atual e evita reclassificação retroativa.

O wrapper mantém assinatura, carrega IDs únicos na primeira ordem de
necessidade e distingue missing task de tarefa None. Leitura única pressupõe
arquivos estáveis; não promete snapshot transacional. Main byte-identical,
seis FIELDS, inicialização, streak, deduplicação, teach-back e revisão são
limites claros. Temporário scratch, rename e mkdir já existem no atomic write
atual; o contrato não os confunde com escrita proibida em state/ledger/rubricas.

Instalador copia o bundle inteiro; manifest cobre apenas keys/rubrics. Novo
módulo pode acompanhar scripts sem alterar instalador, pins ou quatro espelhos.
A prova de bundle independente deve efetivamente retirar o repo dos caminhos
do subprocesso, além da execução de acceptance no layout isolado.

## Gates ainda por executar

- Criar somente test_replay_fold.py novo, após guards, e congelar hash.
  Guard negativo exige parada; nenhuma edição de teste existente ou override.
  Red por API ausente prova disponibilidade nova, não correção de check legado.
- Demonstrar pureza das funções após import separado, com chave sintética,
  operações de IO/env/rede/clock proibidas e inputs imutáveis. CLI admite
  leituras e efeitos scratch; não declarar zero IO dela.
- Executar adversos de ordem/ID/roles, tarefas faltantes/None, corrupção
  necessária e desnecessária, leitura única, transições, seis campos e CLI
  0/2. Confrontar baseline em sandbox e conferir main por bytes, não só AST.
- Executar acceptance/paridade pelo runner sanitizado, registrar comandos,
  outputs, probes e origem dos imports. Depois obter revisão independente do
  diff/evidências; este documento não substitui review-r3b-diff.md.

Escopo de edição permanece dois runtimes e um teste novo, mais documentos
deste intent. Rollback restaura somente replay.py pré-fatia; não reset/clean
nem excluir teste congelado sem autorização compatível. R5/R7/R9 ficam
preservadas, transporte R2a bloqueado e nenhuma publicação autorizada.
R3A aditiva é estratégia futura: check/--check do substrate continuam legados
com possíveis efeitos env/HTTP/escrita. R3B não necessita recibos produtivos.
