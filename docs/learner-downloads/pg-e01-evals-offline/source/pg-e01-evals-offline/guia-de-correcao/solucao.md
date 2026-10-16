# pg-e01 — Guia de correcao (consulte APÓS a tentativa)

Separacao deliberada: o enunciado nao referencia este diretorio. A
solucao tem tres gabaritos (`criterios-referencia.md`,
`proposta-referencia.md`, `testes.py` com 9 checks determinísticos
positivos+negativos) e as saídas reais da execucao completa abaixo,
capturadas nesta arvore (worktree `aid3648/u13-evals-offline`, base
`86fca779` = `origin/main`, Python 3.13, sem rede; AID-3648).

## Passo 0 — Criterios congelados (ver gabarito)

Ver `criterios-referencia.md`. Regra de decisao congelada antes das
saidas: B sobe se delta agregado > 0 E nenhuma fatia com n >= 3 piorar.

## Passo 1 — Scorer no conjunto base (24 casos, sinteticos)

```
$ python3 insumos/fixture/metricas.py comparar \
    --casos insumos/fixture/casos_base.json \
    --A insumos/fixture/saidas_A_base.json --B insumos/fixture/saidas_B_base.json
scorer=metricas.py fatia=area casos=24
A=insumos/fixture/saidas_A_base.json
B=insumos/fixture/saidas_B_base.json
area             n A         B         delta
conta            5    3/5       4/5    +0.200
pagamento        6    5/6       2/6    -0.500
tecnico          8    6/8       8/8    +0.250
uso              5    3/5       4/5    +0.200
GERAL           24   17/24     18/24   +0.042
VEREDITO: agregada +0.042 COM regressao de fatia: pagamento (-0.500, n=6)
FLAG_REGRESSAO_ESCONDIDA=1
exit=0
```

Diagnostico gabarito: a alegacao da proponente (18 vs 17) era verdadeira
no agregado e falsa por fatia — `tecnico` +0.250 (2 acertos) e
`conta`/`uso` +0.200 pagam `pagamento` −0.500 (3 perdas: PD-011,
PD-013, PD-014). Pela regra congelada (fatia com n>=3 piorando): **B
nao sobe**. Mecanica, caso a caso (conferir sempre nos fixtures): o
desempate "escolha `tecnico`" captura PD-011 ("Erro 500 ao tentar
pagar") e PD-013 ("Cartao declinado..."), que mencionam erro/sistema;
PD-014 ("Como atualizo o cartao de cobranca da empresa no painel?"),
sem mencao a erro, e desviado para `conta` pela leitura parcial do 1o
paragrafo — nao sao 3 casos de desempate para `tecnico`. PD-012
("fatura com valor errado") ja era erro de A (A=`tecnico`,
B=`tecnico`): contribui 0 para o delta e fica fora da lista.

## Passo 2 — Proposta v2.1 (ver gabarito)

Diff exato, por-que, preservacao e riscos em `proposta-referencia.md`.
Registro com hash ANTES de abrir o heldout (disciplina `c-proposta`).

## Passo 3 — Heldout: casos NOVOS (12, ids PD-H*)

A vs B (o diagnostico se reproduz em dados novos?):

```
$ python3 insumos/fixture/metricas.py comparar \
    --casos insumos/fixture/heldout/casos_heldout.json \
    --A insumos/fixture/heldout/saidas_A_heldout.json \
    --B insumos/fixture/heldout/saidas_B_heldout.json
scorer=metricas.py fatia=area casos=12
A=insumos/fixture/heldout/saidas_A_heldout.json
B=insumos/fixture/heldout/saidas_B_heldout.json
area             n A         B         delta
conta            3    2/3       2/3    +0.000
pagamento        3    2/3       0/3    -0.667
tecnico          4    3/4       4/4    +0.250
uso              2    1/2       2/2    +0.500
GERAL           12    8/12      8/12   +0.000
VEREDITO: agregada +0.000 COM regressao de fatia: pagamento (-0.667, n=3)
FLAG_REGRESSAO_ESCONDIDA=1
exit=0
```

Sim: agregada igual (8/12 = 8/12) com `pagamento` morta (0/3) — segunda
forma da ilusao (agregada estacionaria escondendo troca).

B vs C (a correcao de referencia recupera sem derrubar nada?):

```
$ python3 insumos/fixture/metricas.py comparar \
    --casos insumos/fixture/heldout/casos_heldout.json \
    --A insumos/fixture/heldout/saidas_B_heldout.json \
    --B insumos/fixture/heldout/saidas_C_heldout.json
scorer=metricas.py fatia=area casos=12
A=insumos/fixture/heldout/saidas_B_heldout.json
B=insumos/fixture/heldout/saidas_C_heldout.json
area             n A         B         delta
conta            3    2/3       2/3    +0.000
pagamento        3    0/3       3/3    +1.000
tecnico          4    4/4       4/4    +0.000
uso              2    2/2       2/2    +0.000
GERAL           12    8/12     11/12   +0.250
VEREDITO: nenhuma regressao de fatia oculta pela agregada
FLAG_REGRESSAO_ESCONDIDA=0
exit=0
```

## Passo 4 — Checks deterministicos do pacote (positivos + negativos)

```
$ python3 guia-de-correcao/testes.py
ok test_contrato_ids_negativo
ok test_agregada_melhora_no_base
ok test_regressao_oculta_no_base
ok test_sem_falso_positivo_a_vs_a
ok test_heldout_disjunto_do_base
ok test_heldout_agregada_igual_fatia_morre
ok test_variante_c_recupera_sem_regressao
ok test_todos_fixtures_rotulados_sinteticos
ok test_perdas_pagamento_gabarito_confere_com_fixtures
9 testes passaram
exit=0
```

## Passo 5 — Takeaway gabarito

(a) O "18 vs 17" era verdadeiro e enganoso: media melhorou porque duas
fatias ganharam enquanto `pagamento` (dinheiro do cliente) colapsou —
agregado sem fatia e promessa, nao medicao. (b) A rotina que impediu a
promocao errada: criterios congelados com hash antes das saidas, fatia
minima na regra de decisao, heldout aberto so apos a proposta, e
veredito do scorer proprio — nunca da palavra de quem fez a mudanca.

## Limites da correcao de referencia (declarar ao avaliar)

- C e sintetica e fixada pelo AUTOR DO PACOTE: valida o desenho da
  regra em 12 casos novos sinteticos; nao e prova de eficacia em uso
  real nem verificacao independente da proposta do ALUNO.
- Provar a correcao do aluno exige pipeline com casos reais novos e
  verificador independente do autor da mudanca (fora do escopo offline).
