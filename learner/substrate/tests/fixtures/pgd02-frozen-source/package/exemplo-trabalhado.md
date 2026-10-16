# pg-d02 — Exemplo trabalhado: pedido fechado antes de o modelo decidir (fontes reais do repo)

> **Fontes primárias** (não reescritas; consulte os originais):
> M3 §3.1–3.4 — `docs/curso-simples/index.html` (blob `2bcf99fbd831`);
> PRD/SPEC do exemplo executável — `docs/curso-simples/workflow-exemplo/`
> (`PRD.md` blob `2b4deb2764fe`, `SPEC.md` blob `1d5c696c3bb2`,
> `release_notes.py` blob `8bbe0fdffcf5`).
> As saídas abaixo foram executadas nesta árvore (offline).

## O protocolo (M3 §3.1, citação)

```text
CONTEXTO:    onde mexer — caminhos de arquivo, não descrições
OBJETIVO:    um resultado observável (um só)
RESTRIÇÕES:  o que não pode mudar; limites (sem lib nova, não tocar em X)
ACEITE:      o comando que prova que ficou pronto
NÃO-META:    o que fica de fora desta entrega
```

> "Cada campo omitido vira uma decisão que o modelo toma pelo caminho
> estatisticamente comum, não pelo seu. O ACEITE é o campo mais importante:
> ele transforma 'pronto' de opinião em fato verificável." (M3 §3.1)

M3 §3.2 mostra o contraexemplo completo: o "pedido-romance" do sistema de
tarefas (exportar pra planilha + botão + "aproveita e vê o login") virou um
pedido de 5 campos com um objetivo só e `NÃO-META: endpoint HTTP e
persistência`. Leia o original — é o molde da sua tentativa.

## O caso real do repo: o workflow-exemplo foi um pedido assim

O próprio exemplo executável do curso nasceu de PRD + SPEC no formato da
disciplina — os campos que M3 ensina aparecem lá com nomes de documento:

- **OBJETIVO + RESTRIÇÕES** (`PRD.md`): "gerar notas de release em Markdown,
  agrupadas por tipo, com breaking em destaque e sem descartar commits fora
  do padrão"; "fora de escopo: ler do git diretamente … qualquer
  dependência externa (stdlib apenas)".
- **ACEITE** (`PRD.md` §Critérios de aceite): `pytest test_release_notes.py`
  cobrindo agrupamento, breaking por `!` e por footer, fora do padrão, lista
  vazia, versão no título — e "a soma de entradas nas seções equals o número
  de commits de entrada".
- **NÃO-META** (`SPEC.md` §Não-metas): "Não ler `.git`. Não ordenar por
  data. Não deduplicar. Não internacionalizar."

**Executado agora, nesta árvore** (o ACEITE de um pedido bom continua
decidindo depois que o trabalho acabou):

```
$ cd docs/curso-simples/workflow-exemplo
$ python3 -m pytest test_release_notes.py -q
......................                                                   [100%]
22 passed in 0.12s
exit=0

$ python3 release_notes.py demo_commits.json --version v2026.08 | grep -c '^- '
20
$ python3 release_notes.py demo_commits.json --version v2026.08 | grep '^## '
## ✨ Novidades
## 🐛 Correções
## 📦 Outras mudanças
## 🔍 Fora do padrão
```

20 entradas para 20 commits de entrada — nenhum commit descartado
silenciosamente (9 fora do padrão, visíveis na própria seção), 4 seções,
breaking em destaque. O contrato do PRD, verificado por comando — não por
opinião.

## O que o exemplo ensina para a sua tentativa

1. **CONTEXTO por caminho**: o PRD não diz "no programa que gera as notas";
   diz `release_notes.py`, `test_release_notes.py`, `demo_commits.json`
   (SPEC §Arquivos permitidos).
2. **RESTRIÇÕES vêm do contrato existente**, não de inventário: stdlib,
   determinismo, "nenhum commit descartado silenciosamente" já estavam
   escritos no PRD/SPEC — o pedido novo **cita**, não reinventa.
3. **ACEITE com comando e saída esperada**: "pytest passa cobrindo…" lista
   o que o teste precisa cobrir; hoje ele roda e decide em 0.12s.
4. **NÃO-META mata a segunda entrega**: ler do git, ordenar por data,
   Slack, botão — fora, por escrito, na hora do pedido.

A sua tentativa aplica isto ao pedido do Rafa (`insumos/pedido-original.md`)
sobre o mesmo código — com uma decisão extra que o exemplo não precisou
tomar: o que o filtro faz com o que **não** foi escolhido (B1) e com o
breaking (B2). É aí que se vê se o pedido fecha decisões ou as adia.
