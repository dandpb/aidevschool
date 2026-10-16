# Guia de correcao — proposta de referencia v2.1 (diff exato do prompt)

> Consulte APENAS apos registrar a SUA proposta. Alternativas
> fundamentadas que cumpram a rubrica valem `met`.

## Diagnostico que fundamenta (numeros do scorer, conjunto base)

- Agregado: 17/24 → 18/24 (**+0.042**) — a alegacao da proponente era
  verdadeira no agregado.
- `pagamento`: 5/6 → 2/6 (**−0.500**) — 3 perdas: PD-011, PD-013, PD-014.
- `tecnico`: 6/8 → 8/8 (+0.250) — os 2 acertos novos em `tecnico` pagam
  a destruicao de `pagamento`; `conta`/`uso` +0.200 cada completam a
  ilusao.
- Mecanica: as linhas novas do v2 — "Em caso de duvida entre duas areas,
  escolha `tecnico`" + "Priorize a leitura do primeiro paragrafo" —
  capturam tickets de pagamento de dois modos. Os que MENCIONAM
  erro/sistema tem "duvida" aparente e o desempate empurra para
  `tecnico`: PD-011 ("Erro 500 ao tentar pagar a fatura") e PD-013
  ("Cartao declinado mas o plano continua ativo"). PD-014 ("Como
  atualizo o cartao de cobranca da empresa no painel?") nao menciona
  erro: a leitura parcial do 1o paragrafo o desvia para `conta`. O v1
  lia o ticket inteiro sem desempate enviesado. PD-012 ("fatura com
  valor errado") ja era erro do v1 (A=`tecnico`, B=`tecnico`): nao e
  perda do delta, contribui 0.

## Diff proposto (minimo, na causa)

```diff
 Voce e o triador de tickets do PrismaDesk. Classifique o ticket do
 usuario em exatamente UMA area: `tecnico`, `pagamento`, `conta` ou `uso`.
 ...definicoes iguais as do v1/v2...

-SEJA DIRETO: uma palavra, sem reler o ticket mais de uma vez.
-Em caso de duvida entre duas areas, escolha `tecnico`.
-Priorize a leitura do primeiro paragrafo do ticket.
+SEJA DIRETO: uma palavra.
+REGRA DE PRECEDENCIA: mencao a cobranca, fatura, reembolso, cartao ou
+assinatura/plano EM CONTEXTO DE PAGAMENTO define a area `pagamento`,
+MESMO SE o ticket citar erros, codigos ou travamentos do produto.
+Leia o ticket inteiro antes de responder.
```

## Por que esse diff

- Remove a causa (desempate enviesado + leitura parcial); nao "adiciona
  exemplos de resposta" nem reescreve o prompt inteiro.
- A regra de precedencia tem escape explicito ("EM CONTEXTO DE
  PAGAMENTO") para nao capturar bugs sobre faturas (ex.: PD-H01
  "exportar fatura gera arquivo corrompido" continua `tecnico`).
- Preserva o que melhorou: a diretividade curta (o ganho de `tecnico`
  veio de parar de divagar; o dano veio do desempate, nao da brevidade).

## O que NAO mudar

- As definicoes das 4 areas e o formato de resposta (uma palavra).

## Riscos declarados (monitorar pela fatia)

1. Over-routing para `pagamento` em bugs com palavras de dinheiro
   (mitigado pelo escape "contexto de pagamento"; heldout mostra
   PD-H01 mantido em `tecnico`).
2. Regra especifica demais pode nao cobrir sinonimos novos ("pix",
   "nota fiscal") — manter a fatia `pagamento` no monitoramento
   continuo e revisar a lista de gatilhos com casos reais.

## Verificacao (heldout, casos NOVOS, mesma metrica congelada)

- A vs B em heldout: agregado **igual** (8/12 = 8/12, delta 0.000) com
  `pagamento` 2/3 → **0/3** (−0.667) — o diagnostico se reproduz em
  dados novos e a agregada volta a esconder.
- B vs C em heldout: `pagamento` 0/3 → 3/3 (+1.000) sem nenhuma fatia
  cair; agregado 8/12 → 11/12.
- Limite explicito: C e a correcao de REFERENCIA sintetica do pacote;
  isso valida o desenho da regra em 12 casos sinteticos e NAO prova
  eficacia em uso real. A prova da SUA correcao exige executa-la num
  pipeline com casos novos reais e verificacao independente (nao o
  autor da mudanca).
