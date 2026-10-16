# Guia de correcao — criterios de referencia (gabarito do `modelo-de-criterios.md`)

> Consulte APENAS apos sua tentativa. Resposta fundamentada diferente que
> cumpra os mesmos requisitos vale `met` (criterio positivo da issue).

## 1. Tarefa e rotulo dourado

- Unidade de analise: cada ticket (id) classificado em 1 area.
- Rotulo dourado: campo `area` em `casos_*.json` (sintetico, autoridade
  do pacote — no mundo real: definicao operacional acordada ANTES).

## 2. Metricas

- Principal: acuracia = corretos/total por variante.
- Decomposicao obrigatoria: por fatia `area` (4 fatias = as proprias
  classes; produto real exigiria fatias adicionais: idioma, plano, canal).
- Calculo: `python3 metricas.py comparar --casos ... --A ... --B ...`
  (scorer deterministico; nenhuma nota de LLM/juiz).

## 3. Fatias minimas a reportar

| Fatia | Por que importa |
| --- | --- |
| pagamento | dinheiro do cliente; erro = reembolso/churn/financeiro |
| tecnico | volume; SLA de bug |
| conta | seguranca/privacidade (LGPD, remocao de acesso) |
| uso | autoatendimento; erro = custo de suporte |

## 4. Regra de decisao (congelada ANTES)

- B sobe se: delta agregado > 0 **E** nenhuma fatia com n >= 3 piorar.
- B nao sobe se: qualquer fatia com n >= 3 piorar (mesmo com agregado
  melhor) → exige correcao e re-teste em heldout.
- Delta agregado <= 0: nao sobe (delta 0 nao e "inocuo": pode esconder
  troca de fatias — ver exemplo trabalhado).

## 5. Particoes

- Desenvolvimento: `casos_base.json` (24; ids PD-*).
- Heldout: `heldout/casos_heldout.json` (12; ids PD-H*), disjunto por
  construcao (check deterministico `test_heldout_disjunto_base`).
- Compromisso assinado antes: heldout nao guia criterio/diagnostico/
  proposta.

## 6. Evidencia independente

- Alegacao da proponente (18/24 vs 17/24): **entrada** para analise.
- Veredito: so o scorer executado por quem decide, sob criterios
  congelados; a variante C do pacote e referencia sintetica, nao prova
  da correcao do aprendiz.

## Hash de congelamento

Registrado no log do aluno antes da primeira execucao do scorer; o mesmo
hash deve constar ao fim (check `c-criterios-antes`).
