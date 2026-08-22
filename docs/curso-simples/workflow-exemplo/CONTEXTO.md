# CONTEXTO — pacote selecionado para esta feature

## Incluído (e por quê)

| Item | Por quê |
| --- | --- |
| `PRD.md`, `SPEC.md` (desta pasta) | Contrato da entrega |
| `docs/FUNDAMENTOS.md` (repo raiz) | Regras de pedido e robustez que o código deve respeitar |
| `docs/curso/workflow-exemplo/export_tasks.py` (repo) | Referência do padrão "núcleo puro" já usado no curso anterior |
| `git log --oneline -20` do repo | Fonte dos commits reais do `demo_commits.json` |

## Excluído (e por quê)

| Item | Por quê |
| --- | --- |
| `engines/`, `learner/`, `curriculum/` | Nenhum relação com gerador de release notes |
| `node_modules`, builds, lockfiles | Ruído; nada de Node nesta feature |
| `.venv`, caches | Ambiente, não contrato |
| Histórico completo do git | 349 commits não cabem nem ajudam; 10 bastam para a demo |

## Regra aplicada

> Contexto grande não é contexto bom. Selecionar é medir qualidade: se um arquivo
> não muda como esta feature será feita, ele não entra.
