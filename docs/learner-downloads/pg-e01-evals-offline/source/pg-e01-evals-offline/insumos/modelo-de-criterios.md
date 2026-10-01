# Modelo de criterios de avaliacao — preencher ANTES de abrir qualquer `saidas_*.json`

Preencha este modelo e salve como `meus-criterios.md` (fora do pacote ou
num rascunho seu). Registre o hash do arquivo ANTES da primeira execucao
do scorer — e o mesmo hash no fim da pratica. Criterio que muda depois
de ver a resposta nao e criterio: e racionalizacao (ver rubrica,
`c-criterios-antes`).

## 1. Tarefa e rotulo dourado

- O que esta sendo avaliado (unidade de analise):
- Fonte do rotulo dourado (quem define o "correto" e onde esta):

## 2. Metrica(s) — defina ANTES

- Metrica principal (ex.: acuracia = corretos/total):
- Decomposicao obrigatoria (ex.: por fatia `<campo>` = ...):
- Como sera calculada (ferramenta/comando exato):

## 3. Fatias minimas a reportar — defina ANTES

| Fatia | Por que importa para o produto |
| --- | --- |
| | |
| | |

## 4. Regra de decisao — defina ANTES

- A variante B sobe se: (condicao no agregado)
- ...E nao sobe se: (condicao em fatia — ex.: qualquer fatia com n >= ? piorar mais que ?)
- Empate/delta pequeno e tratado como: (sobe / nao sobe / pede mais dados)

## 5. Particoes — compromisso anti-vazamento

- Conjunto de desenvolvimento (analise/diagnostico):
- Heldout (ABRIR SOMENTE APOS a proposta de correcao registrada):
- Prometo nao usar casos do heldout para ajustar criterios, diagnostico
  ou proposta: [ ] sim

## 6. Evidencia independente

- Alegacoes de quem propoe a mudanca valem como: (entrada / verificacao)
- Quem executa o scorer para o veredito:

## Hash de congelamento

```
$ sha256sum meus-criterios.md
```

(cole a saida aqui, com data/hora, ANTES do primeiro `python3 metricas.py`)
