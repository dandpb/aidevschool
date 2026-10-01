# Guia docente — “Corrija a rotina sem começar do zero”

> **Uso exclusivo de quem corrige** (docente/monitor). Não distribuir junto com o worksheet:
> contém formas de resposta esperada. Parece com o `worksheet-visual.html` / `worksheet-texto.md`
> (AID-3649), que são o material do aprendiz.

## 1. Quando e como aplicar

- **Momento:** após a lição l32 (“Quando a automação erra”). Pode ser tarefa individual
  (~15 min) ou fechamento guiado de sessão (~20 min com correção em voz alta).
- **Meio:** papel (imprimir o worksheet — os campos viram linhas) ou digital (o HTML é um
  arquivo único, funciona offline; nada é salvo).
- **Regra de dados:** cenário sintético. Se o aprendiz quiser adaptar ao próprio trabalho,
  peça uma versão anonimizada/inventada — nunca dados reais de cliente, empresa ou pessoa.
- **O que NÃO é este exercício:** não roda automação, não promete eficácia, não marca
  progresso/mastery canônico. É artefato de projeto (AID-3649), fora do currículo.

## 2. Formas de resposta esperadas (rubrica por campo)

Os quadros usam os níveis: **A** = ainda não · **P** = parcial · **O** = alcançado.
“Alcançado” exige forma, não palavra exata.

### Campo 1 — Prompt reutilizável (fixo vs variável)

| Subcampo | O (alcançado) | P | A |
| --- | --- | --- | --- |
| 1a Tarefa | ação fixa nomeada: “resumir os pedidos da semana da loja” | ação genérica sem objeto (“fazer resumo”) | repete formato ou dado |
| 1b Formato | forma travada: “lista, 3 números, máx. 10 linhas, chat da operação” | cita só um traço (“lista”) | ausente ou vira campo variável |
| 1c Variável | “os números de pedidos da semana (colados)” | “os dados” sem dizer qual dado | aponta a tarefa/formato como variável |

Diagnóstico rápido: quem inverte fixo/variável na semana 2 vai “reparar” o que não quebrou —
devolva ao Campo 1 antes de seguir.

### Campo 2 — Reparo mínimo de contexto (o coração do exercício)

| Subcampo | O | P | A |
| --- | --- | --- | --- |
| 2a O que mudou | nomeia a renomeação + o split (“entregues” virou “no prazo” e “com atraso”) e as trocas nas devoluções | cita que “a plataforma mudou” sem dizer o quê | vago (“atualize”, “arrume”) ou mantém a coluna antiga |
| 2b O que continua valendo | reafirma o combinado: lista, 3 números, 10 linhas, chat | reafirma parte (“manter lista”) | ausente — correção “carta branca” |
| 2c Pedido de reparo | 1–2 frases que juntam 2a+2b; substitui a leitura antiga pela nova | junta mas reescreve o pedido inteiro | vago OU reescrita total |

### Campo 3 — Validação humana

- **O:** pergunta factual e verificável contra fonte externa à IA — ex.: “a soma de ‘no prazo’
  + ‘com atraso’ bate com o total de pedidos entregues do painel?”; “os devolvidos incluem as trocas?”
- **P:** pergunta de opinião (“está bom?”) ou que a própria resposta da IA resolveria (“está atualizado?”).
- **A:** ausente; ou delega a checagem à própria IA sem fonte externa.

### Teste semana 2

- **O:** confere primeiro o número afetado pela mudança nova (cancelados/urgente); reconhece
  que o reparo 1 ainda vale para split/trocas; novo reparo = 1 frase só para “cancelados” (e onde
  urgente aparece, se quiser destacá-lo).
- **A (padrão errado):** novo reparo que reescreve tudo de novo, ou que “desfaz” o reparo 1.

## 3. Protocolo de feedback direcionado + retry

Corrija **um padrão por vez** e devolva **só o campo apontado** (retry curto, mesma tentativa
contando como segunda chance — ecoando o ciclo tentativa→feedback→retry das lições):

| Padrão observado | Frase de feedback (adapte a voz) | Retry |
| --- | --- | --- |
| **Input velho mantido** (2a usa a coluna antiga) | “Sua frase lê a plataforma de duas semanas atrás. Qual coluna a plataforma renomeou ou criou nesta semana? Reescreva só a 2a.” | Campo 2a |
| **Pedido vago “atualize”** (2a/2c sem conteúdo) | “A IA não viu a plataforma nova — quem viu foi você. O que só você sabe sobre esta semana? Coloque isso na 2a e junte na 2c.” | Campo 2a → 2c |
| **Combinado perdido** (2b vazio; 2c muda formato/público) | “Seu reparo conserta o dado, mas desmonta o que funcionava. O que seguia valendo — formato, números, público? Reescreva a 2b.” | Campo 2b |
| **Reescrita total** (2c = pedido novo inteiro) | “O que exatamente quebrou: o pedido, ou o dado que ele lê? Se a tarefa e o formato seguem bons, o reparo cabe em 1–2 frases.” | Campo 1 vs 2, depois 2c |
| **Validação circular** (3 pergunta à própria IA) | “Uma pergunta que o erro silencioso não passaria precisa ter resposta fora da saída da IA. Qual número você conferiria em qual fonte?” | Campo 3 |

**Sequência sugerida:** (1) marque com ✓/△/✗ por campo; (2) escolha o **primeiro** padrão da
tabela que apareceu; (3) devolva com a frase + campo de retry; (4) aceite a segunda tentativa
como fechamento daquele campo — não iterar infinito.

## 4. Mapeamento para os critérios de aceite da issue

| Critério de aceite (AID-3649) | Onde se observa |
| --- | --- |
| identifica componente desatualizado | Campo 2a (+ diagnóstico do “sinal” na introdução do caso) |
| preserva estrutura estável | Campos 1a/1b e 2b |
| reparo mínimo justificável | Campo 2c (1–2 frases, causa nomeada) |
| testa nova semana sintética | Seção semana 2 (a/b/c) |
| formula verificação humana | Campo 3 |

Alinhamento conceitual com as fontes: o gesto é o da correção mínima da l19 aplicada à rotina
da l32 (o que mudou + a regra que segue valendo), sobre o pedido-padrão fixo/variável da l30/l18.

## 5. Erros comuns e o que significam

- **Reescrita total recorrente:** o aprendiz ainda não separa “pedido” de “dado lido”.
  Volte ao Campo 1 com a pergunta “o que você nunca mais quer digitar?”.
- **“Atualize” teimoso:** hipótese de modelo mental “a IA sabe o que eu quero”. Contraponha:
  a rotina responde ao que está no pedido — a plataforma nova existe só para você.
- **Validação de opinião:** ainda não distingue verificação externa de preferência.
  Peça fonte + número.
- **Achar que o problema é o formato** (o oposto do caso): lembre o sinal da l32 — aqui o
  formato veio IGUAL; o desatualizado era o dado.

## 6. Fronteiras para quem aplica

- Não prometer automação, ganho de tempo garantido ou persistência (“isso não salva nada”).
- Não usar dados reais nem contas; não publicar os assets externamente.
- Este guia e o worksheet não alteram currículo canônico, gates, IDs de lição, progresso ou
  mastery; dúvidas de conteúdo curricular → escalhar à posse de currículo antes de ampliar.

---

Proveniência: AID-3649 (PO; pedido Dani 2026-10-01 18:27 UTC). Fontes em leitura única:
l30 blob 595e3364 · l32 blob e6c78deb01f · l18 blob 67d388ee39e4 · l19 blob f3611e2a36e2 —
pin main 86fca77987408ff85d8050cb2d87ded48a7e49b0. Autoria: UX Designer de Aprendizagem
(agente 0bfa47c1), run 64d19f2e-30c8-4404-ab43-628c62c1c036, 2026-10-01.
