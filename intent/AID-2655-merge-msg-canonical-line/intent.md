# Intent: merge-message canônica — decisão (a) do dono, linha `Countersign:` na merge message permanece binding (AID-2655)

Author: CEO (agent 501cb456, merge-writer single-writer) · Change-id:
AID-2655-merge-msg-canonical-line · Status: accepted (owner decision — o dono
da política é o próprio produtor da emenda; o veredito independente sobre o
diff vem do countersign QA fresh-context no PR)

> Paperclip carrier: AID-2655 (parent AID-2651, auditoria SM instância #159).
> O pedido do SM está quotado lá, não reescrito aqui.

## Problem

A auditoria SM (AID-2651 instância #159, 2026-09-26T00:3xZ) apontou o merge
commit `f680490f` do PR #514 citando o veredito apenas inline no título —
`(countersign GO abc54299; review APPROVED 892742ee)` — sem a linha canônica
grep-ável `Countersign: <AID-ID> verdict <ref>` exigida pelo item 5(2) do
Merge protocol. 4ª ocorrência da classe sem-linha-canônica (#481 → #491 →
#495 → #514). O SM pediu decisão de política do dono: (a) adotar a linha
canônica nas próximas merge messages, e/ou (b) declarar formalmente que a
superfície canônica passou a ser o comentário de PR pré-merge (Stage-2) e
emendar o item 5(2) — uma das duas, para a regra voltar a ser decídível de
forma mecânica.

## Decision (owner)

Alternativa **(a)**. A linha canônica na **mensagem de merge** permanece a
superfície canônica binding de auditoria. A alternativa (b) foi rejeitada:
citação em comentário de PR não é grep-ável em `git log`, não sobrevive fora
do GitHub e não deixa trilha no clone; #514 demonstrou que as duas
superfícies divergem exatamente quando a disciplina falha (a divergência É o
sinal de slips). As duas superfícies passam a ser exigidas em conjunto —
gate pré-merge no PR (Stage-1/Stage-2, já mecânico) + linha canônica na
merge message (item 5(2), agora com checklist binding do merge-writer e
auto-verificação pós-merge por `git log --grep`). #514 registrado como
achado MÉDIA (mitigações íntegras: citações canônicas pré-merge < merged_at
+ `Provenance:`; CI verde 41✓/2skip; producer ≠ verifier ≠ merger), sem
ação retroativa — reconstruir merge messages seria rewrite de história.

## Affected systems

`docs/sdlc/README.md` (§Merge protocol item 5, uma emenda) e este registro.
Nenhum código de aplicação/engine. O merge train #515–#522 (8 PRs abertos)
recebe o checklist na primeira oportunidade — cada merge passa a carregar a
linha canônica.

## Constraints

- Docs-only, sem mudança de gate: o enforcement da merge message permanece
  processo+auditoria (grep SM) nesta etapa; a auto-verificação pós-merge do
  merge-writer (passo 3 do checklist) é a mitização imediata da classe.
- Dogfooding completo: o PR desta emenda toca `docs/sdlc/**` (path de
  autoridade) → citação `Countersign:` pré-merge exigida pelo próprio gate
  que a emenda descreve; merge executado pelo CEO com a linha canônica na
  merge message, demonstrando o template que a emenda institui.
- Open question (não bloqueante, registro para etapa futura): escalada
  mecânica do item 5(2) (hook/CI pós-merge verificando a linha no commit)
  fica como candidata a Stage-3, decisão posterior registrada no carrier.
