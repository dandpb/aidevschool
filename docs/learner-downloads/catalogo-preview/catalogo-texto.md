# Catálogo de práticas — versão em texto puro

> Equivalente em texto simples do `catalogo-visual.html` (mesmas práticas, mesmas informações).
> Para leitores de tela, baixa largura de banda, impressão preto-e-branco ou quem prefere texto seco.
> **Preview local** do AiDevSchool: nada é salvo, enviado ou instalado. Dados citados nas práticas são sintéticos/fictícios.

Catálogo de práticas — 4 práticas listadas · 0 disponíveis agora · 4 em preparação.

Legenda de status:
- Disponível agora (download real) — nenhuma nesta versão.
- Em preparação (ainda sem download) — as quatro desta lista.

Nesta versão de preview, todas as práticas estão em preparação: ainda não há download — e nenhum link falso aparece no lugar.

---

## U09 — Pacote de contexto + PRD e SPEC de uma tarefa pequena

- Trilha: IA para Dev · prática guiada.
- Resultado que você pratica: você transforma um pedido (fictício, mas realista) — o e-mail sobre o
  planejador rodadia — em três documentos que deixam a tarefa inequívoca: um CONTEXTO com o menor
  conjunto de arquivos e regras (cada linha com justificativa), um PRD com uma tarefa de até
  30 minutos e o fora de escopo nomeado, e um SPEC que fecha as decisões de borda antes do build.
- Duração: 25–40 min (uma sessão).
- Requisitos: Unidade U03 — "pedido de 5 campos" (pg-d02) ou equivalente.
- Formato: prática guiada offline: exemplo → tentativa → feedback → tente novamente → takeaway.
  Sem rede, sem conta, sem chave.
- Primeiros passos:
  1. Ler o exemplo trabalhado (~8 min): o CONTEXTO/PRD/SPEC real do workflow-exemplo, com saídas
     executadas.
  2. Dissecar o pedido do e-mail: contar as entregas embutidas (são cinco) e as decisões que
     ficaram implícitas.
  3. Escrever CONTEXTO (tabelas incluído/excluído, cada linha com o porquê), PRD e SPEC — nessa ordem.
- Disponibilidade: **em preparação** — ainda sem download. Quando o pacote desta prática for aceito,
  o botão ganha o download real; neste preview, ele não faz nada — de propósito.

## U10 — Delegação controlada — você é o controlador

- Trilha: IA para Dev · prática guiada.
- Resultado que você pratica: você executa o ciclo de delegação controlada de um agente produtor:
  rejeita a primeira rodada com evidência mecânica (diff fora do escopo do plano), decompõe a
  alegação dele re-executando tudo, escreve veredito citando as cláusulas violadas e só aceita a
  segunda rodada com escopo, suíte e aceite congelados conferidos. Regra da casa: produtor ≠
  verificador — a verificação começa do contrato e dos artefatos, nunca da narrativa de quem produziu.
- Duração: 25–40 min (uma sessão).
- Requisitos: Unidade U07 — refatoração com rede de segurança (pg-d03) ou equivalente. Não exige U09.
- Formato: prática guiada offline: exemplo → tentativa → feedback → tente novamente → takeaway.
  Sem rede, sem conta, sem chave.
- Primeiros passos:
  1. Ler o exemplo (~8 min): proposta com suíte 5/5 verde que ainda devolvia bug — revisão com prova
     executável.
  2. Contrato primeiro, diff depois: ler o plano aprovado e o CONTRATO antes de abrir o diff do
     produtor.
  3. Re-executar tudo, escrever o veredito com as cláusulas e o retrabalho; aceitar a r2 só com as
     provas.
- Disponibilidade: **em preparação** — ainda sem download. Quando o pacote desta prática for aceito,
  o botão ganha o download real; neste preview, ele não faz nada — de propósito.

## U13 — Evals offline de saídas de modelo

- Trilha: IA para Dev · prática guiada.
- Resultado que você pratica: diante da proposta de troca do prompt v1→v2 de um helpdesk, você
  congela os critérios ANTES de ver as saídas, roda o scoring determinístico A vs B por fatia,
  diagnostica a melhora agregada que esconde uma fatia que piorou, propõe a correção do prompt e
  testa em casos NOVOS (held-out). No fim, você diz com números e fonte: o que mudou, qual fatia
  regrediu, o que o held-out confirma — e o que ainda não está provado.
- Duração: 25–40 min (uma sessão).
- Requisitos: Unidade U05 — critérios objetivos: aceitar/recusar com motivo. A pg-d01 ajuda, mas
  não é obrigatória.
- Formato: prática guiada offline, em etapas (offline → sintético → held-out). Dados 100% sintéticos.
  Sem rede, sem API, sem credencial.
- Primeiros passos:
  1. Ler o exemplo TrilhaFit (~8 min): critérios primeiro, saídas depois.
  2. Congelar seus critérios de aceite/recusa antes de ver qualquer saída.
  3. Rodar o scorer A vs B, diagnosticar a fatia que piorou e testar a correção nos casos novos.
- Disponibilidade: **em preparação** — ainda sem download. Quando o pacote desta prática for aceito,
  o botão ganha o download real; neste preview, ele não faz nada — de propósito.

## Pós-l32 — Corrija a rotina sem começar do zero (folha de exercício)

- Trilha: IA no cotidiano · folha de exercício.
- Resultado que você pratica: uma rotina de IA começou a errar por fora: o sistema mudou os status,
  e o resumo continuou lendo como antes. Você escreve o reparo mínimo reutilizável: conferir na
  fonte, por categoria (fonte → soma por categoria → total), manter o que é fixo no pedido e trocar
  só o que é variável — e testar com os números novos da semana 2. É uma folha de exercício, não um
  jogo publicado.
- Duração: ~20 min.
- Requisitos: lições l30 e l32 da trilha IA Prática ("Quando a automação erra"), progressão natural
  l30 → l32 → autorar o reparo.
- Formato: folha de exercício para imprimir ou usar no papel/digital, com exemplo resolvido separado
  do seu caso. Dados inventados, só para treinar: nada é salvo, enviado ou automatizado.
- Primeiros passos:
  1. Acompanhar o exemplo resolvido da Mariana (atendimento), com o cálculo trabalhado.
  2. No seu caso (pedidos de uma loja): conferir na fonte e escrever o reparo do pedido.
  3. Testar com os números novos da semana 2 e autoconferir com nova tentativa.
- Disponibilidade: **em preparação** — ainda sem download. Quando a folha imprimível for aceita, o
  botão ganha o download real; neste preview, ele não faz nada — de propósito.

---

Notas técnicas para docentes/produção: ver `README.md` (acompanha este preview).
