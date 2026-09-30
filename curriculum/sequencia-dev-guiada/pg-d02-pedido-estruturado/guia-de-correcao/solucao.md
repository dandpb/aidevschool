# pg-d02 — Guia de correção (consulte APÓS a tentativa)

Separação deliberada: o enunciado não referencia este diretório. Contém o
pedido-modelo nos 5 campos (`pedido-5-campos.md`) e as saídas reais
executadas nesta árvore (base `e01d9d42`, offline, Python 3.13).

## Passo 1 — Evidência do estado atual (passo 1 da tentativa, saída real)

```
$ cd curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado
$ python3 ../../../docs/curso-simples/workflow-exemplo/release_notes.py insumos/meus_commits.json --version v0.9.0
# Release v0.9.0

## ⚠️ Breaking changes
- **ci:** skip pixelDojo games matrix job when no games exist (`35db5c8`)
- matriz sem jogos agora pula o job em vez de falhar a avaliação; pipelines que dependiam da falha explícita devem migrar para o gate de descoberta. (`35db5c8`)

## ✨ Novidades
- **curso:** workflow lab + course page validators and skill pack (`1cf2271`)
- AI dev workflow teaching page + tested workflow library (`e63f0f0`)
- **codexdojo-os:** pilot static deploy, repo hygiene guards, public LiteracyDojo entry (`f4fa2dc`)
- **ci:** skip pixelDojo games matrix job when no games exist (`35db5c8`)

## 🐛 Correções
- priorities round 2 — CI pilot smoke, atomic gate manifest, catalog truth (`1155dcb`)
- **ci:** fix main red — voxelDojo biome lint + literacyDojo lockfile (`96c4d9d`)

## 📦 Outras mudanças
- **refactor:** table-driven analytics policies + gates (`c82b686`)
- **refactor:** split ai-literacy validator into modules + CC gate (`697c056`)
- **docs:** priorities report (top 10 + 3 tested cases) and static course page (`a1efd80`)
- **ci:** trigger fresh run (previous run record stuck on stale conclusion after rerun) (`62743d6`)

## 🔍 Fora do padrão
- Merge branch 'main' of github.com:dandpb/aidevschool (`7aaa182`)
exit=0
```

Leitura da amostra (11 commits): 4 `feat`, 2 `fix`, 2 `refactor`, 1 `docs`,
1 `ci`, 1 fora do padrão (merge); 1 commit é breaking pelas DUAS formas
(`feat(ci)!:` + footer `BREAKING CHANGE:`). São exatamente os ingredientes
de B1 e B2.

## Passo 2 — O pedido-modelo executado HOJE (passo 5 da tentativa, saídas reais)

O ACEITE do pedido-modelo (`guia-de-correcao/pedido-5-campos.md`), executado
na árvore atual — ou seja, **antes** de qualquer implementação:

```
$ cd docs/curso-simples/workflow-exemplo
$ python3 -m pytest test_release_notes.py -q
......................                                                   [100%]
22 passed in 0.12s
exit=0            ← suíte atual verde (e ainda sem nenhum teste do --types)

$ python3 release_notes.py ../../curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado/insumos/meus_commits.json --types feat,fix
usage: release_notes.py [-h] [--version VERSION] commits_json
release_notes.py: error: unrecognized arguments: --types feat,fix
exit=2            ← falha pelo motivo certo: a mudança pedida não existe
```

É este o estado que um ACEITE bom torna visível: hoje ele não passa — e o
pedido diz exatamente o que precisa mudar para passar (incluindo testes
novos na suíte).

## Passo 3 — Auto-check mecânico do pedido-modelo

```
$ python3 insumos/verifica_pedido.py guia-de-correcao/pedido-5-campos.md
campos: 5/5
veredito: met
exit=0

$ python3 insumos/verifica_pedido.py --caminhos guia-de-correcao/pedido-5-campos.md
ok caminho curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado/insumos/meus_commits.json
ok caminho docs/curso-simples/workflow-exemplo/release_notes.py
ok caminho docs/curso-simples/workflow-exemplo/test_release_notes.py
veredito: met
exit=0

$ python3 insumos/verifica_pedido.py insumos/pedido-original.md
FALHA campo vazio ou ausente: CONTEXTO
FALHA campo vazio ou ausente: OBJETIVO
FALHA campo vazio ou ausente: RESTRIÇÕES
FALHA campo vazio ou ausente: ACEITE
FALHA campo vazio ou ausente: NÃO-META
campos: 0/5
veredito: not_met
exit=1           ← o detector discrimina: o pedido-romance não passa
```

## Passo 4 — Vereditos de referência para B1/B2 (critério c7)

Contra o pedido-modelo (ver `pedido-5-campos.md`, RESTRIÇÕES item 3 e
ACEITE item 4):

- **B1 (`docs:` com filtro `feat,fix`)** → **fora das seções de mudanças,
  mas não silencioso**: o commit não ganha linha em seção nenhuma E a
  última linha do relatório declara `filtro: feat,fix — N commits não
  exibidos`. Decide o RESTRIÇÕES ("nenhum commit descartado
  silenciosamente", cita o PRD) + o ACEITE (item 4, a linha do filtro).
- **B2 (commit selecionado com breaking)** → **dentro: a seção ⚠️ Breaking
  changes permanece**. O filtro restringe *quais mudanças são listadas*,
  não *sinais de segurança*: `35db5c8` é `feat` (selecionado) e breaking
  pelas duas formas — as 2 linhas da seção ⚠️ continuam presentes. Decide o
  OBJETIVO ("restringe as seções de **tipos**") + o ACEITE (item 2,
  `grep -c '^## '` → 3).

Outras decisões são defensáveis (ex.: suprimir breaking não-selecionado com
contagem separada). O critério c7 exige que A decisão esteja escrita e
decida os dois casos — não que seja idêntica ao modelo.

## Passo 5 — Erros plausíveis de esperar (para o corretor)

- **ACEITE vago**: "pytest passa" sem dizer que a suíte precisa incluir
  testes NOVOS do filtro — passa hoje, não decide nada (c4 `not_met`).
- **NÃO-META espantalho**: "não reescrever o sistema inteiro" — ninguém
  pediu isso; o Slack/hide-breaking do pedido-original fica solto (c6
  `not_met`).
- **Cair na armadilha do Rafa**: "sumir com os commits esquisitos" aceito
  sem checar o contrato — o PRD veda descarte silencioso; ou vira
  NÃO-META explícito ou ganha contagem visível (c5).
- **B1/B2 sem dono**: o pedido não diz o que acontece com `docs:` nem com
  breaking filtrado — revisor precisa perguntar (c7 `not_met`).
- **CONTEXTO descrição**: "no arquivo que gera as notas" em vez do caminho
  (c2) — ambiguidade de referência é a fonte nº 1 de retrabalho (M3
  regra 5).
- **Duas entregas**: filtro + "deixar breaking mais gritante" no mesmo
  OBJETIVO (c3) — encadear pedidos, não escopos (M3 regra 1).

## Takeaways esperados (respostas-modelo, para contraste com as suas)

- (a) A decisão mais perigosa era o destino dos commits NÃO selecionados
  (B1): sem ela, o caminho estatisticamente comum é descartar — exatamente
  o que o contrato do PRD veda; o pedido teria produzido código que
  quebra um critério de aceite existente.
- (b) O ACEITE: ao exigir comando executável + saída esperada, ele expôs o
  que o pedido-romance escondia — "mostrar só isso" só vira entrega quando
  alguém escreve o `grep -c '^## '` que prova o "só".
