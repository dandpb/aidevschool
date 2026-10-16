# pg-d04 — Exemplo trabalhado: selecionar contexto e fechar PRD/SPEC (fontes reais do repo)

> **Fontes primárias** (não reescritas; consulte os originais na base
> `e01d9d42`): M4 §4.1–4.4 e M5 §5.1–5.4 — `docs/curso-simples/index.html`
> (blob `2bcf99fbd831`); o exemplo executável completo
> `docs/curso-simples/workflow-exemplo/` (`CONTEXTO.md` blob `9fbc21127ea2`,
> `PRD.md` blob `2b4deb2764fe`, `SPEC.md` blob `1d5c696c3bb2`); fixtures
> `docs/curso/workflow_lab/fixtures/05-cycle-05.json` (blob `dee137438663`)
> e `06-cycle-06.json` (blob `90df4afde0c3`). As saídas abaixo foram
> executadas nesta árvore (offline, Python 3.13).

## 1. A disciplina de selecionar contexto (M4, com o caso real do repo)

M4 §4.1 classifica o contexto em três classes — permanente (AGENTS.md e
afins: "vive em arquivo, nunca no chat"), da tarefa (PRD, spec, arquivos
diretamente relacionados, testes e contratos, recorte de erro) e gerado
(diffs, resultados). O checklist §4.2 manda **incluir** ① regras permanentes
② PRD e spec ③ arquivos relacionados por caminho ④ testes e contratos
existentes ⑤ recortes que explicam o problema — e **excluir** build,
dependências, logs sem recorte, segredos, sem relação e views geradas
("elas podem estar erradas mesmo com o código certo — inclua a fonte").

O próprio workflow-exemplo do curso aplicou isso num `CONTEXTO.md` real
(blob `9fbc21127ea2`) — duas tabelas com porquê por linha:

| Incluído | Por quê |
| --- | --- |
| `PRD.md`, `SPEC.md` (desta pasta) | Contrato da entrega |
| `docs/FUNDAMENTOS.md` (repo raiz) | Regras de pedido e robustez que o código deve respeitar |
| `docs/curso/workflow-exemplo/export_tasks.py` | Referência do padrão "núcleo puro" já usado no curso anterior |
| `git log --oneline -20` do repo | Fonte dos commits reais do `demo_commits.json` |

| Excluído | Por quê |
| --- | --- |
| `engines/`, `learner/`, `curriculum/` | Nenhuma relação com gerador de release notes |
| `node_modules`, builds, lockfiles | Ruído; nada de Node nesta feature |
| `.venv`, caches | Ambiente, não contrato |
| Histórico completo do git | 349 commits não cabem nem ajudam; 10 bastam para a demo |

A regra citada no original: "Contexto grande não é contexto bom. Selecionar
é medir qualidade: se um arquivo não muda como esta feature será feita, ele
não entra." E a armadilha paga (§4.4): "Artefato derivado pode mentir — uma
view gerada estava errada com o código-fonte certo".

## 2. A disciplina de fechar PRD/SPEC (M5, com o mesmo caso real)

O PRD real do workflow-exemplo (blob `2b4deb2764fe`) traz o campo mais
subestimado — Fora de escopo — cortando o que o pedido-necessidade não pedia:

```text
## Fora de escopo
- Ler do git diretamente (subprocess, rede, `.git`). O JSON é o contrato de entrada.
- Ordenação por data, deduplicação de hash, multi-repo, changelog acumulativo.
- Qualquer dependência externa (stdlib apenas).
```

E o SPEC real (blob `1d5c696c3bb2`) fecha as decisões **antes** do build —
interface exata, erros de falha fechada e casos de borda numerados:

```python
parse_subject(message: str) -> ParsedCommit | None
generate_release_notes(commits: Iterable[Mapping], version: str | None = None) -> str
```

```text
Erros (falha fechada)
- Lista vazia → ValueError("no commits to release").
- Commit sem `hash` ou sem `message` → ValueError citando o índice.
- Subject fora do padrão → seção "Fora do padrão", nunca descarte.
```

M5 §5.3 resume o efeito: "cada critério de aceite virou um teste; cada regra
de erro virou um `pytest.raises`. **Critério de aceite é um teste em
linguagem humana.** Se você não consegue imaginar o teste, o critério ainda
está vago."

**Executado agora, nesta árvore** (o ACEITE de um pacote bom continua
decidindo depois que o trabalho acabou):

```
$ cd docs/curso-simples/workflow-exemplo
$ python3 -m pytest test_release_notes.py -q
......................                                                   [100%]
22 passed in 0.12s
exit=0
```

## 3. O precedente dos gates: DAG e renomes são trabalhos SEPARADOS (workflow_lab ciclos 05–06)

A sua tentativa usa um pedido fictício de ordenação por dependência + dois
extras. O workflow_lab do repo resolve exatamente essas duas famílias **em
ciclos separados**, cada um com seu gate (SPEC do lab, blob `82c2b93539b7`:
ciclo 05 — gate "referências válidas e DAG"; ciclo 06 — gate "caminhos
canônicos; fonte e destino válidos"). Execução real completa nesta árvore:

```
$ python3 docs/curso/workflow_lab/lab.py \
    --fixtures docs/curso/workflow_lab/fixtures --output "$(mktemp -d)/lab"
{"cycles_completed": ["cycle-00", "cycle-01", "cycle-02", "cycle-03", "cycle-04",
 "cycle-05", "cycle-06", "cycle-07", "cycle-08", "cycle-09", "cycle-10"],
 "ledger": "learning.ndjson", "report": "report.md"}
exit=0

$ python3 -m pytest docs/curso/workflow_lab -q
........................................                                 [100%]
112 passed in 1.28s
```

Os artefatos reais produzidos (determinísticos, byte a byte):

```json
{"critical_duration_minutes": 9, "order": ["fetch", "lint", "build", "test", "package"]}
```

```json
{"dry_run": true, "operations": [{"from": "docs/a.txt", "to": "archive/a.txt"},
 {"from": "docs/b.txt", "to": "archive/b.txt"}]}
```

Leitura para a sua tentativa: (i) o ciclo 05 valida o plano **completo**
antes de emitir artefato — dependência inexistente ou ciclo fecha em erro no
preflight, não vira ordem silenciosamente quebrada (é o molde das suas
decisões B1/B2); (ii) o ciclo 06 é um **outro** trabalho (renomes em
dry-run), com gate próprio — o precedente de que "aproveitar e renomear
docs/" é entrega separada, não apêndice da ordenação; (iii) a duração
total (`critical_duration_minutes`) mostra o que "somar o dia" significa em
saída verificável.

## 4. O molde aplicado ao seu caso (rodadia)

A sua tentativa faz com o e-mail da Bia o que §1–§2 mostram com release
notes: (a) duas tabelas com porquê — incluindo regras permanentes
(`AGENTS.md` do repo fictício) e o contrato/testes existentes, excluindo a
view gerada e o `.env.example`; (b) PRD com limite de 30 min e Fora de
escopo nomeando ≥2 das cinco entregas embutidas; (c) SPEC decidindo B1/B2/B3
pelo padrão de falha fechada do §2 e com allowlist de arquivos. O verificador
mecânico (`insumos/verifica_contexto_spec.py`) checa o piso desse molde; a
substância é da rúbrica.
