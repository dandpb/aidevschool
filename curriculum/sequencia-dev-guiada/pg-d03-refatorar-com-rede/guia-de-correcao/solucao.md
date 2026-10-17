# pg-d03 — Guia de correção (consulte APÓS a tentativa)

Este guia é **separado** do enunciado de propósito: nada no caminho do
aluno o referencia. Contém: (1) a caracterização de referência, (2) a
armadilha aplicada (o contraexemplo executável), (3) a solução de
referência em passos pequenos, com as saídas reais de cada verificação,
executadas first-hand na árvore desta entrega (worktree
`/paperclip/tmp/wt-aid3562`, base `e01d9d42`, offline, Python 3 padrão).
Nenhum resultado de aluno é relatado ou presumido aqui.

## 1. Caracterização de referência (`caracterizacao/teste_caracterizacao.py`)

Cobre exatamente os observáveis do `CONTRATO.md` que a suíte existente
não enxerga (a suíte nunca mistura dois problemas no mesmo pedido e nunca
olha a trilha de um rejeitado):

- `caracteriza_c2_prioridade_de_erro` — C2: em `[("cafe", -1),
  ("pizza", 1)]` o erro tem que ser `produto desconhecido: pizza`;
- `caracteriza_c3_auditoria_de_rejeitado` — C3: rejeição deixa
  exatamente `[("pedido-iniciado", 1)]` na trilha;
- `caracteriza_c3_auditoria_de_cupom_invalido` — C3 também vale para
  rejeição de cupom.

## 2. A armadilha, executada (`armadilha/pedidos.py` = proposta aplicada)

Saídas reais (comandos colados; executados a partir do diretório do
pacote):

```
$ PYTHONPATH=guia-de-correcao/armadilha python3 insumos/fixture/testes.py
ok test_auditoria_registra_sucesso_em_ordem
ok test_cupom_invalido_com_itens_validos
ok test_produto_desconhecido_sozinho
ok test_quantidade_invalida_sozinha
ok test_total_composto_com_cupom
ok test_total_simples
6 testes passaram                          # ← a suíte existente APROVA

$ PYTHONPATH=guia-de-correcao/armadilha python3 guia-de-correcao/caracterizacao/teste_caracterizacao.py
ValueError: quantidade invalida: cafe=-1
AssertionError: C2 violada: ordem de erro trocada — obtido: 'quantidade invalida: cafe=-1'
exit=1                                      # ← o contrato VIOLADO

$ PYTHONPATH=guia-de-correcao/armadilha python3 -c "
import pedidos
try:
    pedidos.fechar_pedido([('pizza', 1)])
except ValueError:
    pass
print('AUDITORIA apos rejeicao:', pedidos.AUDITORIA)"
AUDITORIA apos rejeicao: []                 # ← C3 violada: linha sumiu
```

**O contraexemplo que o aluno deve observar:** a proposta passa 6/6 na
suíte existente e, ao mesmo tempo, (a) troca a **ordem de erro** (valida
item a item na ordem da lista — "um loop em vez de três") e (b) apaga o
**efeito colateral** da trilha ("auditoria só de pedidos válidos"). As
duas justificativas da proposta até soam razoáveis — e é exatamente por
isso que o veredito vem do contrato caracterizado, não da narrativa.
"Suíte verde" aqui não provou ausência de regressão; provou apenas que a
regressão mora fora da cobertura.

## 3. Solução de referência em 3 passos (`solucao/pedidos.py`)

Cada passo executado com suíte + caracterização verdes no meio (saídas
reais; `passoN.py` abaixo são os estados intermediários reais usados
neste recibo):

**Passo 1 — extrair validação preservando a prioridade (C2) e a trilha
(C3):** `_validar_itens` (todos os produtos, depois todas as quantidades
— a prioridade continua não seguindo a ordem da lista), `_validar_cupom`;
`AUDITORIA.append(("pedido-iniciado", …))` permanece a PRIMEIRA linha de
`fechar_pedido`.

```
$ python3 testes.py                 → 6 testes passaram
$ python3 teste_caracterizacao.py   → 3 caracterizacoes passaram
```

**Passo 2 — eliminar o loop de soma:** `total = sum(…)` no lugar do
`for … total = total + …`.

```
$ python3 testes.py                 → 6 testes passaram
$ python3 teste_caracterizacao.py   → 3 caracterizacoes passaram
```

**Passo 3 — extrair `formatar_real`:** o `if/else` de formatação sai de
`fechar_pedido` e vira função própria.

```
$ python3 testes.py                 → 6 testes passaram
$ python3 teste_caracterizacao.py   → 3 caracterizacoes passaram
```

`solucao/pedidos.py` é o output exato do passo 3 (byte a byte). Diff
completo original → solução (o da entrega; `-u`, executado no pacote):

```diff
--- insumos/fixture/pedidos.py
+++ guia-de-correcao/solucao/pedidos.py
@@
-def fechar_pedido(itens, cupom=None):
-    AUDITORIA.append(("pedido-iniciado", len(itens)))
+def _validar_itens(itens):
     for produto, _ in itens:
         if produto not in CATALOGO:
             raise ValueError("produto desconhecido: %s" % produto)
     for produto, qtd in itens:
         if qtd <= 0:
             raise ValueError("quantidade invalida: %s=%d" % (produto, qtd))
+
+
+def _validar_cupom(cupom):
     if cupom is not None and cupom not in CUPONS:
         raise ValueError("cupom invalido: %s" % cupom)
-    total = 0.0
-    for produto, qtd in itens:
-        total = total + CATALOGO[produto] * qtd
+
+
+def formatar_real(total):
+    if total == int(total):
+        return "R$ %d,00" % int(total)
+    return "R$ " + ("%.2f" % total).replace(".", ",")
+
+
+def fechar_pedido(itens, cupom=None):
+    AUDITORIA.append(("pedido-iniciado", len(itens)))
+    _validar_itens(itens)
+    _validar_cupom(cupom)
+    total = sum(CATALOGO[produto] * qtd for produto, qtd in itens)
     if cupom is not None:
         total = total * (1.0 - CUPONS[cupom])
-    texto = "R$ "
-    if total == int(total):
-        texto = texto + "%d,00" % int(total)
-    else:
-        texto = texto + ("%.2f" % total).replace(".", ",")
     AUDITORIA.append(("pedido-fechado", total))
-    return texto
+    return formatar_real(total)
```

O que o pedido pedia (validação extraída, loops deduplicados, formatação
fora do `fechar_pedido`) e **nada mais**: nenhuma linha de `testes.py`
mudou; nenhuma mensagem, prioridade ou linha de auditoria mudou.

## 4. Verificação final (re-executável pelo revisor, a partir do pacote)

```
$ PYTHONPATH=insumos/fixture python3 insumos/fixture/testes.py
6 testes passaram                                              # baseline
$ PYTHONPATH=insumos/fixture python3 guia-de-correcao/caracterizacao/teste_caracterizacao.py
3 caracterizacoes passaram                                     # rede fechada
$ PYTHONPATH=guia-de-correcao/solucao python3 insumos/fixture/testes.py
6 testes passaram
$ PYTHONPATH=guia-de-correcao/solucao python3 guia-de-correcao/caracterizacao/teste_caracterizacao.py
3 caracterizacoes passaram                                     # contrato vivo
```

`insumos/fixture/testes.py` não é tocado em nenhum passo nem no diff do PR
(sha256 nesta entrega:
`28ad46c4bcb5650dbf156fe42093f1a8ed0093a781ad64aa6c122c23a9ac5014`).

Smoke observável (original e solução, saídas idênticas):

```
$ PYTHONPATH=insumos/fixture python3 -c "import pedidos; print(pedidos.fechar_pedido([('cafe',2)]))"
R$ 24,00
$ PYTHONPATH=guia-de-correcao/solucao python3 -c "import pedidos; print(pedidos.fechar_pedido([('arroz',2),('feijao',1)], cupom='BEM10'))"
R$ 18,90
```

## 5. Erros plausíveis do aluno (para quem corrige)

- **Aplicar a proposta e parar na suíte verde** — não executou o passo 3
  da tentativa; a rúbrica reprova em `c3-armadilha-executada` (e o
  contrato, em C2/C3).
- **Caracterização escrita contra o comportamento *desejado*** (ex.:
  exigir trilha vazia na rejeição) — fica vermelha no ORIGINAL; sinal de
  que descreveu a proposta, não o comportamento atual.
- **Editar `testes.py` para "reforçar"** — viola a regra 4 do wf 03;
  caracterização é arquivo novo.
- **Reverter errado**: passo vermelho "consertado pra frente" com um
  `try/except` para calar a caracterização — a regra é reverter o passo e
  refazê-lo preservando a cláusula.
- **Veredito por narrativa** ("parece mais limpo, deve estar certo") —
  `c4-veredito-fundamentado` exige cláusula citada.
