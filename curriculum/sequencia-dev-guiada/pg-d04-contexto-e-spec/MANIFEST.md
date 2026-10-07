# MANIFEST — pg-d04-contexto-e-spec (U09)

Pacote de prática guiada da unidade U09 (SEQUENCIA.md §2): contexto e
PRD/SPEC de tarefa pequena. Autoral em diretório novo; não altera lições,
módulos, engines, runtime, progresso ou gates.

## Arquivos do pacote (allowlist de entrega)

| Caminho | Papel | Audiência |
| --- | --- | --- |
| `enunciado.md` | ciclo guiado: objetivo observável, bordas B1–B3, tentativa, feedback, retry, takeaway | aprendiz |
| `exemplo-trabalhado.md` | fontes reais citadas (blobs) + saídas reais executadas | aprendiz |
| `insumos/PEDIDO.md` | fixture fictícia: e-mail-vago com 5 entregas embutidas e decisões implícitas | aprendiz |
| `insumos/inventario-repo.txt` | fixture fictícia: inventário neutro do repo `rodadia` (caminhos + fatos inertes) | aprendiz |
| `insumos/verifica_contexto_spec.py` | verificador mecânico offline do piso de formato (stdlib) | aprendiz |
| `rubrica-v1.md` | 7 critérios objetivos com perChecks | aprendiz + professor |
| `guia-de-correcao/solucao/` | documentos-modelo (CONTEXTO/PRD/SPEC) | professor (após tentativa) |
| `guia-de-correcao/contraexemplos/` | 4 negativos que o verificador rejeita (um por família de falha) | professor |
| `guia-de-correcao/teste_verificador.py` | testes determinísticos positivo+negativo do verificador | professor |
| `guia-de-correcao/solucao.md` | saídas reais da verificação + comentário por critério | professor |

O aprendiz entrega apenas `CONTEXTO.md`, `PRD.md` e `SPEC.md` (fora do
pacote, em diretório próprio) — nada mais é exigido nem avaliado.

## Proveniência (resolvida antes da autoria; base pinada `e01d9d42`)

| Fonte | Blob (12) | Uso |
| --- | --- | --- |
| `docs/curso-simples/index.html` (M4 §4.1–4.4, M5 §5.1–5.4) | `2bcf99fbd831` | disciplina de seleção de contexto e PRD/SPEC |
| `docs/curso-simples/workflow-exemplo/CONTEXTO.md` | `9fbc21127ea2` | exemplo real das duas tabelas |
| `docs/curso-simples/workflow-exemplo/PRD.md` | `2b4deb2764fe` | exemplo real de fora de escopo + aceite |
| `docs/curso-simples/workflow-exemplo/SPEC.md` | `1d5c696c3bb2` | exemplo real de interface/bordas/falha fechada |
| `docs/curso/workflow_lab/fixtures/05-cycle-05.json` | `dee137438663` | gate DAG (precedente de B1/B2) |
| `docs/curso/workflow_lab/fixtures/06-cycle-06.json` | `90df4afde0c3` | renomes como trabalho separado (precedente do corte) |
| `curriculum/sequencia-dev-guiada/SEQUENCIA.md` | ver base `e01d9d42` | prioridade U09 (§2/§3/§6-P2) — fonte congelada, não alterada |

Saídas citadas no `exemplo-trabalhado.md` foram executadas na árvore da base
`e01d9d42` (offline, Python 3.13). Fontes não foram modificadas.
