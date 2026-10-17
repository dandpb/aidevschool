# Catálogo de práticas — versão em texto puro

> Equivalente em texto simples do `catalogo-visual.html` (mesmas práticas, mesmas informações).
> Para leitores de tela, baixa largura de banda, impressão preto-e-branco ou quem prefere texto seco.
> **Preview local** do AiDevSchool: nada é salvo, enviado ou instalado. Dados citados nas práticas são sintéticos/fictícios.

Catálogo de práticas — 8 práticas listadas · 8 disponíveis agora · 0 em preparação.

Legenda de status:
- Disponível agora (link real) — as oito desta lista.
- Em preparação (ainda sem download) — nenhuma nesta versão.

Todos os links são relativos ao repositório (funcionam abrindo os arquivos localmente).
Os kits offline são ZIPs que você extrai numa pasta limpa; os pacotes de currículo abrem
pelo enunciado, com gabarito separado do caminho do aprendiz.

---

## PG-C01 — Dados mínimos e verificação — o aviso da festa

- Trilha: IA no cotidiano · prática guiada (simulada).
- Resultado que você pratica: diante do recado da anfitriã e do grupo de família bagunçado, você
  prepara um pedido de ajuda para IA com o mínimo de informação (sem expor pessoas e sem o que
  não é preciso), verifica a resposta da IA afirmação por afirmação — apoiada, contrariada ou
  "fontes não dizem", sempre citando fonte e linha — recusa o pedido de dado sensível e escreve
  o aviso afirmando somente o que as fontes sustentam, com a incerteza dita com todas as letras.
  A prática é simulada: a resposta "da IA" já vem no pacote e nada é enviado a ninguém.
- Duração: uma sessão, no seu ritmo (o pacote não fixa tempo).
- Requisitos: lições l09–l12, l20 e l25 da trilha IA no cotidiano (ou equivalentes).
- Formato: prática guiada simulada, no papel, com insumos sintéticos rotulados:
  preparar → verificar → responder, com exemplo trabalhado, rúbrica e tentativa novamente.
- Primeiros passos:
  1. Ler o exemplo trabalhado (um mini-caso diferente, só de estudo).
  2. Preparar o pedido: montar o mínimo de informação que a tarefa precisa.
  3. Classificar cada afirmação da resposta, recusar o dado sensível e escrever o aviso;
     autoconferir com a rúbrica.
- Disponibilidade: **disponível agora** — pacote completo em
  `curriculum/praticas-guiadas-cotidiano/pg-c01-dados-minimos-e-verificacao/`
  (abra `enunciado.md`). O gabarito fica separado, fora do caminho do aprendiz.

## U06 — Debug com assistente: reproduza antes de perguntar

- Trilha: IA para Dev · prática guiada.
- Resultado que você pratica: diante de um bug report, você executa o ciclo completo —
  reprodução manual, teste de regressão vermelho, correção mínima na causa raiz, suíte verde
  e revisão do diff — usando um assistente de IA em cada passo sem terceirizar a prova: quem
  roda os comandos e lê as saídas é você. A entrega é o pedido de diagnóstico com o erro
  reproduzido, o caso mínimo e o esperado-vs-observado.
- Duração: 25–40 min (uma sessão).
- Requisitos: lições l16 (primeiro código com assistente) e l21 (peça testes que valem a pena),
  ou experiência equivalente.
- Formato: prática guiada offline com fixture local determinística: exemplo → tentativa →
  feedback (rúbrica) → tente novamente → takeaway. Sem rede, sem conta, sem chave.
- Primeiros passos:
  1. Ler o exemplo trabalhado (~8 min): caso real do repositório, com saídas reais citadas.
  2. Reproduzir o bug manualmente e confirmar que a suíte atual fica verde com o bug presente.
  3. Escrever o pedido de diagnóstico e o teste de regressão (vermelho pelo motivo certo);
     aplicar a correção mínima e revisar o diff.
- Disponibilidade: **disponível agora** — pacote completo em
  `curriculum/sequencia-dev-guiada/pg-d01-debug-reproduza/` (abra `enunciado.md`).

## U03 — O pedido estruturado de 5 campos

- Trilha: IA para Dev · prática guiada.
- Resultado que você pratica: dado um pedido real (fictício, mas realista) vago demais, você o
  reescreve nos cinco campos — CONTEXTO, OBJETIVO, RESTRIÇÕES, ACEITE e NÃO-META — com o ACEITE
  verificável por um comando executável local (offline) e a NÃO-META excluindo explicitamente um
  escopo vizinho que estava embutido no pedido original. O teste: um revisor consegue decidir os
  casos de borda sem perguntar a você.
- Duração: 25–40 min (uma sessão).
- Requisitos: lição l16 (pedido de código com contexto) ou equivalente.
- Formato: prática guiada offline com caso-modelo e exemplo executável: exemplo → tentativa →
  feedback (rúbrica) → tente novamente → takeaway. Sem rede, sem conta, sem chave.
- Primeiros passos:
  1. Ler o pedido original e o exemplo trabalhado do caso-modelo.
  2. Reescrever o pedido nos cinco campos, na ordem.
  3. Conferir: o ACEITE roda offline e as bordas ficam decidíveis sem você.
- Disponibilidade: **disponível agora** — pacote completo em
  `curriculum/sequencia-dev-guiada/pg-d02-pedido-estruturado/` (abra `enunciado.md`).

## U07 — Refatoração com rede de segurança (comportamento é o contrato)

- Trilha: IA para Dev · prática guiada.
- Resultado que você pratica: dado um pedido de refatoração com a proposta anexa do assistente,
  você monta a rede antes de tocar no código: registra o baseline da suíte e escreve teste(s) de
  caracterização para o que a suíte não cobre. Aí julga a proposta com evidência — ela precisa
  passar na suíte existente E violar o contrato no seu teste, exibindo o contraexemplo observado —
  e só então refatora em passos, com a suíte verde entre eles.
- Duração: 25–40 min (uma sessão).
- Requisitos: lição l21 (pedir testes) e a prática pg-d01 (reproduzir antes de diagnosticar),
  ou equivalentes.
- Formato: prática guiada offline com fixture Python determinística: exemplo → tentativa →
  feedback (rúbrica) → tente novamente → takeaway. Sem rede, sem conta, sem chave.
- Primeiros passos:
  1. Rodar o baseline da suíte e escrever o teste de caracterização (verde sobre o código original).
  2. Aplicar (ou ler com precisão de diff) a proposta do assistente.
  3. Mostrar as duas provas — suíte existente verde e contraexemplo do contrato — e refatorar
     com a rede.
- Disponibilidade: **disponível agora** — pacote completo em
  `curriculum/sequencia-dev-guiada/pg-d03-refatorar-com-rede/` (abra `enunciado.md`).

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
- Disponibilidade: **disponível agora** — kit offline em
  `docs/learner-downloads/pg-d04-contexto-e-spec/`
  (`zips/pg-d04-contexto-e-spec.zip`; extraia numa pasta limpa). O mesmo conteúdo também existe
  como pacote em `curriculum/sequencia-dev-guiada/pg-d04-contexto-e-spec/`.

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
- Disponibilidade: **disponível agora** — kit offline em 2 etapas cumulativas em
  `docs/learner-downloads/pg-d05-delegacao-controlada/`
  (etapa 1 prática: `zips/pg-d05-etapa-1-pratica.zip`; etapa 2 docente, depois da tentativa:
  `zips/pg-d05-etapa-2-docente.zip`). O mesmo conteúdo também existe como pacote em
  `curriculum/sequencia-dev-guiada/pg-d05-delegacao-controlada/`.

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
- Disponibilidade: **disponível agora** — kit offline em 5 etapas cumulativas em
  `docs/learner-downloads/pg-e01-evals-offline/`
  (etapa 1 início: `zips/pg-e01-etapa-1-inicio.zip`; depois base, held-out, referência mínima e
  docente). O método é protegido pelas etapas: critérios antes dos resultados, held-out no fim.
  O mesmo conteúdo também existe como pacote em
  `curriculum/praticas-evals-offline/pg-e01-evals-offline/`.

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
- Disponibilidade: **disponível agora** — folha pronta em
  `docs/worksheets/reparo-de-rotina/` (abra `worksheet-visual.html`; há versão em texto puro
  `worksheet-texto.md` e `guia-docente.md`).

---

Notas técnicas para docentes/produção: ver `README.md` (acompanha este preview).
