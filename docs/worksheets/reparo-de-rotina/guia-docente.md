# Guia docente — “Corrija a rotina sem começar do zero”

> **Uso exclusivo de quem corrige** (docente/monitor). Não distribuir junto com a folha de
> exercício: contém formas de resposta esperada e os números de referência. Acompanha o
> `worksheet-visual.html` / `worksheet-texto.md` (AID-3649).

## 1. Quando e como aplicar

- **Momento:** após a lição l32 (“Quando a automação erra”). Tarefa individual (~20 min) ou
  fechamento guiado de sessão (~25 min com correção em voz alta).
- **Meio:** papel (imprimir a folha — os campos viram linhas) ou digital (o HTML é um arquivo
  único, funciona offline; nada é salvo).
- **Regra de dados:** cenário 100% sintético. Se o aprendiz quiser adaptar ao próprio trabalho,
  peça uma versão anonimizada/inventada — nunca dados reais de cliente, empresa ou pessoa.
- **O que NÃO é este exercício:** não roda automação, não promete eficácia, não marca progresso
  ou dominância. É artefato de projeto (AID-3649), fora do currículo canônico.

## 2. Números de referência (sintéticos) — base de correção objetiva

### Exemplo resolvido (Mariana, atendimento)

Fonte (total 6): abertos t-01,t-02 · fechados t-03,t-04,t-06 · reaberto t-05.
Saída degradada: “abertos 2 · resolvidos 4 · tempo médio 3h”.
**Erro:** total fecha (2+4=6), mas a divisão não — reaberto (t-05) contado como resolvido.
**Números verdadeiros:** abertos **2** · fechados **3** · reabertos **1** · conferência 2+3+1=**6**=total ✓.
**Saída revisada de referência:** “abertos: 2 · fechados: 3 · reabertos: 1 · tempo médio: 3h —
4 indicadores (formato renegociado de 3 para 4, declarado no reparo).”

### Caso do aprendiz (loja/pedidos)

**Semana 1** — fonte (total 6): no prazo p-101,p-102 · com atraso p-103,p-104 · devolvido p-105 · troca p-106.
Saída degradada: “feitos 6 · entregues 5 · devolvidos 1”.
**Erro:** total fecha (5+1=6), mas a divisão não — troca (p-106) contada como entrega;
“devolvidos” só reconheceu a devolução literal.
**Números verdadeiros (Campo 2):** feitos **6** · entregues **4** (2+2) · devolvidos **2** (1+1) ·
conferência 4+2=**6**=total ✓.
**Saída revisada de referência:** “pedidos feitos: 6 · pedidos entregues: 4 (2 no prazo + 2 com
atraso) · pedidos devolvidos: 2 (1 devolução + 1 troca)” — com a decisão de agregação declarada
(se o aprendiz escolheu linha separada para troca, a referência dele é “devolvidos: 1 · trocas: 1”,
igualmente correta SE declarada e disjunta).

**Semana 2** — fonte (total 6): no prazo p-201,p-202 · com atraso p-203 · devolvido p-204 ·
troca p-205 · cancelado p-206 (urgente: p-201, p-206).
**Números verdadeiros (letra a):** feitos **6** · entregues **3** (2+1) · devolvidos **2** (1+1) ·
cancelados **1** · conferência 3+2+1=**6**=total ✓ · urgentes **2** (marca, contagem à parte,
fora da soma de conferência).
**Decisão de acomodação (letra c) — referência:** *renegociar o formato* (linha nova
“cancelados”), justificável por disjunção: cancelado não é entrega nem devolução; somá-lo a um
número existente esconde informação. *Agregar* só é aceitável com justificativa explícita de
por que a informação perde-se; *substituir* não se sustenta (nenhum número existente cobre o caso).
**Reparo mínimo de referência (letra d):** “Entrei o status ‘cancelado’: conte em linha própria,
fora de entregues e devolvidos; o resto segue como combinado.”
**Saída revisada de referência:** “feitos: 6 · entregues: 3 (2 no prazo + 1 com atraso) ·
devolvidos: 2 (1 devolução + 1 troca) · cancelados: 1 — urgentes: 2 (p-201, p-206), à parte.”

## 3. Formas de resposta esperadas (rubrica por campo)

Níveis: **A** = ainda não · **P** = parcial · **O** = alcançado. “Alcançado” exige forma, não palavra exata.

### Campo 1 — Pedido reutilizável (fixo vs variável)

| Subcampo | O | P | A |
| --- | --- | --- | --- |
| 1a Tarefa | ação fixa nomeada: “resumir os pedidos da semana da loja” | ação genérica sem objeto (“fazer resumo”) | repete formato ou dado |
| 1b Formato | forma travada: “lista, 3 números, máx. 10 linhas, chat da operação” | cita só um traço (“lista”) | ausente ou vira campo variável |
| 1c Variável | “os números de pedidos da semana (colados)” | “os dados” sem dizer qual dado | aponta a tarefa/formato como variável |

### Campo 2 — Conferência na fonte (semana 1)

| Subcampo | O | P | A |
| --- | --- | --- | --- |
| Números | 6 / 4 / 2 e conferência 6 | um número errado por conta parcial | copiou os números da saída de sexta (5/1) ou “achou” sem contar |
| Diagnóstico (2d) | nomeia a categoria errada E o motivo (troca contada como entrega) | diz “está errado” sem dizer onde | aceita a saída porque o total fecha |

### Campo 3 — Reparo mínimo de contexto (o coração do exercício)

| Subcampo | O | P | A |
| --- | --- | --- | --- |
| 3a O que mudou | nomeia o split de “entregues” (prazo/atraso) e as trocas nas devoluções | “a plataforma mudou” sem dizer o quê | vago (“atualize”) ou mantém a leitura antiga |
| 3b Acomodação do número novo | decisão declarada e disjunta (agregar trocas em devolvidos OU linha separada), consistente com 3d | decisão existe mas contradiz o pedido de reparo | implícito — número novo sem casa |
| 3c O que continua valendo | reafirma o combinado: lista, números, 10 linhas, chat | reafirma parte | ausente — correção “carta branca” |
| 3d Pedido de reparo | 1–2 frases que juntam 3a+3b+3c e substituem a leitura antiga pela nova | junta mas reescreve o pedido inteiro | vago OU reescrita total |

### Campo 4 — Validação humana

- **O:** pergunta factual verificável contra a fonte, por categoria — ex.: “entregues + devolvidos
  somam o total da fonte? a troca aparece em devolvidos, não em entregues?”
- **P:** pergunta de opinião (“está bom?”) ou respondível pela própria saída (“está atualizado?”).
- **A:** ausente; ou delega a checagem à própria IA sem fonte externa.

### Semana 2

| Subcampo | O | P | A |
| --- | --- | --- | --- |
| a) Números | 6 / 3 / 2 / 1 · conferência 6 · urgentes 2 | erros parciais de contagem | não conta na fonte; mistura “urgente” na soma |
| b) O que ainda vale | reconhece que o reparo 1 (split + trocas) continua valendo | vale parcialmente citado | desfaz o reparo 1 |
| c) Acomodação | renegociar (linha nova) justificado por disjunção; ou agregar com justificativa explícita | marca sem justificar | substituir sem base / deixa implícito |
| d) Reparo mínimo | 1 frase só para “cancelado”, preservando o resto | repete o reparo 1 inteiro / reescreve tudo | vago ou desfaz combinado |

## 4. Protocolo de feedback direcionado + nova tentativa

Corrija **um padrão por vez** e devolva **só o campo apontado** (nova tentativa curta — ecoando o
ciclo tentativa→feedback→retry das lições):

| Padrão observado | Frase de feedback (adapte a voz) | Volte a |
| --- | --- | --- |
| **Conferiu só o total** (que fecha mesmo com erro) | “2+4 também dá 6 — o total fecha até quando a divisão está errada. Onde o t-05/p-106 foram parar? Conte por categoria na fonte.” | Campo 2 |
| **Copiou os números da saída de sexta** | “O resumo de sexta é exatamente o que está sob suspeita. Conte você, linha a linha, na fonte.” | Campo 2 |
| **Input velho mantido** (3a usa a coluna antiga) | “Sua frase lê a plataforma de duas semanas atrás. Qual coluna a plataforma renomeou ou criou? Reescreva só a 3a.” | Campo 3a |
| **Pedido vago “atualize”** | “A IA não viu a plataforma nova — quem viu foi você. O que só você sabe sobre esta semana? Coloque na 3a e junte na 3d.” | Campo 3a → 3d |
| **Número novo sem casa** (3b implícito) | “Se a troca/cancelado não aparece em lugar nenhum do seu reparo, o número novo ficou sem casa. Decidir é seu: somar junto, linha nova — mas declare.” | Campo 3b |
| **Combinado perdido** (3c vazio; 3d muda formato/público) | “Seu reparo conserta o dado, mas desmonta o que funcionava. O que seguia valendo? Reescreva a 3c.” | Campo 3c |
| **Reescrita total** (3d = pedido novo inteiro) | “O que exatamente quebrou: o pedido, ou o dado que ele lê? Se tarefa e formato seguem bons, o reparo cabe em 1–2 frases.” | Campo 1 vs 3 |
| **Validação circular** (pergunta à própria IA) | “Pergunta que erro silencioso não passa tem resposta fora da saída. Qual número você conferiria em qual fonte?” | Campo 4 |

**Sequência sugerida:** (1) marque ✓/△/✗ por campo contra os números de referência (§2);
(2) escolha o **primeiro** padrão da tabela que apareceu; (3) devolva com a frase + campo;
(4) aceite a segunda tentativa como fechamento daquele campo — não iterar infinito.

## 5. Mapeamento para os critérios de aceite

| Critério de aceite (AID-3649) | Onde se observa |
| --- | --- |
| identifica componente desatualizado | Campo 2 (números + diagnóstico 2d) e Campo 3a |
| preserva estrutura estável | Campos 1a/1b e 3c |
| reparo mínimo justificável | Campo 3d (1–2 frases, causa nomeada, acomodação declarada em 3b) |
| testa nova semana sintética | Semana 2 a/b/c/d (com valores conferidos na fonte) |
| formula verificação humana | Campo 4 |

Alinhamento conceitual com as fontes: o gesto é o da correção mínima da l19 aplicada à rotina da
l32 (o que mudou + a regra que segue valendo), sobre o pedido salvo fixo/variável da l30/l18.
A conferência “fonte → soma por categoria → total” explicita a disjunção que o PO exigiu
(cada item em uma única categoria; total fechar não garante divisão certa).

## 6. Erros comuns e o que significam

- **Confiar no total:** já caiu no padrão “soma fecha, então está certo”. Mostre o contraexemplo
  do próprio material (2+4=6 errado). É o aprendizado mais importante do Campo 2.
- **Reescrita total recorrente:** ainda não separa “pedido” de “dado lido”. Volte ao Campo 1 com
  “o que você nunca mais quer digitar?”.
- **“Atualize” teimoso:** modelo mental “a IA sabe o que eu quero”. Contraponha: a rotina responde
  ao que está no pedido — a plataforma nova existe só para você.
- **Acomodação implícita:** quer “acertar os números” sem decidir onde o novo entra. Force a
  decisão: substituir / agregar / renegociar — e a justificativa.
- **Achar que o problema é o formato:** lembre o sinal da l32 — aqui o formato veio IGUAL; o
  desatualizado era o dado.

## 7. Fronteiras para quem aplica

- Não prometer automação, ganho de tempo garantido ou persistência (“isso não salva nada”).
- Não usar dados reais nem contas; não publicar os assets externamente.
- Esta folha e este guia não alteram currículo canônico, gates, IDs de lição, progresso ou
  dominância; dúvidas de conteúdo curricular → escalar à posse de currículo antes de ampliar.

---

Proveniência: AID-3649 (PO; pedido Dani 2026-10-01 18:27 UTC; HOLD + brief de correção CD
2026-10-01). Fontes em leitura única: l30 blob 595e3364 · l32 blob e6c78deb01f · l18 blob
67d388ee39e4 · l19 blob f3611e2a36e2 — pin main 86fca77987408ff85d8050cb2d87ded48a7e49b0.
Autoria da correção: UX Designer de Aprendizagem (agente 0bfa47c1), 2026-10-01.
