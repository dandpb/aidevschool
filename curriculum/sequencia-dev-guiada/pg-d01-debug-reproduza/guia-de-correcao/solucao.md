# pg-d01 — Guia de correção (consulte APÓS a tentativa)

Separação deliberada: enunciado não referencia este arquivo. A solução tem
dois arquivos executáveis (`teste_regressao_bug001.py` e `solucao/notas.py`)
e as saídas reais da execução completa, capturadas nesta árvore
(`base d9dbdd5c504e`, Python 3.13, sem rede).

## Passo 1 — Reprodução manual (estado com o bug)

```
$ python3 insumos/fixture/notas.py "Ana 5.5 6.5" "Bia 6.0 6.0" "Caio 7.0 5.0"
Ana média 6.0 — REPROVADO
Bia média 6.0 — REPROVADO
Caio média 6.0 — REPROVADO
exit=0
```

Bug confirmado: média exatamente 6.0 → REPROVADO; REGRA.md item 4 diz
`média >= 6.0` aprova. Caso mínimo isolado: `situacao(6.0) == 'REPROVADO'`
(unidade, sem CLI).

## Passo 2 — Suíte existente verde com o bug presente (latência)

```
$ PYTHONPATH=insumos/fixture python3 insumos/fixture/testes.py
ok test_consolidar_formata_linha
ok test_estudante_sem_notas_erro
ok test_media_simples
ok test_situacao_acima_da_minima
ok test_situacao_bem_abaixo_da_minima
5 testes passaram
exit=0
```

A suíte cobre 7.5 (APROVADO) e 5.0 (REPROVADO) — a fronteira 6.0 não era
monitorada. Suíte verde não provava ausência de bug.

## Passo 3 — Teste de regressão VERMELHO pelo motivo certo

`teste_regressao_bug001.py` cobre a unidade (`situacao(6.0)`) e o ponto do
sintoma (`consolidar(["Bia 6.0 6.0"])`). Contra a fixture original (com bug):

```
$ PYTHONPATH=insumos/fixture python3 guia-de-correcao/teste_regressao_bug001.py
AssertionError: situacao(6.0) deveria ser APROVADO, obtido 'REPROVADO'
exit=1
```

## Passo 4 — Chamadores + correção mínima na causa raiz

Chamadores checados antes de editar: `situacao` tem um único chamador de
produção (`consolidar`, que formata a linha); `media` alimenta `consolidar`.
O contrato "média >= 6.0 aprova" é **restaurado**, não quebrado. Diff de
1 caractere (`solucao/notas.py` vs `insumos/fixture/notas.py`):

```diff
-    if media_final > MEDIA_MINIMA:
+    if media_final >= MEDIA_MINIMA:
```

Patch de sintoma (a recusar): `if nome == "Bia"` ou tratar 6.0 na impressão —
 consertaria o report e deixaria Ana/Caio quebrados.

## Passo 5 — Suíte inteira + regressão verdes; cenário do report corrigido

```
$ PYTHONPATH=guia-de-correcao/solucao python3 insumos/fixture/testes.py
5 testes passaram            (exit=0)

$ PYTHONPATH=guia-de-correcao/solucao python3 guia-de-correcao/teste_regressao_bug001.py
2 testes de regressão passaram   (exit=0)

$ python3 guia-de-correcao/solucao/notas.py "Ana 5.5 6.5" "Bia 6.0 6.0" "Caio 7.0 5.0"
Ana média 6.0 — APROVADO
Bia média 6.0 — APROVADO
Caio média 6.0 — APROVADO
exit=0
```

## Passo 6 — Revisão do diff

```
$ diff insumos/fixture/notas.py guia-de-correcao/solucao/notas.py
24c24
<     if media_final > MEDIA_MINIMA:
---
>     if media_final >= MEDIA_MINIMA:
```

Só o necessário mudou: 1 caractere na causa raiz + o teste novo (2 casos).
Cada linha do diff é necessária para a correção ou para o teste.

## Takeaways esperados (respostas-modelo, para contraste com as suas)

- (a) A suíte verde dizia "o que testei continua igual" — não "nada está
  errado": a fronteira 6.0 não tinha teste, então nada a protegia.
- (b) A reprodução com saída real + esperado-vs-observado fixou qual era o
  problema **antes** de o assistente opinar; sem isso, "melhorar a
  formatação das médias" seria uma resposta plausível e errada.

## Provenance

- Produtor: Curriculum Content Engineer (agente `93e26ea9-8f2a-4f6f-9b82-3591ebc4255c`), tarefa AID-3510.
- Fontes: disciplina dos 5 passos de `dev-workflow-claude/workflows/02-corrigir-bug/RESULTADO.md` (blob `bdfab8fb6160`); lição `l27` (blob `6c9cc6b015d2`); base `d9dbdd5c504e`.
- Todas as saídas acima foram executadas nesta árvore; nenhum passo usa rede.
