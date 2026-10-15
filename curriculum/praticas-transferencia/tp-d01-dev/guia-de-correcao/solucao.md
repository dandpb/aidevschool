# Guia de correção TP-D01 (dev) — enunciado v1 / rubrica v1

> MATERIAL DO CORRETOR — não entregar junto com o enunciado. Em produção, este
> guia fica fora do pacote do aluno. Código de referência executável em
> `solucao/` (saídas reais registradas abaixo, rodadas first-hand em Python
> 3.13.5, worktree da branch `aid3506/praticas-transferencia` @ base
> `1975e2c7`).

## Defeitos da sugestão contra a spec (gabarito c1)

| # | Violação | Regra da spec | Prova entrada→esperado→obtido |
|---|---|---|---|
| 1 | Tolerância exclusiva (`minutos < 15`) no lugar de inclusiva (`<= 15`) | OBJETIVO item 2 ("até 15 minutos, 15 incluso") | `calcular_tarifa(15, 500, 5000)` → esperado `0` · obtido `500` |
| 2 | Horas **truncadas** (`minutos // 60`) no lugar de horas **iniciadas** (ceil) | OBJETIVO item 3 (16 min=1 h; 61 min=2 h) | `calcular_tarifa(61, …)` → esperado `1000` · obtido `500`; `90 min` → esperado `1000` · obtido `500` |
| 3 | "Cobrança mínima de 1 hora" (`max(1, …)`) — regra **inventada**, não pedida | spec não tem mínimo de cobrança; RESTRIÇÕES/NÃO-META não o autorizam | visível no minuto 15 (cobra 1 h em vez de cortesia); decisão além do contrato apontável mesmo sem input divergente |
| 4 | Teto diário **nunca aplicado** (`teto_diario_centavos` ignorado) | OBJETIVO item 4 (teto por bloco de 24 h iniciado) | `1440 min` → esperado `5000` · obtido `12000`; `1441` → esperado `10000` · obtido `12000`; `1800` → esperado `10000` · obtido `15000` |
| 5 | Contrato de erro ausente (negativo retorna `0`, não `ValueError`) | OBJETIVO item 1 + ACEITE (`-5` lança `ValueError`) | `calcular_tarifa(-5, …)` → esperado `ValueError` · obtido retorno normal `0` |

São 5 violações; a rubrica NÃO exige achá-las todas — exige julgamento com
prova por cada acusação (c1) e vermelho→mínimo→limites (c2–c5). Achado sem
reprodução não pontua; reprodução sem spec citada não pontua.

## Sequência de referência (comandos realmente executados)

Estado inicial — a suíte sugerida está VERDE com os defeitos presentes
(a partir de `tp-d01-dev/fixture/`):

```
$ python3 -m unittest testes_sugeridos -v
test_duas_horas_exatas ... ok
test_hora_exata ... ok
test_meia_hora_cobra_uma_hora ... ok
test_zero_minuto ... ok
----------------------------------------------------------------------
Ran 4 tests in 0.000s

OK
```

Prova da divergência contra o ACEITE da spec (script do corretor):
15→500 (≠0), 16→500 (=ok), 61→500 (≠1000), 1440→12000 (≠5000),
1441→12000 (≠10000), 1800→15000 (≠10000), −5→retorno (≠ValueError).
Verde ilusório: os 4 testes sugeridos só cobrem caminho feliz (1 h, 2 h,
30 min, 0 min) — nenhuma fronteira do contrato.

Vermelho — os testes da spec contra a sugestão original (a partir de
`tp-d01-dev/guia-de-correcao/solucao/`):

```
$ PYTHONPATH=../../fixture python3 -m unittest testes_vermelhos_contra_sugestao
----------------------------------------------------------------------
Ran 7 tests in 0.002s

FAILED (failures=7)
```

Verde — correção mínima (`solucao/tarifa_corrigida.py`):

```
$ python3 -m unittest testes_da_correcao
----------------------------------------------------------------------
Ran 14 tests in 0.001s

OK
```

## Correção mínima de referência (c3)

Ver `solucao/tarifa_corrigida.py`: `raise ValueError` para negativo;
`<=` na tolerância; `ceil` para horas e para blocos de dia; `min(valor,
blocos × teto)`. A "cobrança mínima de 1 hora" foi **removida** (não estava na
spec). Nomes, constantes e docstring preservados; suíte sugerida intocada.

## Casos-limite exigidos (c4) — todos em `solucao/testes_da_correcao.py`

14/15/16 min (tolerância na fronteira) · 59/60/61/90 min (hora iniciada na
virada) · 1439/1440/1441/1800 min (teto no bloco exato e no minuto seguinte)
· −5 min (`ValueError`) · saída `int` (RESTRIÇÕES).

## Limites da cobertura (c5) — modelo de resposta

A suíte verde NÃO prova, entre outros: (1) períodos com **mudança de tarifa**
no meio da permanência (NÃO-META da spec — comportamento simplesmente não
definido); (2) **fuso/DST** (entrada é duração, então o contrato cala — mas um
consumidor que passe timestamps quebraria a premissa); (3) tarifas ou tetos
negativos/zero (o contrato não define; função aceitaria e devolveria 0/valor
estranho); (4) durações gigantes (bloco de teto domina sempre — correto pela
spec, mas sem teste além de 1800 min). Verde diz "o que testei continua
igual", não "nada mais pode dar errado".

## Erros que calibram a rubrica

- Entregar patch certo sem run vermelho → c2 insuficiente.
- Corrigir `tarifa_sugerida.py` no lugar → c3 insuficiente (insumo).
- Reescrever a função/renomear tudo → c3 insuficiente.
- Testar 14 min e achar que cobre o 15 → c4 insuficiente (fronteira é o 15).
- "Cobre tudo, são só contas" → c5 insuficiente.

## Segunda tentativa — regra nova (tarifa noturna)

Spec v2 hipotética acrescenta: "permanências entre 0h e 6h têm desconto de 20%
no bloco noturno, cumulativo com teto". Esperado: repetir julgar→vermelho→
mínimo→limites apenas para a regra nova — sem reabrir o que já estava provado,
e declarando novo limite (ex.: entrada às 5h30 cruzando a janela não é
definida pela regra).
