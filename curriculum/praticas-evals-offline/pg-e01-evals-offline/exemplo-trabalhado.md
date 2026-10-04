# pg-e01 — Exemplo trabalhado: agregada igual, fatia morta (TrilhaFit [SINTETICO])

> **Fonte dos dados:** fixtures sinteticas proprias deste pacote em
> `exemplo/` (issues ficticias do app TrilhaFit; nenhum modelo de IA foi
> executado; nenhum benchmark real e alegado). Todas as saidas abaixo
> foram capturadas executando `insumos/fixture/metricas.py` nesta arvore
> (comandos reproduziveis no fim de cada passo).

## O caso

O time do TrilhaFit (ficticio) usa um LLM para triar issues em `bug`,
`duvida` ou `melhoria`. O prompt v2 proposto dizia: "SEJA DIRETO...
Em caso de duvida entre duas areas, escolha `bug`". A pessoa que propôs
defendeu: "acuracia igual a do v1 (8/12), codigo menor, sobe".

## Passo 0 — Criterios ANTES das saidas (congelados com hash)

Exemplo preenchido (resumo; gabarito completo do formulario em
`guia-de-correcao/criterios-referencia.md`):

- **Metrica principal:** acuracia (corretos/total) por variante.
- **Decomposicao obrigatoria:** por fatia `area` (as 3 classes) — toda
  decisao cita agregado E fatias.
- **Regra de decisao:** v2 so sobe se delta agregado > 0 **E** nenhuma
  fatia com n >= 2 piorar; delta 0 no agregado nao e "sem mudanca".
- **Particoes:** base = analise; heldout so apos proposta registrada.
- **Evidencia independente:** alegacao do proponente = entrada, nunca
  verificacao; o veredito vem do scorer rodado por quem decide.

```
$ sha256sum meus-criterios.md
3f9a...c1  meus-criterios.md   ← registrado ANTES de abrir saidas_*.json
```

## Passo 1 — Scorer no conjunto base (12 casos, sinteticos)

```
$ python3 insumos/fixture/metricas.py comparar \
    --casos exemplo/casos_base.json \
    --A exemplo/saidas_A_base.json --B exemplo/saidas_B_base.json
scorer=metricas.py fatia=area casos=12
A=exemplo/saidas_A_base.json
B=exemplo/saidas_B_base.json
area             n A         B         delta
bug              5    3/5       5/5    +0.400
duvida           4    2/4       2/4    +0.000
melhoria         3    3/3       1/3    -0.667
GERAL           12    8/12      8/12   +0.000
VEREDITO: agregada +0.000 COM regressao de fatia: melhoria (-0.667, n=3)
FLAG_REGRESSAO_ESCONDIDA=1
```

## Passo 2 — Diagnostico numerico (o que o "8/12 = 8/12" escondia)

- Agregada: **0.000** — a alegacao "nada mudou" era verdadeira no
  agregado e falsa por fatia.
- `bug` +0.400 (3/5→5/5) "pagou" `melhoria` −0.667 (3/3→1/3):
  2 acertos ganhos em bug, 2 perdidos em melhoria — troca invisivel
  no total.
- Mecanica do prompt: o desempate "escolha `bug`" puxa issues vagas
  ("queria modo escuro", "adicionem integracao") para `bug`; o v1 as
  deixava em `melhoria`. O erro e sistematico, nao ruido.

## Passo 3 — Proposta de correcao (v2.1) registrada por escrito

Diff minimo proposto no prompt: remover o desempate "escolha `bug`" e
acrescentar regra especifica: "pedidos de funcionalidade nova ('queria',
'adicionem', 'seria otimo') → `melhoria`, mesmo que mencionem problemas
do app". Nao tocar na diretividade (o que nao causou o dano). Risco:
issues de bug redigidas como pedido ("podem corrigir o congelamento?")
podem cair em `melhoria` — monitorar pela fatia `bug`.

```
$ sha256sum proposta-v2.1.md   ← registrado ANTES de abrir o heldout
```

## Passo 4 — Heldout: casos NOVOS, mesma metrica congelada

```
$ python3 insumos/fixture/metricas.py comparar \
    --casos exemplo/heldout/casos_heldout.json \
    --A exemplo/heldout/saidas_A_heldout.json --B exemplo/heldout/saidas_B_heldout.json
area             n A         B         delta
bug              2    1/2       2/2    +0.500
duvida           2    2/2       1/2    -0.500
melhoria         2    2/2       0/2    -1.000
GERAL            6    5/6       3/6    -0.333
VEREDITO: nenhuma regressao de fatia oculta pela agregada
FLAG_REGRESSAO_ESCONDIDA=0
```

Em casos novos o v2 e **pior no agregado** e mata `melhoria` (0/2): o
diagnostico da base se reproduz — nao era artefato dos 12 casos.

Correcao de referencia (C) nos mesmos casos novos:

```
$ python3 insumos/fixture/metricas.py comparar \
    --casos exemplo/heldout/casos_heldout.json \
    --A exemplo/heldout/saidas_B_heldout.json --B exemplo/heldout/saidas_C_heldout.json
area             n A         B         delta
bug              2    2/2       2/2    +0.000
duvida           2    1/2       1/2    +0.000
melhoria         2    0/2       2/2    +1.000
GERAL            6    3/6       5/6    +0.333
VEREDITO: nenhuma regressao de fatia oculta pela agregada
FLAG_REGRESSAO_ESCONDIDA=0
```

C recupera `melhoria` (0/2→2/2) sem derrubar `bug` — em 6 casos
sinteticos. **Isso nao prova eficacia**: n pequeno, dados sinteticos,
quem "gerou" C sou o autor do pacote. A prova real exige executar o
prompt corrigido num pipeline com casos novos reais e verificacao
independente — exatamente o limite que sua tentativa deve declarar.

## Takeaway do exemplo

Numero agregado sem fatia e "verdadeiro e enganoso": media igual esconde
troca de acertos entre classes. Criterio congelado antes, fatia minima
declarada, heldout aberto depois da proposta, e desconfianca de
evidencia do proponente — nessa ordem.
