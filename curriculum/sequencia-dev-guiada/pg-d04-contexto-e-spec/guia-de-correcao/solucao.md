# pg-d04 — Guia de correção (consulte APÓS a tentativa)

Separação deliberada: o enunciado não referencia este diretório. Contém a
solução-modelo (`solucao/CONTEXTO.md`, `PRD.md`, `SPEC.md`), quatro
contraexemplos que o verificador rejeita (um por família de falha) e as
saídas reais executadas nesta árvore (base `e01d9d42`, offline, Python 3.13).

## Passo 1 — O veredito mecânico da solução-modelo (saída real)

```
$ cd curriculum/sequencia-dev-guiada/pg-d04-contexto-e-spec
$ python3 insumos/verifica_contexto_spec.py guia-de-correcao/solucao
falhas: 0
veredito: met
exit=0
```

## Passo 2 — Os quatro negativos rejeitados (saídas reais)

```
$ python3 insumos/verifica_contexto_spec.py guia-de-correcao/contraexemplos/01-contexto-ruidoso
FALHA contexto/incluido: categoria de exclusão do checklist M4 §4.2 citada como incluída: node_modules/
FALHA contexto/incluido: categoria de exclusão do checklist M4 §4.2 citada como incluída: relatorios/plano.view.md
FALHA contexto/incluido: caminho fora do inventário: arquivado/
FALHA contexto/incluido: categoria de exclusão do checklist M4 §4.2 citada como incluída: logs/app.log
falhas: 4
veredito: not_met
exit=1

$ python3 insumos/verifica_contexto_spec.py guia-de-correcao/contraexemplos/02-prd-sem-limite
FALHA prd: limite da tarefa (30 min) não declarado
FALHA prd: Fora de escopo com 1 item(ns) (mín 2 extras embutidos no pedido)
falhas: 2
veredito: not_met
exit=1

$ python3 insumos/verifica_contexto_spec.py guia-de-correcao/contraexemplos/03-aceite-vago
FALHA prd: 2 critério(s) de aceite (mín 3)
FALHA prd: aceite vago (<4 palavras): - [ ] Ficar bonito.
FALHA prd: nenhum critério de aceite cita comando executável (python3/pytest)
falhas: 3
veredito: not_met
exit=1

$ python3 insumos/verifica_contexto_spec.py guia-de-correcao/contraexemplos/04-spec-aberta
FALHA spec: 1 caso(s) de borda numerado(s) (mín 3: B1/B2/B3)
FALHA spec: Arquivos permitidos sem caminhos (allowlist)
FALHA spec: Não-metas ausente ou sem itens
FALHA spec/bordas: B1 (ciclo em depends_on) não decidida
FALHA spec/bordas: B2 (dependência inexistente) não decidida
FALHA spec/bordas: B3 (lista vazia) não decidida
falhas: 6
veredito: not_met
exit=1
```

## Passo 3 — Suíte determinística do verificador (saída real)

```
$ python3 guia-de-correcao/teste_verificador.py
passou: positivo: solucao-modelo
passou: negativo: contexto com ruido e fora do inventario
passou: negativo: prd sem limite e sem cortes
passou: negativo: aceite vago
passou: negativo: spec aberta sem allowlist
passou: negativo: uso invalido
6 testes passaram
exit=0
```

## Leitura da solução-modelo, por critério da rúbrica

- **c1/c2 (contexto):** a solução inclui regra permanente (`AGENTS.md`),
  núcleo/modelo/contrato/suíte (`plano.py`, `tarefa.py`, `CONTRATO.md`,
  `testes/teste_plano.py`) e amostra fixa (`exemplos/tarefas.json`) — o
  checklist M4 §4.2 ①–④ completo; exclui a view gerada (M4 §4.4: "artefato
  derivado pode mentir"), `cli.py` (interface preservada) e todo o ruído.
  Contraexemplo 01 mostra o caso reprovado: "bibliotecas podem ser
  relevantes em geral" não é justificativa **para esta tarefa**; "é só
  seguir a view" é exatamente a armadilha paga do journal (§4.4).
- **c3 (limite 30 min):** o PRD da solução declara o limite em seção
  própria e o Escopo nomea UMA entrega (ordenação + total). O contraexemplo
  02 mantém as cinco entregas no Objetivo/Escopo sem limite — "resolver o
  pedido da Bia" inteiro não cabe em 30 min e o verificador rejeita.
- **c4 (fora de escopo real):** a solução corta renomeação (com o
  precedente do workflow_lab: renomes são ciclo separado do DAG), relatório
  colorido e Windows, cada um com motivo. O contraexemplo 02 corta só 1 —
  não fecha a aritmética dos 5 extras embutidos.
- **c5 (aceite verificável):** os 4 critérios da solução são testes em
  linguagem humana (suíte cobrindo B1/B2/B3; comando CLI offline
  determinístico; invariante linha a linha; falha fechada citando `id`s).
  O contraexemplo 03 é o "não quebrar nada"/"ficar bonito" do pedido
  original — vagueza rejeitada mecanicamente.
- **c6 (SPEC fecha decisões):** interface exata, 5 bordas numeradas
  decidindo B1/B2/B3 pela doutrina de falha fechada (mesma do SPEC real do
  workflow-exemplo), allowlist de 2 arquivos (é o que impede a "solução que
  extrapola SPEC": mexer em `cli.py`/docs/ já é violação contratual),
  não-metas, estratégia e ordem. O contraexemplo 04 deixa tudo aberto.
- **c7 (recibo honesto):** as contagens esperadas do passo 1 do enunciado:
  **5 entregas embutidas** (ordenação, total, renomear docs/, cores,
  Windows) e **decisões implícitas** B1/B2/B3 + "não quebrar nada" +
  Windows. Alternativas fundamentadas são aceitas (ver notas da rúbrica):
  incluir `cli.py` com justificativa de mudança de saída é defensável;
  incluir `testes/teste_tarefa.py` não muda a decisão da tarefa e tende a
  ser `partial`, não `met`, em c1.

## Limites do guia

O modelo é referência de correção, não resposta única: a rúbrica aceita
alternativas fundamentadas que cumpram os objetivos observáveis (a)-(c).
Este guia não afirma eficácia da prática nem resultado de alunos.
